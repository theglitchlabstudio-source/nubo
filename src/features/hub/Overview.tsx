import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Phone } from 'lucide-react';
import { HubHeader } from './HubRoutes';
import { useOverview, useTenants } from '@/data/hooks';
import { BUSINESS_TYPE_LABEL, PLANS, subscriptionStatus } from '@/domain/features';
import { diffDays, todayIn } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { telLink } from '@/lib/text';
import { Card, Label } from '@/ui/primitives';

export default function Overview() {
  const o = useOverview().data;
  const tenants = useTenants().data ?? [];
  const today = todayIn('Asia/Tehran');
  const expiring = tenants
    .filter((t) => subscriptionStatus(t, today) !== 'active')
    .sort((a, b) => a.subscription.endDate.localeCompare(b.subscription.endDate));
  const byType = Object.entries(BUSINESS_TYPE_LABEL).map(([k, l]) => ({ l, n: tenants.filter((t) => t.businessType === k).length }));
  const max = Math.max(1, ...byType.map((x) => x.n));

  const cards = o
    ? [
        { l: 'کسب‌وکارها', v: o.tenants, sub: `${toFa(o.active)} فعال · ${toFa(o.suspended)} معلق` },
        { l: 'رو به انقضا', v: o.expiring, sub: `${toFa(o.expired)} منقضی شده`, accent: o.expiring + o.expired > 0 },
        { l: 'نوبت‌های امروز', v: o.bookingsToday, sub: `${toFa(o.bookingsWeek)} نوبت در ۷ روز آینده` },
        { l: 'درخواست‌های در انتظار', v: o.pendingTotal, sub: 'در همه کسب‌وکارها' },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <HubHeader title="نمای کلی" subtitle="همه کسب‌وکارهای شما در یک نگاه" />
      <div className="px-5 lg:px-10">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-theme-lg border border-line bg-line lg:grid-cols-4">
          {cards.map((c, i) => (
            <motion.div key={c.l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-surface p-5">
              <Label>{c.l}</Label>
              <div className={`numeral mt-3 text-[44px] ${c.accent ? 'text-accent' : ''}`}>{toFa(c.v)}</div>
              <div className="mt-2 text-[12px] text-muted">{c.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr] [&>*]:min-w-0">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">پیگیری تمدید</h2>
              <Link to="/hub/tenants" className="inline-flex items-center text-[13px] font-semibold text-muted">
                همه <ChevronLeft size={15} />
              </Link>
            </div>
            {expiring.length === 0 ? (
              <Card className="p-5 text-sm text-muted">همه اشتراک‌ها فعال است.</Card>
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
                {expiring.map((t) => {
                  const left = diffDays(t.subscription.endDate, today);
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-4">
                      <Link to={`/hub/tenants/${t.id}`} className="min-w-0 flex-1">
                        <div className="truncate font-bold">{t.name}</div>
                        <div className="text-[13px] text-muted">
                          {PLANS[t.planId].name} · {t.contact.name}
                        </div>
                      </Link>
                      <span className={`text-sm font-bold ${left < 0 ? 'text-danger' : 'text-pending'}`}>{left < 0 ? 'منقضی' : `${toFa(left)} روز`}</span>
                      <a href={telLink(t.contact.mobile)} aria-label="تماس" className="press grid size-10 place-items-center rounded-full bg-surface-2">
                        <Phone size={17} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-lg font-extrabold">بر اساس نوع کسب‌وکار</h2>
            <Card className="flex flex-col gap-3 p-5">
              {byType.map((x) => (
                <div key={x.l} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-sm">{x.l}</span>
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: max }, (_, i) => (
                      <span key={i} className={`size-3 rounded-full ${i < x.n ? 'bg-ink' : 'bg-ink/10'}`} />
                    ))}
                  </div>
                  <span className="w-6 text-end text-sm font-bold tabular">{toFa(x.n)}</span>
                </div>
              ))}
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
