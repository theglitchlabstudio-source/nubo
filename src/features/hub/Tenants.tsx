import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ExternalLink, LogIn, Plus, Search } from 'lucide-react';
import { HubHeader } from './HubRoutes';
import { useTenants } from '@/data/hooks';
import { impersonate } from '@/services/auth';
import { BUSINESS_TYPE_LABEL, PLANS, subscriptionStatus } from '@/domain/features';
import type { Tenant } from '@/domain/types';
import { ThemeScope, usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { diffDays, todayIn } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { matchesSearch } from '@/lib/text';
import { cn } from '@/lib/cn';
import { ButtonLink, Dot, Input, Segmented } from '@/ui/primitives';
import { useQuery } from '@tanstack/react-query';
import { data } from '@/data';

type Filter = 'all' | 'active' | 'expiring' | 'suspended';

export default function Tenants() {
  const tenants = useTenants().data ?? [];
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const today = todayIn('Asia/Tehran');
  const list = tenants.filter((t) => {
    if (!matchesSearch(`${t.name} ${t.slug} ${t.contact.name}`, q)) return false;
    if (filter === 'active') return t.status !== 'suspended';
    if (filter === 'suspended') return t.status === 'suspended';
    if (filter === 'expiring') return subscriptionStatus(t, today) !== 'active';
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl">
      <HubHeader
        title="کسب‌وکارها"
        subtitle={`${toFa(tenants.length)} کسب‌وکار`}
        actions={
          <ButtonLink to="/hub/tenants/new" variant="primary" icon={<Plus size={17} />}>
            کسب‌وکار جدید
          </ButtonLink>
        }
      />
      <div className="px-5 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو" className="ps-11" />
          </div>
          <Segmented
            value={filter}
            onChange={setFilter}
            size="sm"
            options={[
              { value: 'all', label: 'همه' },
              { value: 'active', label: 'فعال' },
              { value: 'expiring', label: 'تمدید' },
              { value: 'suspended', label: 'معلق' },
            ]}
          />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <TenantCard key={t.id} t={t} today={today} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TenantCard({ t, today }: { t: Tenant; today: string }) {
  const navigate = useNavigate();
  const branding = useQuery({ queryKey: ['bundle', t.slug], queryFn: () => data.tenants.getBundleBySlug(t.slug) }).data?.branding;
  const sub = subscriptionStatus(t, today);
  const left = diffDays(t.subscription.endDate, today);
  return (
    <div className={cn('overflow-hidden rounded-theme-lg border border-line bg-surface', t.status === 'suspended' && 'opacity-60')}>
      <Link to={`/hub/tenants/${t.id}`} className="flex items-center gap-3 p-4">
        {branding && (
          <ThemeScope presetId={branding.presetId} overrides={branding} className="size-14 shrink-0 overflow-hidden rounded-theme">
            <Thumb seed={t.slug} />
          </ThemeScope>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold">{t.name}</div>
          <div className="text-[13px] text-muted">{BUSINESS_TYPE_LABEL[t.businessType]}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px]">
            <span className="rounded-full bg-surface-2 px-2 font-semibold">{PLANS[t.planId].name}</span>
            <span className="inline-flex items-center gap-1">
              <Dot color={t.status === 'suspended' ? '#9A968F' : sub === 'active' ? '#2F9E6A' : sub === 'expiring' ? '#E0A100' : '#D64545'} size={7} />
              {t.status === 'suspended' ? 'معلق' : left < 0 ? 'منقضی' : `${toFa(left)} روز`}
            </span>
            {t.isDemo && <span className="text-muted">· دمو</span>}
          </div>
        </div>
      </Link>
      <div className="grid grid-cols-2 border-t border-line text-[13px] font-semibold">
        <a href={`${import.meta.env.BASE_URL}b/${t.slug}`} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-1.5 hover:bg-surface-2">
          <ExternalLink size={14} /> صفحه رزرو
        </a>
        <button
          onClick={() => {
            impersonate(t.id);
            navigate(`/b/${t.slug}/admin`);
          }}
          className="press flex h-11 items-center justify-center gap-1.5 border-s border-line hover:bg-surface-2"
        >
          <LogIn size={14} /> ورود به‌جای مدیر
        </button>
      </div>
    </div>
  );
}

function Thumb({ seed }: { seed: string }) {
  const palette = usePalette();
  return <Motif palette={palette} seed={seed} compact className="size-full" />;
}
