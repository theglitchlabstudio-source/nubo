// Bottom sheet on phones (drag down to close), centered panel on desktop.
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { usePalette } from '@/theme/ThemeScope';
import { paletteVars } from '@/theme/derive';
import { cn } from '@/lib/cn';
import { Button, IconButton } from './primitives';

export function useIsDesktop(query = '(min-width: 768px)') {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Sheet({ open, onClose, title, children, footer, size = 'md' }: SheetProps) {
  const desktop = useIsDesktop();
  const palette = usePalette();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Portals leave the themed subtree, so we re-apply the palette variables.
  const vars = paletteVars(palette) as CSSProperties;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" style={vars} dir="rtl" data-mode={palette.mode}>
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          {desktop ? (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <motion.div
                role="dialog"
                aria-modal="true"
                className={cn(
                  'pointer-events-auto flex max-h-[86vh] w-full flex-col overflow-hidden rounded-theme-lg border border-line bg-paper text-ink shadow-2xl',
                  size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
                )}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              >
                <SheetHeader title={title} onClose={onClose} />
                <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
                {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
              </motion.div>
            </div>
          ) : (
            <motion.div
              role="dialog"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[28px] bg-paper text-ink shadow-2xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 420, damping: 40 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 110 || info.velocity.y > 600) onClose();
              }}
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1.5 w-10 rounded-full bg-ink/15" />
              </div>
              <SheetHeader title={title} onClose={onClose} />
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5" onPointerDownCapture={(e) => e.stopPropagation()}>
                {children}
              </div>
              {footer && <div className="pb-safe border-t border-line px-5 pt-3 pb-3">{footer}</div>}
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function SheetHeader({ title, onClose }: { title?: ReactNode; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-3 md:px-6 md:pt-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <IconButton label="بستن" onClick={onClose} className="-me-2 size-10">
        <X size={20} />
      </IconButton>
    </div>
  );
}

/** Small confirm dialog, built on Sheet. */
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  text,
  confirmLabel = 'تایید',
  danger,
  loading,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  text?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant={danger ? 'danger' : 'primary'} size="lg" block onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" size="lg" onClick={onClose}>
            انصراف
          </Button>
        </div>
      }
    >
      {text && <p className="text-muted">{text}</p>}
      {children}
    </Sheet>
  );
}
