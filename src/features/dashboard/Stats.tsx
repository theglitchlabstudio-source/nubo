import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useBookingsAll, useNow } from '@/data/hooks';
import { effectiveStatus } from '@/domain/bookingMachine';
import { DAY, addDays, dayRange, minutesOfDay, todayIn, weekdayOf, civilDateOf } from '@/lib/time';
import { WEEKDAYS_SHORT } from '@/lib/jalali';
import { formatCompactToman, toFa } from '@/lib/digits';
import { Card, Label, Segmented } from '@/ui/primitives';

type Range = 'week' | 'month';

export default function Stats() {
  const { ctx, tenant } = useDash();
  const all = useBookingsAll(ctx).data ?? [];
  const now = useNow();
  const [range, setRange] = useState<Range>('month');
  const tz = tenant.timezone;
  const today = todayIn(tz, now);

  const s = useMemo(() => {
    const days = range === 'week' ? 7 : 30;
    const from = dayRange(addDays(today, -days + 1), tz).from;
    const to = dayRange(today, tz).to;
    const prevFrom = from - days * DAY;
    const inRange = all.filter((b) => Date.parse(b.start) >= from && Date.parse(b.start) < to);
    const prev = all.filter((b) => Date.parse(b.start) >= prevFrom && Date.parse(b.start) < from);
    const st = (b: (typeof all)[number]) => effectiveStatus(b, now);
    const live = inRange.filter((b) => !['cancelled', 'rejected', 'expired'].includes(st(b)));
    const decided = all.filter((b) => b.source === 'online' && Date.parse(b.createdAt) >= from && ['confirmed', 'completed', 'no_show', 'rejected', 'expired'].includes(st(b)));
    const approved = decided.filter((b) => ['confirmed', 'completed', 'no_show'].includes(st(b)));
    const past = inRange.filter((b) => ['completed', 'no_show'].includes(st(b)));
    const noShows = past.filter((b) => st(b) === 'no_show').length;
    const revenue = inRange.filter((b) => st(b) === 'completed').reduce((x, b) => x + b.priceToman, 0);
    // weekday × hour heatmap
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const b of live) heat[weekdayOf(civilDateOf(Date.parse(b.start), tz))][Math.floor(minutesOfDay(Date.parse(b.start), tz) / 60)] += 1;
    const services = new Map<string, number>();
    for (const b of live) services.set(b.serviceName, (services.get(b.serviceName) ?? 0) + 1);
    const sources = { online: 0, phone: 0, walk_in: 0 } as Record<string, number>;
    for (const b of live) sources[b.source] = (sources[b.source] ?? 0) + 1;
    const perDay = Array.from({ length: days }, (_, i) => {
      const d = addDays(today, -days + 1 + i);
      const r = dayRange(d, tz);
      return live.filter((b) => Date.parse(b.start) >= r.from && Date.parse(b.start) < r.to).length;
    });
    return {
      total: live.length,
      prevTotal: prev.filter((b) => !['cancelled', 'rejected', 'expired'].includes(st(b))).length,
      approval: decided.length ? Math.round((approved.length / decided.length) * 100) : null,
      noShowRate: past.length ? Math.round((noShows / past.length) * 100) : 0,
      noShows,
      revenue,
      heat,
      services: [...services.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      sources,
      perDay,
    };
  }, [all, now, range, today, tz]);

  const delta = s.prevTotal ? Math.round(((s.total - s.prevTotal) / s.prevTotal) * 100) : 0;
  const hoursUsed = s.heat.flat().some(Boolean) ? s.heat[0].map((_, h) => h).filter((h) => s.heat.some((r) => r[h] > 0)) : [];
  const hMin = hoursUsed.length ? Math.min(...hoursUsed) : 9;
  const hMax = hoursUsed.length ? Math.max(...hoursUsed) : 20;
  const maxHeat = Math.max(1, ...s.heat.flat());
  const maxSvc = Math.max(1, ...s.services.map((x) => x[1]));
  const maxDay = Math.max(1, ...s.perDay);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="آمار"
        subtitle={range === 'week' ? '۷ روز اخیر' : '۳۰ روز اخیر'}
        actions={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: 'week', label: 'هفته' },
              { value: 'month', label: 'ماه' },
            ]}
          />
        }
      />
      <Page>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-theme-lg border border-line bg-line lg:grid-cols-4">
          <Big label="نوبت‌ها" value={toFa(s.total)} sub={s.prevTotal ? `${delta >= 0 ? '▲' : '▼'} ${toFa(Math.abs(delta))}٪ نسبت به دوره قبل` : undefined} />
          <Big label="نرخ تایید درخواست‌ها" value={s.approval == null ? '—' : `${toFa(s.approval)}٪`} />
          <Big label="نرخ غیبت" value={`${toFa(s.noShowRate)}٪`} sub={`${toFa(s.noShows)} غیبت`} />
          <Big label="درآمد انجام‌شده (تومان)" value={formatCompactToman(s.revenue)} />
        </div>

        {/* Per-day dots */}
        <Card className="mt-6 p-5">
          <Label>نوبت‌ها در هر روز</Label>
          <div className="mt-4 flex h-32 items-end gap-[3px]">
            {s.perDay.map((n, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${(n / maxDay) * 100}%` }}
                transition={{ delay: i * 0.01, type: 'spring', stiffness: 200, damping: 24 }}
                className={`min-h-[4px] flex-1 rounded-full ${i === s.perDay.length - 1 ? 'bg-accent' : 'bg-ink/80'}`}
                title={toFa(n)}
              />
            ))}
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] [&>*]:min-w-0">
          {/* Heatmap of dots */}
          <Card className="p-5">
            <Label>شلوغ‌ترین ساعت‌ها</Label>
            <div className="no-scrollbar mt-4 overflow-x-auto">
              <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `28px repeat(${hMax - hMin + 1}, 26px)` }}>
                <span />
                {Array.from({ length: hMax - hMin + 1 }, (_, i) => (
                  <span key={i} className="text-center text-[10px] text-muted tabular">
                    {toFa(hMin + i)}
                  </span>
                ))}
                {s.heat.map((row, wd) => (
                  <div key={wd} className="contents">
                    <span className="text-[11px] leading-[26px] font-semibold text-muted">{WEEKDAYS_SHORT[wd]}</span>
                    {row.slice(hMin, hMax + 1).map((n, h) => (
                      <span key={h} className="grid size-[26px] place-items-center">
                        <span
                          className="rounded-full"
                          style={{
                            width: n ? 8 + (n / maxHeat) * 18 : 5,
                            height: n ? 8 + (n / maxHeat) * 18 : 5,
                            background: n === maxHeat ? 'var(--accent)' : n ? 'var(--ink)' : 'var(--line)',
                            opacity: n ? 0.35 + (n / maxHeat) * 0.65 : 1,
                          }}
                        />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <Label>پرطرفدارترین خدمات</Label>
              <div className="mt-4 flex flex-col gap-3">
                {s.services.map(([name, n]) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{name}</span>
                      <span className="text-muted tabular">{toFa(n)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(n / maxSvc) * 100}%` }} className="h-full rounded-full bg-ink" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <Label>نحوه ثبت نوبت</Label>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  ['online', 'آنلاین'],
                  ['phone', 'تلفنی'],
                  ['walk_in', 'حضوری'],
                ].map(([k, l]) => (
                  <div key={k}>
                    <div className="numeral text-[28px]">{toFa(s.total ? Math.round(((s.sources[k] ?? 0) / s.total) * 100) : 0)}٪</div>
                    <div className="mt-1 text-[12px] text-muted">{l}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </Page>
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface p-5">
      <Label>{label}</Label>
      <div className="numeral mt-3 text-[34px]">{value}</div>
      {sub && <div className="mt-2 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}
