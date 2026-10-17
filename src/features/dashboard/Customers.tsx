import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, Search } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useBookingsAll, useCustomers, useNow } from '@/data/hooks';
import { effectiveStatus } from '@/domain/bookingMachine';
import { downloadFile, toCsv } from '@/domain/misc';
import type { Booking, Customer } from '@/domain/types';
import { civilDateOf, fmtDate } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { fmtMobile, matchesSearch } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Avatar, Button, EmptyState, Input, Segmented, Skeleton } from '@/ui/primitives';

export interface CustomerStats {
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
  last?: string;
  next?: string;
  spent: number;
}

export function statsFor(bookings: Booking[], now: number): CustomerStats {
  const s: CustomerStats = { total: 0, completed: 0, noShows: 0, cancelled: 0, spent: 0 };
  for (const b of bookings) {
    const st = effectiveStatus(b, now);
    s.total += 1;
    if (st === 'completed') {
      s.completed += 1;
      s.spent += b.priceToman;
      if (!s.last || b.start > s.last) s.last = b.start;
    }
    if (st === 'no_show') s.noShows += 1;
    if (st === 'cancelled') s.cancelled += 1;
    if ((st === 'confirmed' || st === 'pending') && Date.parse(b.start) > now && (!s.next || b.start < s.next)) s.next = b.start;
  }
  return s;
}

type Sort = 'recent' | 'visits' | 'name';

export default function Customers() {
  const { ctx, tenant, base, features } = useDash();
  const q = useCustomers(ctx);
  const bookings = useBookingsAll(ctx).data ?? [];
  const now = useNow();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');

  const rows = useMemo(() => {
    const byCustomer = new Map<string, Booking[]>();
    for (const b of bookings) byCustomer.set(b.customerId, [...(byCustomer.get(b.customerId) ?? []), b]);
    const list = (q.data ?? [])
      .filter((c) => matchesSearch(`${c.name} ${c.mobile}`, query))
      .map((c) => ({ c, s: statsFor(byCustomer.get(c.id) ?? [], now) }));
    return list.sort((a, b) =>
      sort === 'name' ? a.c.name.localeCompare(b.c.name, 'fa') : sort === 'visits' ? b.s.completed - a.s.completed : (b.s.last ?? b.c.createdAt).localeCompare(a.s.last ?? a.c.createdAt),
    );
  }, [q.data, bookings, query, sort, now]);

  const exportCsv = () => {
    const csv = toCsv([
      ['نام', 'موبایل', 'مراجعه موفق', 'غیبت', 'لغو', 'آخرین مراجعه', 'یادداشت'],
      ...rows.map(({ c, s }) => [c.name, c.mobile, s.completed, s.noShows, s.cancelled, s.last ? fmtDate(civilDateOf(Date.parse(s.last), tenant.timezone), true) : '', c.notes]),
    ]);
    downloadFile(`customers-${tenant.slug}.csv`, csv, 'text/csv;charset=utf-8');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="مشتریان"
        subtitle={`${toFa(q.data?.length ?? 0)} مشتری`}
        actions={
          features.exportData && (
            <Button size="sm" icon={<Download size={16} />} onClick={exportCsv}>
              خروجی اکسل
            </Button>
          )
        }
      />
      <Page>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجوی نام یا موبایل" className="ps-11" />
          </div>
          <Segmented
            value={sort}
            onChange={setSort}
            options={[
              { value: 'recent', label: 'اخیر' },
              { value: 'visits', label: 'وفادار' },
              { value: 'name', label: 'الفبا' },
            ]}
          />
        </div>

        {q.isLoading ? (
          <Skeleton className="mt-5 h-72" />
        ) : rows.length === 0 ? (
          <EmptyState title="مشتری‌ای پیدا نشد" text="مشتریان با اولین نوبت به‌صورت خودکار اضافه می‌شوند." />
        ) : (
          <div className="mt-5 divide-y divide-line border-y border-line">
            {rows.map(({ c, s }) => (
              <CustomerRow key={c.id} c={c} s={s} to={`${base}/customers/${c.id}`} tz={tenant.timezone} />
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}

function CustomerRow({ c, s, to, tz }: { c: Customer; s: CustomerStats; to: string; tz: string }) {
  return (
    <Link to={to} className="press flex items-center gap-3 py-3 hover:bg-surface-2/60 sm:px-2">
      <Avatar name={c.name} color="var(--ink)" size={42} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{c.name}</span>
          {c.tags.includes('VIP') && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-ink">VIP</span>}
          {c.blocked && <span className="rounded-full bg-danger/15 px-1.5 text-[10px] font-bold text-danger">مسدود</span>}
        </div>
        <div className="text-[13px] text-muted tabular">{fmtMobile(c.mobile)}</div>
      </div>
      <div className="text-end text-[12px]">
        <div className="font-bold">
          {toFa(s.completed)} <span className="font-normal text-muted">مراجعه</span>
        </div>
        <div className={cn(s.noShows ? 'text-danger' : 'text-muted')}>
          {s.noShows ? `${toFa(s.noShows)} غیبت` : s.last ? fmtDate(civilDateOf(Date.parse(s.last), tz)) : 'بدون سابقه'}
        </div>
      </div>
    </Link>
  );
}
