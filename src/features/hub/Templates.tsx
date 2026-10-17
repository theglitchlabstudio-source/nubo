import { HubHeader } from './HubRoutes';
import { TEMPLATES } from '@/seed/templates';
import { BUSINESS_TYPE_LABEL } from '@/domain/features';
import { presetById } from '@/theme/themes';
import { WEEKDAYS_SHORT } from '@/lib/jalali';
import { fmtDuration } from '@/lib/time';
import { priceLabel } from '@/features/public/helpers';
import { rangesLabel } from '@/features/dashboard/shared';
import { Card, ButtonLink } from '@/ui/primitives';

const MODE = { manual: 'تایید دستی', auto: 'تایید خودکار', smart: 'تایید هوشمند' } as const;

export default function Templates() {
  return (
    <div className="mx-auto max-w-5xl">
      <HubHeader title="قالب‌ها" subtitle="خدمات، ساعت کاری و قوانین پیش‌فرض هر نوع کسب‌وکار" actions={<ButtonLink to="/hub/tenants/new" variant="primary">ساخت از قالب</ButtonLink>} />
      <div className="flex flex-col gap-4 px-5 lg:px-10">
        {TEMPLATES.map((t) => (
          <Card key={t.type} className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-extrabold">{BUSINESS_TYPE_LABEL[t.type]}</h2>
              <span className="text-[13px] text-muted">
                هویت {presetById(t.presetId).name} · {MODE[t.settings.confirmationMode ?? 'manual']}
              </span>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="divide-y divide-line">
                {t.services.map((s) => (
                  <div key={s.name} className="flex justify-between py-1.5 text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted">
                      {fmtDuration(s.durationMin)} · {priceLabel({ priceType: s.priceType ?? 'fixed', priceToman: s.priceToman })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-sm">
                {t.week.map((r, i) => (
                  <div key={i} className="flex gap-3 py-1">
                    <span className="w-5 font-bold">{WEEKDAYS_SHORT[i]}</span>
                    <span className={r.length ? '' : 'text-muted'}>{r.length ? rangesLabel(r) : 'تعطیل'}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
