// The Jalali dot calendar — inspired by the "less but better" reference.
// Past = faint hollow · available = ink dot · full = soft dot · closed = crossed hollow · selected = accent.
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { JALALI_MONTHS, WEEKDAYS_SHORT, jalaliMonthLength } from '@/lib/jalali';
import { type CivilDate, civilFromJalali, jalaliOf, weekdayOf } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import type { DayStatus } from '@/domain/slots';

export type DotDayStatus = DayStatus | 'holiday';

interface Props {
  today: CivilDate;
  selected: CivilDate | null;
  onSelect: (d: CivilDate) => void;
  statusOf: (d: CivilDate) => DotDayStatus;
  holidayTitle?: (d: CivilDate) => string | undefined;
  /** Hide the big numeral header (compact usage). */
  compact?: boolean;
}

export function DotCalendar({ today, selected, onSelect, statusOf, holidayTitle, compact }: Props) {
  const start = jalaliOf(selected ?? today);
  const [view, setView] = useState({ jy: start.jy, jm: start.jm });
  const [dir, setDir] = useState(0);
  const t = jalaliOf(today);

  const days = useMemo(() => {
    const len = jalaliMonthLength(view.jy, view.jm);
    const first = civilFromJalali(view.jy, view.jm, 1);
    const lead = weekdayOf(first);
    const cells: (CivilDate | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= len; d += 1) cells.push(civilFromJalali(view.jy, view.jm, d));
    return cells;
  }, [view]);

  const shift = (n: number) => {
    setDir(n);
    setView((v) => {
      let jm = v.jm + n;
      let jy = v.jy;
      if (jm > 12) {
        jm = 1;
        jy += 1;
      } else if (jm < 1) {
        jm = 12;
        jy -= 1;
      }
      return { jy, jm };
    });
  };
  const canPrev = view.jy > t.jy || (view.jy === t.jy && view.jm > t.jm);
  const sel = selected ? jalaliOf(selected) : null;
  const selTitle = selected ? holidayTitle?.(selected) : undefined;

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {!compact && (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={selected ?? 'none'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="numeral text-[64px] sm:text-[76px]"
              >
                {sel && sel.jm === view.jm && sel.jy === view.jy ? toFa(sel.jd) : <span className="text-ink/12">{toFa(t.jd)}</span>}
              </motion.div>
            </AnimatePresence>
          )}
          <div className={cn('font-bold', compact ? 'text-lg' : 'mt-2 text-xl')}>{JALALI_MONTHS[view.jm - 1]}</div>
          <div className="text-muted">{toFa(view.jy)}</div>
        </div>
        <div className="flex items-center gap-1 pb-1">
          <button aria-label="ماه قبل" disabled={!canPrev} onClick={() => shift(-1)} className="press grid size-11 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-25">
            <ChevronRight size={22} />
          </button>
          <button aria-label="ماه بعد" onClick={() => shift(1)} className="press grid size-11 place-items-center rounded-full hover:bg-surface-2">
            <ChevronLeft size={22} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-x-1.5 text-center sm:gap-x-3">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={d} className={cn('pb-2 text-[12px] font-semibold text-muted', i === 6 && 'text-accent')}>
            {d}
          </div>
        ))}
      </div>
      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={`${view.jy}-${view.jm}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 40 }}
            transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}
            className="grid grid-cols-7 gap-x-1.5 gap-y-2 sm:gap-x-3 sm:gap-y-3"
          >
            {days.map((d, i) => (d ? <DayDot key={d} date={d} today={today} selected={selected} status={statusOf(d)} onSelect={onSelect} /> : <span key={`e${i}`} />))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
        <Legend cls="bg-ink" label="آزاد" />
        <Legend cls="bg-ink/15" label="تکمیل" />
        <Legend cls="border border-ink/25" label="تعطیل" crossed />
        <Legend cls="bg-accent" label="انتخاب شما" />
      </div>
      {selTitle && <p className="mt-3 text-sm font-medium text-accent">{selTitle}</p>}
    </div>
  );
}

function Legend({ cls, label, crossed }: { cls: string; label: string; crossed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('relative size-3 rounded-full', cls)}>
        {crossed && <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-ink/40" />}
      </span>
      {label}
    </span>
  );
}

function DayDot({
  date,
  today,
  selected,
  status,
  onSelect,
}: {
  date: CivilDate;
  today: CivilDate;
  selected: CivilDate | null;
  status: DotDayStatus;
  onSelect: (d: CivilDate) => void;
}) {
  const isSel = date === selected;
  const isToday = date === today;
  const n = toFa(jalaliOf(date).jd);
  const clickable = status === 'available';
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => onSelect(date)}
      aria-label={`${n}${status === 'available' ? '' : status === 'full' ? ' (تکمیل)' : ' (غیرفعال)'}`}
      aria-pressed={isSel}
      className={cn('press relative mx-auto grid aspect-square w-full max-w-12 place-items-center rounded-full text-[15px] font-semibold tabular', !clickable && 'cursor-default active:scale-100')}
    >
      {/* base */}
      <span
        className={cn(
          'absolute inset-0 rounded-full transition-colors duration-200',
          status === 'available' && 'bg-ink',
          status === 'full' && 'bg-ink/12',
          (status === 'closed' || status === 'holiday') && 'border border-ink/20',
          (status === 'past' || status === 'out_of_range') && 'scale-[0.26] bg-ink/20',
        )}
      />
      {(status === 'closed' || status === 'holiday') && <span className="absolute top-1/2 left-[18%] h-px w-[64%] -rotate-45 bg-ink/25" />}
      {isSel && (
        <motion.span layoutId="day-sel" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />
      )}
      {isToday && !isSel && <span className="absolute -inset-[3px] rounded-full border-2 border-accent" />}
      <span
        className={cn(
          'relative',
          isSel ? 'text-accent-ink' : status === 'available' ? 'text-paper' : status === 'past' || status === 'out_of_range' ? 'text-transparent' : 'text-muted',
          status === 'holiday' && !isSel && 'text-accent/80',
        )}
      >
        {n}
      </span>
    </button>
  );
}
