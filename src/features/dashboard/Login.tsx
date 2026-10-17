import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, Delete } from 'lucide-react';
import type { TenantBundle } from '@/data/ports';
import { useUsers } from '@/data/hooks';
import { signInWithPin } from '@/services/auth';
import { errorMessage } from '@/data/errors';
import { ROLE_LABEL } from '@/domain/features';
import { DEMO_PINS } from '@/seed/demo';
import type { User } from '@/domain/types';
import { toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/primitives';
import { PoweredBy } from '@/ui/Brand';
import { usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';

/** Name + 4-digit PIN (founder decision D6). Also used by the Hub with tenantId = null. */
export function Login({ bundle }: { bundle: TenantBundle }) {
  const users = (useUsers(bundle.tenant.id).data ?? []).filter((u) => u.active);
  const palette = usePalette();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <Motif palette={palette} seed={bundle.tenant.slug} className="absolute inset-0 size-full" />
      </div>
      <PinPanel
        title={bundle.tenant.name}
        subtitle="ورود به داشبورد"
        users={users}
        scope={bundle.tenant.id}
        tenantId={bundle.tenant.id}
        backTo={`/b/${bundle.tenant.slug}`}
        isDemo={bundle.tenant.isDemo}
      />
    </div>
  );
}

export function PinPanel({
  title,
  subtitle,
  users,
  scope,
  tenantId,
  backTo,
  isDemo,
}: {
  title: string;
  subtitle: string;
  users: User[];
  scope: string;
  tenantId: string | null;
  backTo: string;
  isDemo?: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const selected = users.find((u) => u.id === userId) ?? (users.length === 1 ? users[0] : undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pin.length === 4 && selected && !busy) {
      setBusy(true);
      signInWithPin(scope, tenantId, selected.id, pin)
        .catch((e) => {
          setError(errorMessage(e));
          setShake((s) => s + 1);
          setPin('');
        })
        .finally(() => setBusy(false));
    }
  }, [pin, selected, scope, tenantId, busy]);

  const press = (d: string) => {
    setError('');
    setPin((p) => (p.length < 4 ? p + d : p));
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 py-6">
      <Link to={backTo} className="press -ms-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-muted">
        <ArrowRight size={18} /> بازگشت
      </Link>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
        <div className="text-[13px] font-semibold text-muted">{subtitle}</div>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">{title}</h1>

        {users.length > 1 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setUserId(u.id);
                  setPin('');
                  setError('');
                  inputRef.current?.focus();
                }}
                className={cn(
                  'press flex items-center gap-2.5 rounded-full border py-1.5 ps-1.5 pe-4 text-start',
                  selected?.id === u.id ? 'border-ink bg-ink text-paper' : 'border-line bg-surface',
                )}
              >
                <Avatar name={u.name} color={u.role === 'owner' ? 'var(--accent)' : u.role === 'super_admin' ? '#F2611D' : '#7BA88E'} size={34} />
                <span>
                  <span className="block text-sm font-bold leading-5">{u.name}</span>
                  <span className="block text-[11px] leading-4 opacity-60">{ROLE_LABEL[u.role]}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <motion.div key={shake} animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="mt-10 flex justify-center gap-4" dir="ltr">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              animate={{ scale: pin.length === i + 1 ? [1, 1.25, 1] : 1 }}
              className={cn('size-4 rounded-full transition-colors', i < pin.length ? 'bg-accent' : 'border-2 border-ink/20')}
            />
          ))}
        </motion.div>
        <p className={cn('mt-4 h-5 text-center text-sm', error ? 'text-danger' : 'text-muted')}>
          {error || (selected ? `رمز ۴ رقمی ${selected.name}` : 'اول نام خود را انتخاب کنید')}
        </p>
        <input
          ref={inputRef}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          className="sr-only"
          aria-label="رمز"
        />

        <div className="mt-6 grid grid-cols-3 gap-3" dir="ltr">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <Key key={d} onClick={() => press(d)} disabled={!selected}>
              {toFa(d)}
            </Key>
          ))}
          <span />
          <Key onClick={() => press('0')} disabled={!selected}>
            {toFa(0)}
          </Key>
          <Key onClick={() => setPin((p) => p.slice(0, -1))} disabled={!pin} aria-label="پاک کردن">
            <Delete size={22} />
          </Key>
        </div>

        {isDemo && selected && (
          <p className="mt-6 text-center text-[13px] text-muted">
            رمز دمو: <span className="font-bold text-ink tabular">{toFa(DEMO_PINS[selected.role])}</span>
          </p>
        )}
      </div>
      <PoweredBy />
    </div>
  );
}

function Key({ children, onClick, disabled, ...rest }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; 'aria-label'?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="press grid h-16 place-items-center rounded-theme-lg bg-surface text-2xl font-bold hover:bg-surface-2 disabled:opacity-35"
      {...rest}
    >
      {children}
    </button>
  );
}
