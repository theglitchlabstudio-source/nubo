import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';
import { type SlotInputs, findOverlaps, getSlots, rangesFor, businessClosure } from '@/domain/slots';
import type { Service, Staff, TimeRange } from '@/domain/types';
import { type CivilDate, addDays, jalaliOf, weekdayOf, zonedToUtc, minutesToHHmm } from '@/lib/time';
import { JALALI_MONTHS, WEEKDAYS_SHORT } from '@/lib/jalali';
import { toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { SlotGrid } from '@/ui/SlotGrid';
import { Avatar, Segmented, Select } from '@/ui/primitives';

/** Open the booking detail sheet from anywhere in the dashboard. */
export function useOpenBooking() {
  const [params, setParams] = useSearchParams();
  return (id: string) => {
    const next = new URLSearchParams(params);
    next.set('b', id);
    setParams(next);
  };
}

export function useOpenNew() {
  const [params, setParams] = useSearchParams();
  return (prefill: { d?: string; t?: number; st?: string; c?: string } = {}) => {
    const next = new URLSearchParams(params);
    next.set('new', '1');
    if (prefill.d) next.set('nd', prefill.d);
    if (prefill.t) next.set('nt', String(prefill.t));
    if (prefill.st) next.set('nst', prefill.st);
    if (prefill.c) next.set('nc', prefill.c);
    setParams(next);
  };
}

/** Horizontal strip of upcoming days, Persian weekday + day number in a dot. */
export function DateStrip({
  start,
  days = 30,
  value,
  onChange,
  isClosed,
}: {
  start: CivilDate;
  days?: number;
  value: CivilDate;
  onChange: (d: CivilDate) => void;
  isClosed?: (d: CivilDate) => boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const list = useMemo(() => Array.from({ length: days }, (_, i) => addDays(start, i)), [start, days]);
  useEffect(() => {
    ref.current?.querySelector('[data-sel="1"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [value]);
  const month = jalaliOf(value);
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold text-muted">
        {JALALI_MONTHS[month.jm - 1]} {toFa(month.jy)}
      </div>
      <div ref={ref} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {list.map((d) => {
          const sel = d === value;
          const closed = isClosed?.(d);
          const j = jalaliOf(d);
          return (
            <button
              key={d}
              data-sel={sel ? '1' : '0'}
              onClick={() => onChange(d)}
              className="press flex w-12 shrink-0 flex-col items-center gap-1 py-1"
            >
              <span className={cn('text-[11px] font-semibold', weekdayOf(d) === 6 ? 'text-accent' : 'text-muted')}>{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
              <span className={cn('relative grid size-10 place-items-center rounded-full text-[15px] font-bold tabular', closed && !sel ? 'text-muted' : '')}>
                {sel ? (
                  <motion.span layoutId="strip-sel" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
                ) : (
                  <span className={cn('absolute inset-0 rounded-full', closed ? 'border border-dashed border-ink/20' : 'bg-surface-2')} />
                )}
                <span className={cn('relative', sel && 'text-accent-ink')}>{toFa(j.jd)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Time select in Persian digits (native select = great on phones). */
export function TimeSelect({ value, onChange, from = 0, to = 24 * 60, step = 15 }: { value: string; onChange: (v: string) => void; from?: number; to?: number; step?: number }) {
  const opts = [];
  for (let m = from; m <= to; m += step) opts.push(minutesToHHmm(m));
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="tabular">
      {opts.map((o) => (
        <option key={o} value={o}>
          {toFa(o)}
        </option>
      ))}
    </Select>
  );
}

/** Admin slot picker: staff + date strip + free slots, with an optional free-time mode. */
export function SlotPicker({
  inputs,
  service,
  staff,
  staffId,
  onStaff,
  date,
  onDate,
  today,
  selected,
  onPick,
  excludeBookingId,
  allowCustom,
  now,
}: {
  inputs: SlotInputs;
  service: Service;
  staff: Staff[];
  staffId: string;
  onStaff: (id: string) => void;
  date: CivilDate;
  onDate: (d: CivilDate) => void;
  today: CivilDate;
  selected: number | null;
  onPick: (start: number) => void;
  excludeBookingId?: string;
  allowCustom?: boolean;
  now: number;
}) {
  const [mode, setMode] = useState<'slots' | 'custom'>('slots');
  const [customTime, setCustomTime] = useState('10:00');
  // The business can book any time: no minimum notice, a long window.
  const adminInputs = useMemo<SlotInputs>(() => ({ ...inputs, settings: { ...inputs.settings, minNoticeMin: 0, maxAdvanceDays: 365, maxBookingsPerDay: null } }), [inputs]);
  const eligible = staff.filter((s) => s.active && service.staffIds.includes(s.id));
  const slots = getSlots(adminInputs, { date, service, staffId, now, excludeBookingId });
  const customStart = zonedToUtc(date, customTime, inputs.tz);
  const overlaps = mode === 'custom' ? findOverlaps(adminInputs, staffId, customStart, customStart + (service.durationMin + (service.bufferAfterMin ?? inputs.settings.defaultBufferMin)) * 60_000, now, excludeBookingId) : [];
  const closed = (d: CivilDate) => !!businessClosure(inputs, d) || rangesFor(inputs, staffId, d).ranges.length === 0;

  useEffect(() => {
    if (mode === 'custom') onPick(customStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, customStart]);

  return (
    <div className="flex flex-col gap-5">
      {eligible.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {eligible.map((s) => (
            <button
              key={s.id}
              onClick={() => onStaff(s.id)}
              className={cn('press flex shrink-0 items-center gap-2 rounded-full border py-1 ps-1 pe-3.5 text-sm font-semibold', staffId === s.id ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}
            >
              <Avatar name={s.name} color={s.color} photo={s.photo} size={28} />
              {s.name}
            </button>
          ))}
        </div>
      )}
      <DateStrip start={addDays(today, -1)} days={45} value={date} onChange={onDate} isClosed={closed} />
      {allowCustom && (
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'slots', label: 'زمان‌های آزاد' },
            { value: 'custom', label: 'ساعت دلخواه' },
          ]}
          className="self-start"
          size="sm"
        />
      )}
      {mode === 'slots' ? (
        slots.length ? (
          <SlotGrid slots={slots} tz={inputs.tz} selected={selected} onSelect={(s) => onPick(s.start)} />
        ) : (
          <p className="rounded-theme bg-surface-2 p-4 text-center text-sm text-muted">در این روز زمان آزادی نیست{allowCustom ? '؛ می‌توانید «ساعت دلخواه» را انتخاب کنید.' : '.'}</p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <TimeSelect value={customTime} onChange={setCustomTime} from={6 * 60} to={23 * 60 + 45} />
          {overlaps.length > 0 && (
            <p className="flex items-start gap-2 rounded-theme bg-pending/12 p-3 text-[13px]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-pending" />
              با نوبت {overlaps.map((o) => o.customerName).join('، ')} هم‌پوشانی دارد. در صورت نیاز می‌توانید باز هم ثبت کنید.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function rangesLabel(r: TimeRange[]) {
  return r.map((x) => `${toFa(x.start)}–${toFa(x.end)}`).join('، ');
}
