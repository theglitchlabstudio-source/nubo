import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDash } from './context';
import { PageHeader } from './Layout';
import { useOpenBooking, useOpenNew } from './shared';
import { useBookingsAll, useNow, useSlotInputs } from '@/data/hooks';
import { effectiveStatus, STATUS_COLOR, STATUS_LABEL } from '@/domain/bookingMachine';
import { businessClosure, rangesFor, type SlotInputs } from '@/domain/slots';
import type { Booking, Staff } from '@/domain/types';
import {
  type CivilDate,
  addDays,
  civilDateOf,
  dayRange,
  fmtDate,
  fmtDayLong,
  fmtTime,
  hhmmToMinutes,
  jalaliOf,
  minutesOfDay,
  startOfWeek,
  todayIn,
  weekdayOf,
  zonedToUtc,
  minutesToHHmm,
} from '@/lib/time';
import { WEEKDAYS, WEEKDAYS_SHORT } from '@/lib/jalali';
import { toFa } from '@/lib/digits';
import { cn, hashString } from '@/lib/cn';
import { Avatar, Button, Dot, EmptyState, Segmented, Select } from '@/ui/primitives';

type View = 'day' | 'week' | 'list';
type ColorBy = 'staff' | 'status' | 'service';
const PX_PER_MIN = 1.25;
const SERVICE_COLORS = ['#E8643C', '#5C9BD6', '#7BA88E', '#D99AAE', '#E2B93B', '#A6A5DA', '#5E8C9A', '#C4573F'];

export default function CalendarPage() {
  const { ctx, tenant, bundle } = useDash();
  const all = useBookingsAll(ctx).data ?? [];
  const inputs = useSlotInputs(tenant.id).data;
  const now = useNow();
  const tz = tenant.timezone;
  const today = todayIn(tz, now);
  const [params, setParams] = useSearchParams();
  const view = (params.get('v') as View) ?? 'day';
  const date = (params.get('d') as CivilDate) ?? today;
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [colorBy, setColorBy] = useState<ColorBy>('staff');
  const [dir, setDir] = useState(0);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    next.set(k, v);
    setParams(next, { replace: true });
  };
  const step = view === 'week' ? 7 : view === 'list' ? 14 : 1;
  const shift = (n: number) => {
    setDir(n);
    set('d', addDays(date, n * step));
  };

  const activeStaff = bundle.staff.filter((s) => s.active);
  const staffShown = staffFilter === 'all' ? activeStaff : activeStaff.filter((s) => s.id === staffFilter);
  const visible = useMemo(
    () => all.filter((b) => !['cancelled', 'rejected', 'expired'].includes(effectiveStatus(b, now)) && (staffFilter === 'all' || b.staffId === staffFilter)),
    [all, now, staffFilter],
  );

  const colorFor = (b: Booking) => {
    if (colorBy === 'status') return STATUS_COLOR[effectiveStatus(b, now)];
    if (colorBy === 'service') return SERVICE_COLORS[hashString(b.serviceId) % SERVICE_COLORS.length];
    return bundle.staff.find((s) => s.id === b.staffId)?.color ?? 'var(--ink)';
  };

  const weekStart = startOfWeek(date);
  const title =
    view === 'day'
      ? fmtDayLong(date)
      : view === 'week'
        ? `${fmtDate(weekStart)} تا ${fmtDate(addDays(weekStart, 6))}`
        : `${fmtDate(date)} تا ${fmtDate(addDays(date, 13))}`;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="تقویم"
        subtitle={title}
        actions={
          <Segmented
            value={view}
            onChange={(v) => set('v', v)}
            options={[
              { value: 'day', label: 'روز' },
              { value: 'week', label: 'هفته' },
              { value: 'list', label: 'فهرست' },
            ]}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-2 px-5 pb-4 lg:px-10">
        <div className="flex items-center gap-1">
          <button aria-label="قبلی" onClick={() => shift(-1)} className="press grid size-10 place-items-center rounded-full border border-line hover:bg-surface-2">
            <ChevronRight size={19} />
          </button>
          <button aria-label="بعدی" onClick={() => shift(1)} className="press grid size-10 place-items-center rounded-full border border-line hover:bg-surface-2">
            <ChevronLeft size={19} />
          </button>
          <Button size="sm" variant={date === today ? 'ink' : 'secondary'} className="ms-1 h-10" onClick={() => set('d', today)}>
            امروز
          </Button>
        </div>
        {activeStaff.length > 1 && (
          <div className="no-scrollbar flex max-w-full gap-1.5 overflow-x-auto">
            <Chip on={staffFilter === 'all'} onClick={() => setStaffFilter('all')}>
              همه
            </Chip>
            {activeStaff.map((s) => (
              <Chip key={s.id} on={staffFilter === s.id} onClick={() => setStaffFilter(s.id)}>
                <Dot color={s.color} /> {s.name.replace(/^(دکتر|استاد|مربی)\s+/, '')}
              </Chip>
            ))}
          </div>
        )}
        <div className="ms-auto hidden w-44 sm:block">
          <Select value={colorBy} onChange={(e) => setColorBy(e.target.value as ColorBy)} className="h-10">
            <option value="staff">رنگ: کارمند</option>
            <option value="status">رنگ: وضعیت</option>
            <option value="service">رنگ: خدمت</option>
          </Select>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${view}-${date}-${staffFilter}`}
          initial={{ opacity: 0, x: dir * -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * 24 }}
          transition={{ duration: 0.2 }}
        >
          {inputs && view === 'day' && <DayGrid date={date} staff={staffShown} bookings={visible} inputs={inputs} now={now} colorFor={colorFor} />}
          {inputs && view === 'week' && <WeekGrid weekStart={weekStart} bookings={visible} inputs={inputs} now={now} colorFor={colorFor} staff={staffShown} today={today} onDay={(d) => {
            const next = new URLSearchParams(params);
            next.set('v', 'day');
            next.set('d', d);
            setParams(next, { replace: true });
          }} />}
          {view === 'list' && <ListView from={date} bookings={visible} now={now} today={today} />}
        </motion.div>
      </AnimatePresence>

      {colorBy === 'status' && (
        <div className="flex flex-wrap gap-3 px-5 pt-4 text-[12px] text-muted lg:px-10">
          {(['pending', 'confirmed', 'proposed', 'completed', 'no_show'] as const).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <Dot color={STATUS_COLOR[s]} /> {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn('press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold', on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}>
      {children}
    </button>
  );
}

/** Visible hour range: working hours of the shown staff on these dates, widened for bookings. */
function hourBounds(inputs: SlotInputs, staff: Staff[], dates: CivilDate[], bookings: Booking[], tz: string) {
  let min = 24 * 60;
  let max = 0;
  for (const d of dates)
    for (const s of staff)
      for (const r of rangesFor(inputs, s.id, d).ranges) {
        min = Math.min(min, hhmmToMinutes(r.start));
        max = Math.max(max, hhmmToMinutes(r.end));
      }
  for (const b of bookings) {
    min = Math.min(min, minutesOfDay(Date.parse(b.start), tz));
    max = Math.max(max, minutesOfDay(Date.parse(b.end), tz) || 24 * 60);
  }
  if (min >= max) return { start: 9 * 60, end: 20 * 60 };
  return { start: Math.floor(min / 60) * 60, end: Math.min(24 * 60, Math.ceil(max / 60) * 60) };
}

function TimeGutter({ start, end }: { start: number; end: number }) {
  const hours = [];
  for (let m = start; m < end; m += 60) hours.push(m);
  return (
    <div className="sticky start-0 z-10 w-14 shrink-0 bg-paper">
      {hours.map((m) => (
        <div key={m} className="relative text-[11px] text-muted tabular" style={{ height: 60 * PX_PER_MIN }}>
          <span className="absolute -top-2 start-2">{toFa(minutesToHHmm(m))}</span>
        </div>
      ))}
    </div>
  );
}

function Column({
  date,
  staffId,
  inputs,
  bookings,
  bounds,
  now,
  colorFor,
  compact,
}: {
  date: CivilDate;
  staffId: string | null;
  inputs: SlotInputs;
  bookings: Booking[];
  bounds: { start: number; end: number };
  now: number;
  colorFor: (b: Booking) => string;
  compact?: boolean;
}) {
  const { bundle } = useDash();
  const open = useOpenBooking();
  const openNew = useOpenNew();
  const tz = inputs.tz;
  const height = (bounds.end - bounds.start) * PX_PER_MIN;
  const closedDay = !!businessClosure(inputs, date) && !inputs.dateOverrides.some((o) => o.date === date);
  const ranges = staffId ? rangesFor(inputs, staffId, date).ranges : [];
  const today = todayIn(tz, now);
  const nowMin = minutesOfDay(now, tz);

  // Tap on empty space → new booking at that time (rounded down to 15 min).
  const onEmpty = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const m = Math.floor((bounds.start + y / PX_PER_MIN) / 15) * 15;
    openNew({ d: date, t: zonedToUtc(date, minutesToHHmm(m), tz), st: staffId ?? undefined });
  };

  return (
    <div className="relative flex-1 cursor-copy border-s border-line" style={{ height }} onClick={onEmpty}>
      {/* hour lines */}
      {Array.from({ length: (bounds.end - bounds.start) / 60 }, (_, i) => (
        <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: i * 60 * PX_PER_MIN }} />
      ))}
      {/* off hours */}
      <div className="absolute inset-0 bg-surface-2/70">
        {!closedDay &&
          ranges.map((r, i) => (
            <div
              key={i}
              className="absolute inset-x-0 bg-paper"
              style={{ top: (hhmmToMinutes(r.start) - bounds.start) * PX_PER_MIN, height: (hhmmToMinutes(r.end) - hhmmToMinutes(r.start)) * PX_PER_MIN }}
            />
          ))}
        {!staffId && !closedDay && <div className="absolute inset-0 bg-paper" />}
      </div>
      {closedDay && <div className="pointer-events-none absolute inset-x-0 top-6 text-center text-[12px] font-semibold text-muted">تعطیل</div>}
      {date === today && nowMin >= bounds.start && nowMin <= bounds.end && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (nowMin - bounds.start) * PX_PER_MIN }}>
          <span className="-ms-1 size-2 rounded-full bg-accent" />
          <span className="h-[2px] flex-1 bg-accent" />
        </div>
      )}
      {bookings.map((b) => {
        const s = minutesOfDay(Date.parse(b.start), tz);
        const top = (s - bounds.start) * PX_PER_MIN;
        const h = Math.max(b.durationMin * PX_PER_MIN - 2, 22);
        const color = colorFor(b);
        const st = effectiveStatus(b, now);
        const staff = bundle.staff.find((x) => x.id === b.staffId);
        return (
          <motion.button
            key={b.id}
            layout
            onClick={() => open(b.id)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn('absolute inset-x-1 z-10 overflow-hidden rounded-[10px] border-s-[3px] px-2 py-1 text-start text-[12px] leading-5 shadow-sm hover:z-30 hover:shadow-md', st === 'pending' && 'border-dashed')}
            style={{
              top: top + 1,
              height: h,
              borderColor: color,
              background: `color-mix(in srgb, ${color} 15%, var(--surface))`,
              opacity: st === 'completed' || st === 'no_show' ? 0.7 : 1,
            }}
          >
            <div className="flex items-center gap-1 font-bold">
              {st === 'pending' && <Dot color={STATUS_COLOR.pending} size={6} />}
              <span className="truncate">{b.customerName}</span>
            </div>
            {h > 36 && (
              <div className="truncate text-muted">
                {fmtTime(b.start, tz)} · {b.serviceName}
                {compact && staff ? ` · ${staff.name}` : ''}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function DayGrid({ date, staff, bookings, inputs, now, colorFor }: { date: CivilDate; staff: Staff[]; bookings: Booking[]; inputs: SlotInputs; now: number; colorFor: (b: Booking) => string }) {
  const tz = inputs.tz;
  const { from, to } = dayRange(date, tz);
  const dayBookings = bookings.filter((b) => Date.parse(b.start) >= from && Date.parse(b.start) < to);
  const bounds = hourBounds(inputs, staff, [date], dayBookings, tz);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Scroll to "now" (or the first booking) when opening today.
    const nowMin = minutesOfDay(now, tz);
    if (scroller.current && nowMin > bounds.start + 90) scroller.current.scrollTop = (nowMin - bounds.start - 60) * PX_PER_MIN;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);
  if (!staff.length) return <EmptyState title="کارمند فعالی ندارید" />;
  return (
    <div className="mx-5 overflow-hidden rounded-theme-lg border border-line bg-paper lg:mx-10">
      <div ref={scroller} className="max-h-[calc(100dvh-260px)] overflow-auto lg:max-h-[calc(100dvh-230px)]">
        <div className="sticky top-0 z-20 flex bg-paper/95 backdrop-blur" style={{ minWidth: staff.length > 2 ? 56 + staff.length * 150 : undefined }}>
          <div className="w-14 shrink-0" />
          {staff.length > 1 &&
            staff.map((s) => (
              <div key={s.id} className="flex flex-1 items-center gap-2 border-s border-b border-line px-3 py-2.5">
                <Avatar name={s.name} color={s.color} photo={s.photo} size={26} />
                <span className="truncate text-[13px] font-bold">{s.name}</span>
              </div>
            ))}
        </div>
        <div className="flex pt-3" style={{ minWidth: staff.length > 2 ? 56 + staff.length * 150 : undefined }}>
          <TimeGutter start={bounds.start} end={bounds.end} />
          {staff.map((s) => (
            <Column key={s.id} date={date} staffId={s.id} inputs={inputs} bounds={bounds} now={now} colorFor={colorFor} bookings={dayBookings.filter((b) => b.staffId === s.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekGrid({ weekStart, bookings, inputs, now, colorFor, staff, today, onDay }: { weekStart: CivilDate; bookings: Booking[]; inputs: SlotInputs; now: number; colorFor: (b: Booking) => string; staff: Staff[]; today: CivilDate; onDay: (d: CivilDate) => void }) {
  const tz = inputs.tz;
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const range = { from: dayRange(days[0], tz).from, to: dayRange(days[6], tz).to };
  const weekBookings = bookings.filter((b) => Date.parse(b.start) >= range.from && Date.parse(b.start) < range.to);
  const bounds = hourBounds(inputs, staff, days, weekBookings, tz);
  return (
    <div className="mx-5 overflow-hidden rounded-theme-lg border border-line bg-paper lg:mx-10">
      <div className="max-h-[calc(100dvh-260px)] overflow-auto lg:max-h-[calc(100dvh-230px)]">
        <div className="sticky top-0 z-20 flex min-w-[820px] bg-paper/95 backdrop-blur">
          <div className="w-14 shrink-0" />
          {days.map((d) => {
            const j = jalaliOf(d);
            const count = weekBookings.filter((b) => civilDateOf(Date.parse(b.start), tz) === d).length;
            return (
              <button key={d} onClick={() => onDay(d)} className="flex flex-1 flex-col items-center border-s border-b border-line py-2 hover:bg-surface-2">
                <span className={cn('text-[11px] font-semibold', weekdayOf(d) === 6 ? 'text-accent' : 'text-muted')}>{WEEKDAYS[weekdayOf(d)]}</span>
                <span className={cn('mt-0.5 grid size-8 place-items-center rounded-full text-[15px] font-bold tabular', d === today && 'bg-accent text-accent-ink')}>{toFa(j.jd)}</span>
                <span className="text-[10px] text-muted">{count ? `${toFa(count)} نوبت` : ' '}</span>
              </button>
            );
          })}
        </div>
        <div className="flex min-w-[820px] pt-3">
          <TimeGutter start={bounds.start} end={bounds.end} />
          {days.map((d) => (
            <Column
              key={d}
              date={d}
              staffId={staff.length === 1 ? staff[0].id : null}
              inputs={inputs}
              bounds={bounds}
              now={now}
              colorFor={colorFor}
              compact
              bookings={weekBookings.filter((b) => civilDateOf(Date.parse(b.start), tz) === d)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ListView({ from, bookings, now, today }: { from: CivilDate; bookings: Booking[]; now: number; today: CivilDate }) {
  const { tenant, bundle } = useDash();
  const open = useOpenBooking();
  const tz = tenant.timezone;
  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i));
  const groups = days
    .map((d) => {
      const { from: f, to } = dayRange(d, tz);
      return { d, list: bookings.filter((b) => Date.parse(b.start) >= f && Date.parse(b.start) < to).sort((a, b) => a.start.localeCompare(b.start)) };
    })
    .filter((g) => g.list.length);
  if (!groups.length) return <EmptyState title="در این بازه نوبتی نیست" />;
  return (
    <div className="flex flex-col gap-6 px-5 lg:px-10">
      {groups.map((g) => {
        const j = jalaliOf(g.d);
        return (
          <section key={g.d} className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-t border-line pt-4 lg:grid-cols-[96px_minmax(0,1fr)]">
            <div>
              <div className={cn('numeral text-[40px]', g.d === today && 'text-accent')}>{toFa(j.jd)}</div>
              <div className="mt-1 text-[12px] font-semibold text-muted">{WEEKDAYS_SHORT[weekdayOf(g.d)]} · {toFa(g.list.length)}</div>
            </div>
            <div className="min-w-0 divide-y divide-line">
              {g.list.map((b) => {
                const staff = bundle.staff.find((s) => s.id === b.staffId);
                const st = effectiveStatus(b, now);
                return (
                  <button key={b.id} onClick={() => open(b.id)} className="press flex w-full items-center gap-3 py-2.5 text-start hover:bg-surface-2/60">
                    <span className="w-12 shrink-0 font-bold tabular">{fmtTime(b.start, tz)}</span>
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: staff?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.customerName}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {b.serviceName}
                        {staff && bundle.staff.length > 1 ? ` · ${staff.name}` : ''}
                      </span>
                    </span>
                    {st !== 'confirmed' && <span className="text-[12px] font-semibold" style={{ color: STATUS_COLOR[st] }}>{STATUS_LABEL[st]}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
