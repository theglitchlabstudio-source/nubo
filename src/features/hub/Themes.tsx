import { HubHeader } from './HubRoutes';
import { PRESETS } from '@/theme/themes';
import { ThemeScope, usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { BUSINESS_TYPE_LABEL } from '@/domain/features';
import { templateFor } from '@/seed/templates';

/** The shared library of visual identities (docs/DESIGN.md §3). */
export default function Themes() {
  return (
    <div className="mx-auto max-w-6xl">
      <HubHeader title="هویت‌های بصری" subtitle="کتابخانه مشترک همه کسب‌وکارها" />
      <div className="grid gap-5 px-5 sm:grid-cols-2 lg:grid-cols-3 lg:px-10">
        {PRESETS.map((p) => (
          <ThemeScope key={p.id} presetId={p.id} className="overflow-hidden rounded-theme-lg border border-line">
            <div className="aspect-[4/3]">
              <Art type={p.businessType!} />
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-extrabold">{p.name}</div>
                <div className="text-sm text-muted" dir="ltr">
                  {p.latin}
                </div>
              </div>
              <div className="text-[13px] text-muted">{p.businessType && BUSINESS_TYPE_LABEL[p.businessType]}</div>
              <p className="mt-2 text-[13px] leading-6">{p.description}</p>
              <div className="mt-3 flex items-center gap-1.5">
                {[p.light.paper, p.light.ink, p.accent, ...p.art.slice(0, 3)].map((c, i) => (
                  <span key={i} className="size-6 rounded-full border border-line" style={{ background: c }} />
                ))}
              </div>
              <div className="mt-4 grid h-10 place-items-center rounded-theme bg-accent text-sm font-bold text-accent-ink">رزرو نوبت</div>
            </div>
          </ThemeScope>
        ))}
      </div>
    </div>
  );
}

function Art({ type }: { type: Parameters<typeof templateFor>[0] }) {
  const palette = usePalette();
  return <Motif palette={palette} seed={type} labels={templateFor(type).artLabels} className="size-full" />;
}
