import { Link } from 'react-router';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';
import { toFa } from '@/lib/digits';

/** Nubo wordmark: «نوبو» followed by an orange dot. */
export function NuboMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-baseline gap-1 font-extrabold tracking-tight', className)} style={{ fontSize: size }}>
      {BRAND.productFa}
      <span className="inline-block rounded-full bg-[#F2611D]" style={{ width: size * 0.32, height: size * 0.32 }} />
    </span>
  );
}

/** "Powered by GlitchLab Studio" — shown on every public page, on every plan (founder decision D5). */
export function PoweredBy({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-muted', className)}>
      <span>
        قدرت گرفته از <Link to="/" className="font-semibold text-ink">{BRAND.productFa}</Link>
      </span>
      <span className="opacity-40">·</span>
      <a href={BRAND.contactTel} className="font-semibold text-ink" dir="ltr">
        Powered by {BRAND.studio}
      </a>
      <span className="opacity-40">·</span>
      <a href={BRAND.contactTel} dir="ltr" className="tabular">
        {toFa(BRAND.contactDisplay)}
      </a>
    </div>
  );
}
