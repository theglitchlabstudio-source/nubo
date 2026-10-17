import { Suspense, lazy } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Building2, Gauge, LogOut, Palette, Plus, ScrollText, Settings, LayoutTemplate } from 'lucide-react';
import { useUsers } from '@/data/hooks';
import { signOut, useSession } from '@/services/auth';
import { ThemeScope } from '@/theme/ThemeScope';
import { NuboMark } from '@/ui/Brand';
import { PinPanel } from '@/features/dashboard/Login';
import { Motif } from '@/theme/Motif';
import { usePalette } from '@/theme/ThemeScope';
import { cn } from '@/lib/cn';

const Overview = lazy(() => import('./Overview'));
const Tenants = lazy(() => import('./Tenants'));
const TenantDetail = lazy(() => import('./TenantDetail'));
const NewTenant = lazy(() => import('./NewTenant'));
const Themes = lazy(() => import('./Themes'));
const Templates = lazy(() => import('./Templates'));
const Audit = lazy(() => import('./Audit'));
const HubSettings = lazy(() => import('./HubSettings'));

const NAV = [
  { to: '/hub', label: 'نمای کلی', icon: Gauge, end: true },
  { to: '/hub/tenants', label: 'کسب‌وکارها', icon: Building2 },
  { to: '/hub/themes', label: 'هویت‌های بصری', icon: Palette },
  { to: '/hub/templates', label: 'قالب‌ها', icon: LayoutTemplate },
  { to: '/hub/audit', label: 'گزارش فعالیت', icon: ScrollText },
  { to: '/hub/settings', label: 'تنظیمات', icon: Settings },
];

export default function HubRoutes() {
  const actor = useSession('hub');
  const users = useUsers(null).data ?? [];
  return (
    <ThemeScope presetId="nubo" page>
      {!actor ? (
        <div className="grid min-h-dvh lg:grid-cols-2">
          <HubArt />
          <PinPanel title="هاب نوبو" subtitle="مدیریت همه کسب‌وکارها" users={users} scope="hub" tenantId={null} backTo="/" isDemo />
        </div>
      ) : (
        <HubShell name={actor.name}>
          <Suspense fallback={<div className="p-8" />}>
            <Routes>
              <Route index element={<Overview />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/new" element={<NewTenant />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="themes" element={<Themes />} />
              <Route path="templates" element={<Templates />} />
              <Route path="audit" element={<Audit />} />
              <Route path="settings" element={<HubSettings />} />
            </Routes>
          </Suspense>
        </HubShell>
      )}
    </ThemeScope>
  );
}

function HubArt() {
  const palette = usePalette();
  return (
    <div className="relative hidden overflow-hidden border-e border-line lg:block">
      <Motif palette={palette} seed="hub" className="absolute inset-0 size-full" />
    </div>
  );
}

function HubShell({ name, children }: { name: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line lg:flex">
        <div className="px-6 pt-7 pb-6">
          <Link to="/">
            <NuboMark size={26} />
          </Link>
          <div className="mt-1 text-[12px] font-semibold text-muted">هاب مدیریت</div>
        </div>
        <div className="px-4 pb-4">
          <Link to="/hub/tenants/new" className="press flex h-11 items-center justify-center gap-2 rounded-theme bg-accent font-bold text-accent-ink">
            <Plus size={18} /> کسب‌وکار جدید
          </Link>
        </div>
        <nav className="flex-1 px-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="press relative flex h-10 items-center gap-3 rounded-theme px-3 text-[14px]">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="hub-active" className="absolute inset-0 rounded-theme bg-surface-2" transition={{ type: 'spring', stiffness: 460, damping: 38 }} />}
                  <n.icon size={18} className={cn('relative', !isActive && 'text-muted')} />
                  <span className={cn('relative', isActive && 'font-bold')}>{n.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t border-line px-5 py-4 text-sm">
          <span className="flex-1 truncate font-semibold">{name}</span>
          <button onClick={() => signOut('hub')} aria-label="خروج" className="press grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line px-4 lg:hidden">
          <Link to="/">
            <NuboMark size={20} />
          </Link>
          <button onClick={() => signOut('hub')} aria-label="خروج" className="press grid size-10 place-items-center rounded-full text-muted">
            <LogOut size={18} />
          </button>
        </header>
        <main className="pb-[calc(96px+var(--safe-bottom))] lg:pb-10">{children}</main>
      </div>

      <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
          {[NAV[0], NAV[1], null, NAV[2], NAV[5]].map((n) =>
            n ? (
              <Link key={n.to} to={n.to} className="press relative flex flex-col items-center gap-0.5">
                {(n.end ? pathname === n.to : pathname.startsWith(n.to)) && <motion.span layoutId="hub-bn" className="absolute -top-2 h-[3px] w-8 rounded-full bg-accent" />}
                <n.icon size={21} className={(n.end ? pathname === n.to : pathname.startsWith(n.to)) ? '' : 'text-muted'} />
                <span className="text-[11px]">{n.label.split(' ')[0]}</span>
              </Link>
            ) : (
              <div key="new" className="flex justify-center">
                <Link to="/hub/tenants/new" aria-label="کسب‌وکار جدید" className="-mt-7 grid size-14 place-items-center rounded-full bg-accent text-accent-ink shadow-lg ring-4 ring-paper">
                  <Plus size={26} />
                </Link>
              </div>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}

export function HubHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-5 lg:px-10 lg:pt-10">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight lg:text-[30px]">{title}</h1>
        {subtitle && <div className="mt-1 text-muted">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}
