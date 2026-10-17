import { Suspense, lazy, useMemo } from 'react';
import { Route, Routes, useParams } from 'react-router';
import { useBundle, useTenant } from '@/data/hooks';
import { useSession } from '@/services/auth';
import { can, getFeatures } from '@/domain/features';
import { ThemeScope } from '@/theme/ThemeScope';
import NotFound from '@/features/public/NotFound';
import { DashContext, type DashState } from './context';
import { DashLayout } from './Layout';
import { Login } from './Login';
import { Splash } from '@/app/App';

const Today = lazy(() => import('./Today'));
const CalendarPage = lazy(() => import('./Calendar'));
const Customers = lazy(() => import('./Customers'));
const CustomerDetail = lazy(() => import('./CustomerDetail'));
const Services = lazy(() => import('./Services'));
const StaffPage = lazy(() => import('./Staff'));
const Availability = lazy(() => import('./Availability'));
const BookingRules = lazy(() => import('./BookingRules'));
const Branding = lazy(() => import('./Branding'));
const Share = lazy(() => import('./Share'));
const Stats = lazy(() => import('./Stats'));
const Outbox = lazy(() => import('./Outbox'));
const Chatbot = lazy(() => import('./Chatbot'));
const Plan = lazy(() => import('./Plan'));
const More = lazy(() => import('./More'));
const Users = lazy(() => import('./Users'));

export default function DashboardRoutes() {
  const { slug } = useParams();
  const bundleQ = useBundle(slug);
  const tenantQ = useTenant(bundleQ.data?.tenant.id);
  const actor = useSession(bundleQ.data?.tenant.id ?? '-');

  const state = useMemo<DashState | null>(() => {
    if (!bundleQ.data || !tenantQ.data || !actor) return null;
    const tenant = tenantQ.data;
    return {
      tenant,
      bundle: bundleQ.data,
      ctx: { tenantId: tenant.id, actor },
      actor,
      features: getFeatures(tenant),
      can: (a) => can(actor.role, a),
      base: `/b/${tenant.slug}/admin`,
    };
  }, [bundleQ.data, tenantQ.data, actor]);

  if (bundleQ.isLoading || (bundleQ.data && tenantQ.isLoading)) return <Splash />;
  if (!bundleQ.data) return <NotFound />;
  const branding = bundleQ.data.branding;
  // Dashboard = the tenant's palette in light form, so it feels like *their* tool and stays readable.
  const overrides = { accent: branding.accent, mode: 'light' as const };

  if (!state) {
    return (
      <ThemeScope presetId={branding.presetId} overrides={overrides} page>
        <Login bundle={bundleQ.data} />
      </ThemeScope>
    );
  }

  return (
    <ThemeScope presetId={branding.presetId} overrides={overrides} page>
      <DashContext.Provider value={state}>
        <DashLayout>
          <Suspense fallback={<div className="p-8" />}>
            <Routes>
              <Route index element={<Today />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="services" element={<Services />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="availability" element={<Availability />} />
              <Route path="settings/booking" element={<BookingRules />} />
              <Route path="settings/branding" element={<Branding />} />
              <Route path="settings/users" element={<Users />} />
              <Route path="share" element={<Share />} />
              <Route path="stats" element={<Stats />} />
              <Route path="notifications" element={<Outbox />} />
              <Route path="chatbot" element={<Chatbot />} />
              <Route path="plan" element={<Plan />} />
              <Route path="more" element={<More />} />
              <Route path="*" element={<Today />} />
            </Routes>
          </Suspense>
        </DashLayout>
      </DashContext.Provider>
    </ThemeScope>
  );
}
