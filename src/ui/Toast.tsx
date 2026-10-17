import { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, AlertCircle, Bell } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  text: string;
  kind: Kind;
}

let items: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(text: string, kind: Kind = 'success') {
  const id = ++seq;
  items = [...items.slice(-2), { id, text, kind }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, kind === 'error' ? 4200 : 2800);
}

export function Toaster() {
  const list = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+var(--safe-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-8" dir="rtl">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full bg-[#141414] py-2.5 ps-3 pe-5 text-sm font-medium text-white shadow-xl"
            role="status"
          >
            <span className={`grid size-6 place-items-center rounded-full ${t.kind === 'error' ? 'bg-[#D64545]' : t.kind === 'info' ? 'bg-white/15' : 'bg-[#2F9E6A]'}`}>
              {t.kind === 'error' ? <AlertCircle size={14} /> : t.kind === 'info' ? <Bell size={13} /> : <Check size={14} />}
            </span>
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
