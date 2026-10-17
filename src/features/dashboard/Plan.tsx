import { Check, Phone, X } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { FEATURE_LABEL, PLANS, subscriptionStatus } from '@/domain/features';
import type { FeatureKey } from '@/domain/types';
import { diffDays, fmtDate, todayIn } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';
import { Card } from '@/ui/primitives';

export default function Plan() {
  const { tenant, features } = useDash();
  const today = todayIn(tenant.timezone);
  const status = subscriptionStatus(tenant, today);
  const left = diffDays(tenant.subscription.endDate, today);
  const keys = (Object.keys(FEATURE_LABEL) as FeatureKey[]).filter((k) => k !== 'customDomain');
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="اشتراک" />
      <Page className="flex flex-col gap-6">
        <Card className="grid gap-6 p-6 sm:grid-cols-3">
          <div>
            <div className="text-[13px] font-semibold text-muted">پلن فعلی</div>
            <div className="mt-1 text-2xl font-extrabold">{PLANS[tenant.planId].name}</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-muted">اعتبار تا</div>
            <div className="mt-1 text-xl font-bold">{fmtDate(tenant.subscription.endDate, true)}</div>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-muted">وضعیت</div>
            <div className={cn('mt-1 text-xl font-bold', status === 'expired' ? 'text-danger' : status === 'expiring' ? 'text-pending' : 'text-confirmed')}>
              {status === 'expired' ? 'منقضی شده' : `${toFa(left)} روز مانده`}
            </div>
          </div>
        </Card>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['basic', 'pro'] as const).map((p) => (
            <Card key={p} className={cn('p-6', tenant.planId === p && 'border-2 border-ink')}>
              <div className="flex items-center justify-between">
                <div className="text-xl font-extrabold">{PLANS[p].name}</div>
                {tenant.planId === p && <span className="rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-bold text-paper">پلن شما</span>}
              </div>
              <ul className="mt-4 flex flex-col gap-2.5">
                {keys.map((k) => {
                  const on = p === tenant.planId ? features[k] : PLANS[p].features.includes(k);
                  return (
                    <li key={k} className={cn('flex items-center gap-2 text-sm', !on && 'text-muted')}>
                      {on ? <Check size={16} className="text-confirmed" /> : <X size={16} />} {FEATURE_LABEL[k]}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
        <a href={BRAND.contactTel} className="press flex items-center justify-center gap-2 rounded-theme bg-ink py-4 font-bold text-paper">
          <Phone size={18} /> تمدید یا ارتقا: تماس با {BRAND.studio}
        </a>
      </Page>
    </div>
  );
}
