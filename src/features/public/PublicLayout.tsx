import { Outlet, useOutletContext, useParams } from 'react-router';
import { useBundle } from '@/data/hooks';
import type { TenantBundle } from '@/data/ports';
import { ThemeScope } from '@/theme/ThemeScope';
import { Skeleton } from '@/ui/primitives';
import { PoweredBy } from '@/ui/Brand';
import NotFound from './NotFound';

export function usePublic() {
  return useOutletContext<TenantBundle>();
}

export default function PublicLayout() {
  const { slug } = useParams();
  const q = useBundle(slug);

  if (q.isLoading) {
    return (
      <div className="min-h-dvh bg-paper p-5">
        <Skeleton className="h-[46svh] w-full" />
        <Skeleton className="mt-6 h-10 w-2/3" />
        <Skeleton className="mt-3 h-5 w-1/2" />
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    );
  }
  if (!q.data) return <NotFound />;
  const bundle = q.data;

  if (bundle.tenant.status === 'suspended') {
    return (
      <ThemeScope presetId={bundle.branding.presetId} overrides={bundle.branding} page>
        <div className="grid min-h-dvh place-items-center px-6 text-center">
          <div>
            <div className="mx-auto mb-6 flex justify-center gap-2">
              <span className="size-4 rounded-full bg-ink/20" />
              <span className="size-4 rounded-full bg-ink/20" />
              <span className="size-4 rounded-full border-2 border-accent" />
            </div>
            <h1 className="text-2xl font-extrabold">{bundle.tenant.name}</h1>
            <p className="mt-2 text-muted">نوبت‌دهی آنلاین موقتاً در دسترس نیست. لطفاً تلفنی تماس بگیرید.</p>
            <PoweredBy className="mt-10" />
          </div>
        </div>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope presetId={bundle.branding.presetId} overrides={bundle.branding} page>
      <Outlet context={bundle} />
    </ThemeScope>
  );
}
