import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useLiveInvalidation, useSeed } from '@/data/hooks';
import { NuboMark } from '@/ui/Brand';

const Landing = lazy(() => import('@/features/landing/Landing'));
const PublicLayout = lazy(() => import('@/features/public/PublicLayout'));
const BusinessPage = lazy(() => import('@/features/public/BusinessPage'));
const BookingPage = lazy(() => import('@/features/public/BookingPage'));
const TrackingPage = lazy(() => import('@/features/public/TrackingPage'));
const DashboardRoutes = lazy(() => import('@/features/dashboard/DashboardRoutes'));
const HubRoutes = lazy(() => import('@/features/hub/HubRoutes'));
const NotFound = lazy(() => import('@/features/public/NotFound'));

export function App() {
  const seed = useSeed();
  useLiveInvalidation();
  useScrollTop();

  if (!seed.data) return <Splash />;

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/b/:slug/admin/*" element={<DashboardRoutes />} />
        <Route path="/b/:slug" element={<PublicLayout />}>
          <Route index element={<BusinessPage />} />
          <Route path="book" element={<BookingPage />} />
          <Route path="booking/:code" element={<TrackingPage />} />
        </Route>
        <Route path="/hub/*" element={<HubRoutes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function useScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper">
      <div className="flex flex-col items-center gap-5">
        <NuboMark size={30} />
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className="size-2.5 rounded-full bg-ink"
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
