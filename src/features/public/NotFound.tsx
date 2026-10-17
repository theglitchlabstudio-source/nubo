import { NuboMark } from '@/ui/Brand';
import { ButtonLink } from '@/ui/primitives';

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper px-6 text-center">
      <div>
        <div className="numeral text-[120px] text-ink/10">۴۰۴</div>
        <h1 className="-mt-4 text-xl font-extrabold">این صفحه پیدا نشد</h1>
        <p className="mt-2 text-muted">آدرس را دوباره بررسی کنید.</p>
        <ButtonLink to="/" variant="ink" className="mt-8">
          صفحه اصلی <NuboMark size={15} className="text-paper" />
        </ButtonLink>
      </div>
    </div>
  );
}
