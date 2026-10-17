import { type ReactNode, useEffect, useMemo } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
  CalendarDays,
  ChartNoAxesColumn,
  Clock3,
  ExternalLink,
  Gauge,
  LayoutGrid,
  LogOut,
  MessageSquareText,
  Palette,
  Plus,
  Scissors,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  UserRound,
  Users,
  BadgeCheck,
  KeyRound,
} from 'lucide-react';
import { useDash } from './context';
import { BookingSheet } from './BookingSheet';
import { NewBookingSheet } from './NewBookingSheet';
import { useBookingsAll, useFileUrl, useNotifications, useNow } from '@/data/hooks';
import { data } from '@/data';
import { effectiveStatus } from '@/domain/bookingMachine';
import { ROLE_LABEL } from '@/domain/features';
import { onChange } from '@/services/events';
import { signOut } from '@/services/auth';
import { toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { Avatar } from '@/ui/primitives';
import { NuboMark } from '@/ui/Brand';
import { toast } from '@/ui/Toast';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Sun;
  badge?: number;
  pro?: boolean;
}

export function DashLayout({ children }: { children: ReactNode }) {
  const { tenant, base, actor, ctx, bundle, can, features } = useDash();
  const bookings = useBookingsAll(ctx).data ?? [];
  const notifications = useNotifications(ctx).data ?? [];
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const logoUrl = useFileUrl(bundle.branding.logo);

  const pending = useMemo(() => bookings.filter((b) => effectiveStatus(b, now) === 'pending').length, [bookings, now]);
  const unread = notifications.filter((n) => !n.read && n.channel === 'in_app').length;

  // Live: a new online request (from the public page in another tab) shows up instantly.
  useEffect(
    () =>
      onChange(async (e) => {
        if (e.tenantId !== tenant.id || !e.newBookingId) return;
        try {
          const b = await data.bookings.get(ctx, e.newBookingId);
          toast(`${b.status === 'pending' ? 'درخواست جدید' : 'نوبت جدید'}: ${b.customerName} · ${b.serviceName}`, 'info');
        } catch {
          /* ignore */
        }
      }),
    [tenant.id, ctx],
  );

  const groups: { title?: string; items: NavItem[] }[] = [
    {
      items: [
        { to: base, label: 'امروز', icon: Sun, badge: pending },
        { to: `${base}/calendar`, label: 'تقویم', icon: CalendarDays },
        { to: `${base}/customers`, label: 'مشتریان', icon: Users },
      ],
    },
    {
      title: 'کسب‌وکار',
      items: [
        { to: `${base}/services`, label: 'خدمات', icon: Scissors },
        { to: `${base}/staff`, label: 'کارکنان', icon: UserRound },
        { to: `${base}/availability`, label: 'ساعت کاری و تعطیلات', icon: Clock3 },
        { to: `${base}/settings/booking`, label: 'قوانین نوبت‌دهی', icon: Settings2 },
        ...(can('branding.edit') ? [{ to: `${base}/settings/branding`, label: 'ظاهر و برند', icon: Palette }] : []),
      ],
    },
    {
      title: 'ابزارها',
      items: [
        { to: `${base}/share`, label: 'لینک و QR', icon: Share2 },
        { to: `${base}/stats`, label: 'آمار', icon: ChartNoAxesColumn },
        { to: `${base}/notifications`, label: 'پیام‌ها', icon: MessageSquareText, badge: unread },
        { to: `${base}/chatbot`, label: 'دستیار هوشمند', icon: Sparkles, pro: !features.chatbot },
        ...(can('staff.edit') ? [{ to: `${base}/settings/users`, label: 'کاربران و رمزها', icon: KeyRound }] : []),
        { to: `${base}/plan`, label: 'اشتراک', icon: BadgeCheck },
      ],
    },
  ];

  const openNew = () => {
    const next = new URLSearchParams(params);
    next.set('new', '1');
    setParams(next);
  };

  const logo = (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-accent font-extrabold text-accent-ink">
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : tenant.name.replace(/^(آرایشگاه|سالن زیبایی|مرکز|کلینیک|مطب|باشگاه|کلاس)\s*/, '').charAt(0)}
    </span>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      {actor.impersonatorName && (
        <div className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-center gap-2 bg-ink text-[13px] text-paper">
          <Gauge size={14} /> شما به‌عنوان «{tenant.name}» وارد شده‌اید
          <button
            className="ms-2 rounded-full bg-paper/15 px-3 py-0.5 font-semibold hover:bg-paper/25"
            onClick={() => {
              signOut(tenant.id);
              navigate('/hub');
            }}
          >
            بازگشت به هاب
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn('sticky top-0 hidden h-dvh flex-col border-e border-line bg-paper lg:flex', actor.impersonatorName && 'pt-9')}>
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          {logo}
          <div className="min-w-0">
            <div className="truncate font-extrabold">{tenant.name}</div>
            <a href={`${import.meta.env.BASE_URL}b/${tenant.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink">
              صفحه رزرو <ExternalLink size={11} />
            </a>
          </div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={openNew} className="press flex h-11 w-full items-center justify-center gap-2 rounded-theme bg-ink font-bold text-paper">
            <Plus size={18} /> نوبت جدید
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g, gi) => (
            <div key={gi} className="mb-4">
              {g.title && <div className="px-3 pb-1.5 text-[12px] font-semibold text-muted">{g.title}</div>}
              {g.items.map((it) => (
                <SideLink key={it.to} item={it} end={it.to === base} />
              ))}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-line px-4 py-3">
          <Avatar name={actor.name} color="var(--ink)" size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{actor.name}</div>
            <div className="text-[12px] text-muted">{ROLE_LABEL[actor.role]}</div>
          </div>
          <button aria-label="خروج" title="خروج" onClick={() => signOut(tenant.id)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink">
            <LogOut size={18} />
          </button>
        </div>
        <div className="px-5 pb-4">
          <Link to="/" className="opacity-60 hover:opacity-100">
            <NuboMark size={14} />
          </Link>
        </div>
      </aside>

      <div className={cn('min-w-0', actor.impersonatorName && 'pt-9')}>
        {/* Phone top bar */}
        <header className={cn('glass sticky z-30 flex h-14 items-center gap-3 border-b border-line px-4 lg:hidden', actor.impersonatorName ? 'top-9' : 'top-0')}>
          {logo}
          <div className="min-w-0 flex-1 truncate font-extrabold">{tenant.name}</div>
          <Link to={`${base}/notifications`} aria-label="پیام‌ها" className="press relative grid size-10 place-items-center rounded-full hover:bg-surface-2">
            <Bell size={20} />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-paper bg-accent" />}
          </Link>
        </header>

        <main className="pb-[calc(96px+var(--safe-bottom))] lg:pb-10">{children}</main>
      </div>

      <BottomNav base={base} pending={pending} onNew={openNew} />
      <BookingSheet />
      <NewBookingSheet />
    </div>
  );
}

function SideLink({ item, end }: { item: NavItem; end: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink to={item.to} end={end} className="press relative flex h-10 items-center gap-3 rounded-theme px-3 text-[14px] font-medium">
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="side-active" className="absolute inset-0 rounded-theme bg-surface-2" transition={{ type: 'spring', stiffness: 460, damping: 38 }} />}
          {isActive && <motion.span layoutId="side-bar" className="absolute top-2 bottom-2 start-0 w-[3px] rounded-full bg-accent" />}
          <Icon size={18} className={cn('relative', isActive ? 'text-ink' : 'text-muted')} />
          <span className={cn('relative flex-1', isActive ? 'font-bold' : 'text-ink/80')}>{item.label}</span>
          {!!item.badge && <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{toFa(item.badge)}</span>}
          {item.pro && <span className="relative rounded-full border border-line px-1.5 text-[10px] font-bold text-muted">PRO</span>}
        </>
      )}
    </NavLink>
  );
}

function BottomNav({ base, pending, onNew }: { base: string; pending: number; onNew: () => void }) {
  const { pathname } = useLocation();
  const items = [
    { to: base, label: 'امروز', icon: Sun, badge: pending, match: (p: string) => p === base || p === `${base}/` },
    { to: `${base}/calendar`, label: 'تقویم', icon: CalendarDays, match: (p: string) => p.startsWith(`${base}/calendar`) },
    null,
    { to: `${base}/customers`, label: 'مشتریان', icon: Users, match: (p: string) => p.startsWith(`${base}/customers`) },
    { to: `${base}/more`, label: 'بیشتر', icon: LayoutGrid, match: (p: string) => !['', '/calendar', '/customers'].some((s) => p === base + s || (s && p.startsWith(base + s))) && p !== `${base}/` },
  ];
  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {items.map((it) => {
          if (!it)
            return (
              <div key="new" className="flex justify-center">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onNew}
                  aria-label="نوبت جدید"
                  className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_24px_-8px_var(--accent)] ring-4 ring-paper"
                >
                  <Plus size={26} strokeWidth={2.4} />
                </motion.button>
              </div>
            );
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to} className="press relative flex flex-col items-center gap-0.5 py-1">
              {active && <motion.span layoutId="bn-active" className="absolute -top-px h-[3px] w-8 rounded-full bg-accent" transition={{ type: 'spring', stiffness: 460, damping: 36 }} />}
              <span className="relative">
                <Icon size={22} className={active ? 'text-ink' : 'text-muted'} strokeWidth={active ? 2.3 : 1.8} />
                {!!it.badge && (
                  <span className="absolute -top-1.5 -right-2.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink ring-2 ring-paper">
                    {toFa(it.badge)}
                  </span>
                )}
              </span>
              <span className={cn('text-[11px]', active ? 'font-bold text-ink' : 'text-muted')}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Page title block used by every dashboard screen. */
export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 lg:px-10 lg:pt-10', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold tracking-tight lg:text-[30px]">{title}</h1>
        {subtitle && <div className="mt-1 text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 lg:px-10', className)}>{children}</div>;
}
