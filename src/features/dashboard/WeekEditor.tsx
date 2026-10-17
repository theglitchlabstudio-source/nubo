import { Plus, X, Copy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { TimeRange, WorkingHours } from '@/domain/types';
import { WEEKDAYS } from '@/lib/jalali';
import { hhmmToMinutes, minutesToHHmm } from '@/lib/time';
import { cn } from '@/lib/cn';
import { Switch } from '@/ui/primitives';
import { TimeSelect } from './shared';

export type Week = TimeRange[][];

export function weekFromRows(rows: WorkingHours[], staffId: string | null): Week {
  return Array.from({ length: 7 }, (_, wd) => rows.find((r) => r.staffId === staffId && r.weekday === wd)?.ranges ?? []);
}

export function rowsFromWeek(week: Week, tenantId: string, staffId: string | null): WorkingHours[] {
  return week.map((ranges, weekday) => ({ id: `${tenantId}-${staffId ?? 'biz'}-wh${weekday}`, tenantId, staffId, weekday, ranges }));
}

export function validWeek(week: Week): boolean {
  return week.every((rs) => rs.every((r) => hhmmToMinutes(r.end) > hhmmToMinutes(r.start)));
}

/**
 * Weekly hours with split shifts. Gaps between ranges are breaks:
 * "add break" splits the last range in two.
 */
export function WeekEditor({ value, onChange }: { value: Week; onChange: (w: Week) => void }) {
  const setDay = (wd: number, ranges: TimeRange[]) => onChange(value.map((r, i) => (i === wd ? ranges : r)));

  const addRange = (wd: number) => {
    const rs = value[wd];
    if (!rs.length) return setDay(wd, [{ start: '09:00', end: '17:00' }]);
    const last = rs[rs.length - 1];
    const s = hhmmToMinutes(last.start);
    const e = hhmmToMinutes(last.end);
    if (e - s >= 180) {
      // Split the last range around its middle with a one-hour break.
      const mid = Math.round((s + e) / 2 / 30) * 30;
      setDay(wd, [...rs.slice(0, -1), { start: last.start, end: minutesToHHmm(mid - 30) }, { start: minutesToHHmm(mid + 30), end: last.end }]);
    } else {
      setDay(wd, [...rs, { start: minutesToHHmm(Math.min(e + 60, 22 * 60)), end: minutesToHHmm(Math.min(e + 240, 23 * 60 + 45)) }]);
    }
  };

  const copyToAll = (wd: number) => onChange(value.map((r, i) => (i === 6 && !r.length ? r : i === wd ? r : value[wd].map((x) => ({ ...x })))));

  return (
    <div className="divide-y divide-line">
      {value.map((ranges, wd) => {
        const open = ranges.length > 0;
        return (
          <div key={wd} className="py-3">
            <div className="flex items-center gap-3">
              <span className={cn('w-20 font-bold', !open && 'text-muted')}>{WEEKDAYS[wd]}</span>
              <div className="flex-1">{!open && <span className="text-sm text-muted">تعطیل</span>}</div>
              {open && (
                <button onClick={() => copyToAll(wd)} className="press hidden h-9 items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-muted hover:bg-surface-2 sm:inline-flex" title="کپی برای روزهای دیگر">
                  <Copy size={13} /> کپی برای همه
                </button>
              )}
              <div className="w-14">
                <Switch checked={open} onChange={(v) => setDay(wd, v ? [{ start: '09:00', end: '17:00' }] : [])} />
              </div>
            </div>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="flex flex-col gap-2 pt-3">
                    {ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex-1">
                          <TimeSelect value={r.start} onChange={(v) => setDay(wd, ranges.map((x, k) => (k === i ? { ...x, start: v } : x)))} />
                        </div>
                        <span className="text-muted">تا</span>
                        <div className="flex-1">
                          <TimeSelect value={r.end} onChange={(v) => setDay(wd, ranges.map((x, k) => (k === i ? { ...x, end: v } : x)))} />
                        </div>
                        <button aria-label="حذف بازه" onClick={() => setDay(wd, ranges.filter((_, k) => k !== i))} className="press grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2">
                          <X size={17} />
                        </button>
                      </div>
                    ))}
                    {ranges.some((r) => hhmmToMinutes(r.end) <= hhmmToMinutes(r.start)) && <p className="text-[12px] text-danger">ساعت پایان باید بعد از شروع باشد.</p>}
                    <button onClick={() => addRange(wd)} className="press inline-flex h-9 w-fit items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-muted hover:bg-surface-2">
                      <Plus size={15} /> {ranges.length === 1 ? 'افزودن استراحت / شیفت دوم' : 'افزودن بازه'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
