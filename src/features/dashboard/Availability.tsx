import { useEffect, useState } from 'react';
import { Plus, Trash2, CalendarOff, Clock4, PartyPopper } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { WeekEditor, rowsFromWeek, validWeek, weekFromRows, type Week } from './WeekEditor';
import { DateStrip, TimeSelect, rangesLabel } from './shared';
import { useNow, useSlotInputs } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { DateOverride, TimeOff, TimeRange } from '@/domain/types';
import { type CivilDate, addDays, civilDateOf, diffDays, fmtDayLong, fmtTime, todayIn, zonedToUtc } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { uid, cn } from '@/lib/cn';
import { Button, Card, EmptyState, Field, Input, Select, Skeleton, Switch } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function Availability() {
  const { tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data;
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="ساعت کاری و تعطیلات" subtitle="زمان‌هایی که مشتری می‌تواند نوبت بگیرد" />
      <Page>
        {!inputs ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] [&>*]:min-w-0">
            <WeeklyHours />
            <div className="flex flex-col gap-10">
              <Holidays />
              <Overrides />
              <Closures />
            </div>
          </div>
        )}
      </Page>
    </div>
  );
}

function WeeklyHours() {
  const { ctx, tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data!;
  const initial = weekFromRows(inputs.workingHours, null);
  const [week, setWeek] = useState<Week>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(week) !== JSON.stringify(initial);
  useEffect(() => setWeek(weekFromRows(inputs.workingHours, null)), [inputs.workingHours]);

  return (
    <section>
      <h2 className="mb-1 text-lg font-extrabold">ساعت کاری هفتگی</h2>
      <p className="mb-3 text-sm text-muted">فاصله بین بازه‌ها، زمان استراحت حساب می‌شود.</p>
      <Card className="px-4">
        <WeekEditor value={week} onChange={setWeek} />
      </Card>
      <div className={cn('sticky bottom-[calc(80px+var(--safe-bottom))] mt-4 transition-opacity lg:bottom-6', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <Button
          variant="primary"
          size="lg"
          block
          disabled={!validWeek(week)}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await data.availability.saveWeek(ctx, null, rowsFromWeek(week, tenant.id, null));
              toast('ساعت کاری ذخیره شد');
            } catch (e) {
              toast(errorMessage(e), 'error');
            } finally {
              setBusy(false);
            }
          }}
        >
          ذخیره ساعت کاری
        </Button>
      </div>
    </section>
  );
}

function Holidays() {
  const { ctx, tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data!;
  const now = useNow();
  const tz = tenant.timezone;
  const today = todayIn(tz, now);
  const [special, setSpecial] = useState<CivilDate | null>(null);
  const upcoming = inputs.holidays
    .map((h) => ({ h, date: civilDateOf(Date.parse(h.start), tz) }))
    .filter((x) => diffDays(x.date, today) >= 0 && diffDays(x.date, today) <= 150)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section>
      <div className="mb-1 flex items-center gap-2">
        <PartyPopper size={18} />
        <h2 className="text-lg font-extrabold">تعطیلات رسمی</h2>
      </div>
      <p className="mb-3 text-sm text-muted">به‌صورت پیش‌فرض تعطیل هستند. اگر کار می‌کنید، روز را باز کنید یا ساعت ویژه بگذارید.</p>
      {upcoming.length === 0 ? (
        <Card>
          <EmptyState title="تعطیلی رسمی در ماه‌های آینده نیست" />
        </Card>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
          {upcoming.map(({ h, date }) => {
            const ov = inputs.dateOverrides.find((o) => o.date === date && o.staffId === null);
            return (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{fmtDayLong(date)}</div>
                  <div className="truncate text-[13px] text-muted">{h.reason}</div>
                  {ov && <div className="text-[12px] font-semibold text-accent">ساعت ویژه: {rangesLabel(ov.ranges) || 'تعطیل'}</div>}
                </div>
                <button onClick={() => setSpecial(date)} className="press h-9 rounded-full px-3 text-[12px] font-semibold text-muted hover:bg-surface-2">
                  ساعت ویژه
                </button>
                <div className="w-24 text-[12px]">
                  <Switch
                    checked={h.disabled}
                    onChange={async (open) => {
                      await data.availability.saveTimeOff(ctx, { ...h, disabled: open });
                      toast(open ? 'این روز باز شد' : 'این روز تعطیل شد');
                    }}
                    label={<span className="text-[12px]">{h.disabled ? 'باز' : 'تعطیل'}</span>}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <SpecialHoursSheet date={special} onClose={() => setSpecial(null)} />
    </section>
  );
}

function SpecialHoursSheet({ date, onClose }: { date: CivilDate | null; onClose: () => void }) {
  const { ctx, tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data!;
  const existing = date ? inputs.dateOverrides.find((o) => o.date === date && o.staffId === null) : undefined;
  const [ranges, setRanges] = useState<TimeRange[]>([{ start: '10:00', end: '14:00' }]);
  const [day, setDay] = useState<CivilDate>(date ?? todayIn(tenant.timezone));
  useEffect(() => {
    if (date) {
      setDay(date);
      setRanges(existing?.ranges.length ? existing.ranges : [{ start: '10:00', end: '14:00' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  const save = async (r: TimeRange[]) => {
    const o: DateOverride = existing ?? { id: uid('ov'), tenantId: tenant.id, staffId: null, date: day, ranges: [] };
    await data.availability.saveOverride(ctx, { ...o, date: day, ranges: r });
    toast('ساعت ویژه ذخیره شد');
    onClose();
  };
  return (
    <Sheet open={!!date} onClose={onClose} title="ساعت ویژه یک روز">
      <div className="flex flex-col gap-4">
        <DateStrip start={todayIn(tenant.timezone)} days={120} value={day} onChange={setDay} />
        <p className="text-sm text-muted">برای {fmtDayLong(day)}، ساعت کاری هفتگی نادیده گرفته می‌شود.</p>
        {ranges.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1">
              <TimeSelect value={r.start} onChange={(v) => setRanges(ranges.map((x, k) => (k === i ? { ...x, start: v } : x)))} />
            </div>
            <span className="text-muted">تا</span>
            <div className="flex-1">
              <TimeSelect value={r.end} onChange={(v) => setRanges(ranges.map((x, k) => (k === i ? { ...x, end: v } : x)))} />
            </div>
          </div>
        ))}
        <button onClick={() => setRanges([...ranges, { start: '16:00', end: '20:00' }])} className="w-fit text-[13px] font-semibold text-muted">
          + بازه دیگر
        </button>
        <div className="flex gap-2">
          <Button variant="primary" size="lg" block onClick={() => save(ranges)}>
            ذخیره
          </Button>
          <Button size="lg" onClick={() => save([])}>
            کل روز تعطیل
          </Button>
        </div>
        {existing && (
          <Button
            variant="ghost"
            onClick={async () => {
              await data.availability.removeOverride(ctx, existing.id);
              toast('ساعت ویژه حذف شد');
              onClose();
            }}
          >
            حذف ساعت ویژه
          </Button>
        )}
      </div>
    </Sheet>
  );
}

function Overrides() {
  const { ctx, tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data!;
  const today = todayIn(tenant.timezone);
  const [open, setOpen] = useState<CivilDate | null>(null);
  const list = inputs.dateOverrides.filter((o) => o.staffId === null && diffDays(o.date, today) >= 0).sort((a, b) => a.date.localeCompare(b.date));
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock4 size={18} />
          <h2 className="text-lg font-extrabold">روزهای با ساعت ویژه</h2>
        </div>
        <Button size="sm" icon={<Plus size={15} />} onClick={() => setOpen(addDays(today, 1))}>
          افزودن
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-theme bg-surface-2 p-4 text-sm text-muted">مثلاً «پنجشنبه آخر سال فقط تا ساعت ۱۴».</p>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
          {list.map((o) => (
            <div key={o.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="font-bold">{fmtDayLong(o.date)}</div>
                <div className="text-[13px] text-muted">{o.ranges.length ? rangesLabel(o.ranges) : 'تعطیل'}</div>
              </div>
              <button aria-label="حذف" onClick={() => data.availability.removeOverride(ctx, o.id)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2">
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
      <SpecialHoursSheet date={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function Closures() {
  const { ctx, tenant, bundle } = useDash();
  const inputs = useSlotInputs(tenant.id).data!;
  const now = useNow();
  const tz = tenant.timezone;
  const [adding, setAdding] = useState(false);
  const list = inputs.timeOff.filter((t) => t.source === 'manual' && Date.parse(t.end) > now).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarOff size={18} />
          <h2 className="text-lg font-extrabold">مرخصی و زمان‌های بسته</h2>
        </div>
        <Button size="sm" icon={<Plus size={15} />} onClick={() => setAdding(true)}>
          افزودن
        </Button>
      </div>
      {list.length === 0 ? (
        <p className="rounded-theme bg-surface-2 p-4 text-sm text-muted">مرخصی کارمند، تعطیلی موقت یا یک بازه بسته در روز.</p>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
          {list.map((t) => {
            const staff = bundle.staff.find((s) => s.id === t.staffId);
            const d = civilDateOf(Date.parse(t.start), tz);
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{fmtDayLong(d)}</div>
                  <div className="text-[13px] text-muted">
                    {t.allDay ? 'کل روز' : `${fmtTime(t.start, tz)} تا ${fmtTime(t.end, tz)}`} · {staff ? staff.name : 'همه'}
                    {t.reason && ` · ${t.reason}`}
                  </div>
                </div>
                <button aria-label="حذف" onClick={() => data.availability.removeTimeOff(ctx, t.id)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2">
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="زمان بسته جدید">
        {adding && <ClosureForm onDone={() => setAdding(false)} />}
      </Sheet>
    </section>
  );
}

function ClosureForm({ onDone }: { onDone: () => void }) {
  const { ctx, tenant, bundle } = useDash();
  const tz = tenant.timezone;
  const today = todayIn(tz);
  const [date, setDate] = useState(today);
  const [days, setDays] = useState(1);
  const [allDay, setAllDay] = useState(true);
  const [from, setFrom] = useState('12:00');
  const [to, setTo] = useState('14:00');
  const [staffId, setStaffId] = useState<string>('all');
  const [reason, setReason] = useState('');
  const save = async () => {
    const start = allDay ? zonedToUtc(date, '00:00', tz) : zonedToUtc(date, from, tz);
    const end = allDay ? zonedToUtc(addDays(date, days), '00:00', tz) : zonedToUtc(date, to, tz);
    if (end <= start) return toast('زمان پایان باید بعد از شروع باشد', 'error');
    const t: TimeOff = {
      id: uid('to'),
      tenantId: tenant.id,
      staffId: staffId === 'all' ? null : staffId,
      kind: staffId === 'all' ? (allDay ? 'closure' : 'block') : allDay ? 'leave' : 'block',
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      allDay,
      reason: reason.trim() || undefined,
      source: 'manual',
      disabled: false,
    };
    await data.availability.saveTimeOff(ctx, t);
    toast('ذخیره شد');
    onDone();
  };
  return (
    <div className="flex flex-col gap-4">
      <Field label="برای">
        <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="all">کل کسب‌وکار</option>
          {bundle.staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <DateStrip start={today} days={90} value={date} onChange={setDate} />
      <Switch checked={allDay} onChange={setAllDay} label="کل روز" />
      {allDay ? (
        <Field label="چند روز؟">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
              <option key={n} value={n}>
                {toFa(n)} روز
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <TimeSelect value={from} onChange={setFrom} />
          </div>
          <span className="text-muted">تا</span>
          <div className="flex-1">
            <TimeSelect value={to} onChange={setTo} />
          </div>
        </div>
      )}
      <Field label="علت (اختیاری)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثلاً مرخصی، تعمیرات" />
      </Field>
      <Button variant="primary" size="lg" onClick={save}>
        ذخیره
      </Button>
    </div>
  );
}
