import { motion } from 'motion/react';
import type { Slot } from '@/domain/slots';
import { fmtTime, minutesOfDay } from '@/lib/time';
import { cn } from '@/lib/cn';
import { Sun, Sunrise, Moon } from 'lucide-react';

const GROUPS = [
  { key: 'morning', label: 'صبح', icon: Sunrise, test: (m: number) => m < 12 * 60 },
  { key: 'noon', label: 'ظهر و بعدازظهر', icon: Sun, test: (m: number) => m >= 12 * 60 && m < 17 * 60 },
  { key: 'evening', label: 'عصر و شب', icon: Moon, test: (m: number) => m >= 17 * 60 },
];

export function SlotGrid({ slots, tz, selected, onSelect }: { slots: Slot[]; tz: string; selected: number | null; onSelect: (s: Slot) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((g) => {
        const list = slots.filter((s) => g.test(minutesOfDay(s.start, tz)));
        if (!list.length) return null;
        const Icon = g.icon;
        return (
          <section key={g.key}>
            <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Icon size={15} />
              {g.label}
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-3 gap-2 xs:grid-cols-4 lg:grid-cols-5">
              {list.map((s, i) => {
                const on = s.start === selected;
                return (
                  <motion.button
                    key={s.start}
                    type="button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.25), duration: 0.2 }}
                    onClick={() => onSelect(s)}
                    aria-pressed={on}
                    className={cn(
                      'press relative h-12 rounded-full border text-[15px] font-semibold tabular',
                      on ? 'border-transparent text-accent-ink' : 'border-line bg-surface hover:border-ink/40',
                    )}
                  >
                    {on && <motion.span layoutId="slot-sel" className="absolute inset-0 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
                    <span className="relative">{fmtTime(s.start, tz)}</span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
