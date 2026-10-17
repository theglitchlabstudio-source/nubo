import { Navigate, useLocation } from 'react-router';
import { BookingFlow } from './BookingFlow';
import { usePublic } from './PublicLayout';
import { useIsDesktop } from '@/ui/Sheet';

/** Phones: full-screen wizard. Desktop: the wizard lives in the business page's sticky panel. */
export default function BookingPage() {
  const desktop = useIsDesktop('(min-width: 1024px)');
  const { tenant } = usePublic();
  const { search } = useLocation();
  if (desktop) return <Navigate to={`/b/${tenant.slug}${search}#book`} replace />;
  return <BookingFlow />;
}
