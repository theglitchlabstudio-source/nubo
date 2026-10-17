import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
  useId,
} from 'react';
import { motion } from 'motion/react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { STATUS_COLOR, STATUS_LABEL } from '@/domain/bookingMachine';
import type { BookingStatus } from '@/domain/types';
import { useFileUrl } from '@/data/hooks';
import type { FileRef } from '@/domain/types';

// ---------- Button ----------

type Variant = 'primary' | 'ink' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-[1.06]',
  ink: 'bg-ink text-paper hover:opacity-90',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'text-danger bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-danger)_16%,transparent)]',
  soft: 'bg-accent-soft text-ink hover:brightness-[0.98]',
};
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-[52px] px-6 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, block, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'press inline-flex select-none items-center justify-center rounded-theme font-semibold whitespace-nowrap disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  className,
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; block?: boolean; icon?: ReactNode }) {
  return (
    <Link
      className={cn(
        'press inline-flex select-none items-center justify-center rounded-theme font-semibold whitespace-nowrap',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </Link>
  );
}

export function IconButton({ className, label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn('press grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-surface-2', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label="در حال بارگذاری">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-current"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

// ---------- Form fields ----------

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | false;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-muted">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-[13px] text-danger">{error}</p> : hint ? <p className="text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

const inputBase =
  'w-full rounded-theme border border-line bg-surface px-4 text-ink placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(inputBase, 'h-12', invalid && 'border-danger', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={cn(inputBase, 'min-h-24 py-3 leading-7', className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, 'h-12 appearance-none pe-10', className)} {...rest}>
        {children}
      </select>
      <svg className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-center gap-4 py-1', disabled && 'opacity-50')}>
      <span className="min-w-0 flex-1">
        {label && <span className="block font-medium">{label}</span>}
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200', checked ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line ring-inset')}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className={cn('absolute top-1 size-5 rounded-full shadow-sm', checked ? 'start-6 bg-white' : 'start-1 bg-ink/70')}
        />
      </button>
    </label>
  );
}

/** Segmented control with a gliding indicator. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  return (
    <div className={cn('inline-flex rounded-full bg-surface-2 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'relative flex-1 rounded-full px-4 font-medium whitespace-nowrap transition-colors duration-200',
            size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm',
            value === o.value ? 'text-paper' : 'text-muted hover:text-ink',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- Display ----------

export function Dot({ color, size = 8, className }: { color: string; size?: number; className?: string }) {
  return <span className={cn('inline-block shrink-0 rounded-full', className)} style={{ width: size, height: size, background: color }} />;
}

export function StatusPill({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap', className)}>
      <Dot color={STATUS_COLOR[status]} size={7} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Avatar({ name, color, photo, size = 40, className }: { name: string; color: string; photo?: FileRef; size?: number; className?: string }) {
  const url = useFileUrl(photo);
  const letter = name.replace(/^(دکتر|استاد|مربی)\s+/, '').trim().charAt(0);
  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-white', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : letter}
    </span>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-theme-lg border border-line bg-surface', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[17px] font-bold">{children}</h2>
      {action}
    </div>
  );
}

/** Small poster-style column label, like the "y d m" header in the Braun poster. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('text-[12px] font-semibold tracking-wide text-muted', className)}>{children}</div>;
}

export function EmptyState({ title, text, action, className }: { title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-10 text-center', className)}>
      <div className="mb-5 flex items-end gap-2" aria-hidden="true">
        <span className="size-3 rounded-full bg-ink/15" />
        <span className="size-5 rounded-full bg-ink/25" />
        <span className="size-8 rounded-full bg-accent" />
        <span className="size-5 rounded-full border-2 border-ink/20" />
      </div>
      <p className="font-bold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function Stat({ label, value, sub, className }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col', className)}>
      <Label>{label}</Label>
      <div className="numeral mt-2 text-[34px]">{value}</div>
      {sub && <div className="mt-1.5 text-[13px] text-muted">{sub}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}

/** Row in a settings/list card. */
export function Row({ children, className, onClick, to }: { children: ReactNode; className?: string; onClick?: () => void; to?: string }) {
  const cls = cn('flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start', (onClick || to) && 'press hover:bg-surface-2', className);
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}
