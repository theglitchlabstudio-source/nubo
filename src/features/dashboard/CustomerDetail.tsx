import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowRight, MessageCircle, Phone, Plus, Smartphone } from 'lucide-react';
import { useDash } from './context';
import { Page } from './Layout';
import { useOpenBooking, useOpenNew } from './shared';
import { statsFor } from './Customers';
import { useBookingsAll, useCustomers, useNow } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { effectiveStatus } from '@/domain/bookingMachine';
import { civilDateOf, fmtDayLong, fmtTime } from '@/lib/time';
import { formatToman, toFa } from '@/lib/digits';
import { fmtMobile, telLink } from '@/lib/text';
import { shareLinks } from '@/services/notifications';
import { Avatar, Button, Card, EmptyState, Field, Input, Label, Skeleton, StatusPill, Switch, Textarea } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

export default function CustomerDetail() {
  const { id } = useParams();
  const { ctx, tenant, base } = useDash();
  const customer = (useCustomers(ctx).data ?? []).find((c) => c.id === id);
  const all = useBookingsAll(ctx).data ?? [];
  const now = useNow();
  const openBooking = useOpenBooking();
  const openNew = useOpenNew();
  const [draft, setDraft] = useState(customer);
  useEffect(() => setDraft(customer), [customer]);

  if (!customer || !draft) return <Page className="pt-10"><Skeleton className="h-60" /></Page>;
  const bookings = all.filter((b) => b.customerId === customer.id).sort((a, b) => b.start.localeCompare(a.start));
  const s = statsFor(bookings, now);
  const tz = tenant.timezone;
  const links = shareLinks(customer.mobile, `${customer.name} عزیز، سلام از ${tenant.name}.`);

  const save = async (patch: Partial<typeof customer>) => {
    try {
      const next = await data.customers.save(ctx, { ...draft, ...patch });
      setDraft(next);
      toast('ذخیره شد');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="px-5 pt-4 lg:px-10 lg:pt-8">
        <Link to={`${base}/customers`} className="press -ms-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted">
          <ArrowRight size={17} /> مشتریان
        </Link>
      </div>
      <Page className="pt-3">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={customer.name} color="var(--ink)" size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{customer.name}</h1>
            <div className="text-muted tabular">{fmtMobile(customer.mobile)}</div>
          </div>
          <div className="flex gap-2">
            <a href={telLink(customer.mobile)} className="press grid size-12 place-items-center rounded-full bg-ink text-paper" aria-label="تماس">
              <Phone size={20} />
            </a>
            <a href={links.sms} className="press grid size-12 place-items-center rounded-full border border-line bg-surface" aria-label="پیامک">
              <Smartphone size={20} />
            </a>
            <a href={links.whatsapp} target="_blank" rel="noreferrer" className="press grid size-12 place-items-center rounded-full border border-line bg-surface" aria-label="واتساپ">
              <MessageCircle size={20} />
            </a>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-theme-lg border border-line bg-line sm:grid-cols-4">
          {[
            { l: 'مراجعه موفق', v: toFa(s.completed) },
            { l: 'غیبت', v: toFa(s.noShows), danger: s.noShows > 0 },
            { l: 'لغو', v: toFa(s.cancelled) },
            { l: 'مجموع خرید', v: s.spent ? formatToman(s.spent).replace(' تومان', '') : '۰' },
          ].map((x) => (
            <div key={x.l} className="bg-surface p-4">
              <Label>{x.l}</Label>
              <div className={`numeral mt-2 text-[28px] ${x.danger ? 'text-danger' : ''}`}>{x.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">سابقه نوبت‌ها</h2>
              <Button size="sm" variant="ink" icon={<Plus size={16} />} onClick={() => openNew({ c: customer.id })}>
                نوبت جدید
              </Button>
            </div>
            {bookings.length === 0 ? (
              <Card>
                <EmptyState title="هنوز نوبتی ندارد" />
              </Card>
            ) : (
              <div className="divide-y divide-line border-y border-line">
                {bookings.map((b) => (
                  <button key={b.id} onClick={() => openBooking(b.id)} className="press flex w-full items-center gap-3 py-3 text-start hover:bg-surface-2/60">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{b.serviceName}</div>
                      <div className="text-[13px] text-muted">
                        {fmtDayLong(civilDateOf(Date.parse(b.start), tz), true)} · {fmtTime(b.start, tz)}
                      </div>
                    </div>
                    <StatusPill status={effectiveStatus(b, now)} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <Field label="نام">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onBlur={() => draft.name !== customer.name && save({})} />
            </Field>
            <Field label="یادداشت">
              <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} onBlur={() => draft.notes !== customer.notes && save({})} rows={3} placeholder="سلیقه، حساسیت، نکات مهم…" />
            </Field>
            <Card className="px-4 py-2">
              <Switch checked={draft.tags.includes('VIP')} onChange={(v) => save({ tags: v ? [...draft.tags, 'VIP'] : draft.tags.filter((t) => t !== 'VIP') })} label="مشتری ویژه (VIP)" />
              <Switch checked={draft.blocked} onChange={(v) => save({ blocked: v })} label="مسدود" description="درخواست‌های آنلاین این شماره به‌صورت خودکار تایید نمی‌شوند" />
            </Card>
          </aside>
        </div>
      </Page>
    </div>
  );
}
