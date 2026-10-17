import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ImagePlus, Trash2, Lock, Sparkles } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useFileUrl } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { BrandingTheme, FileRef, Tenant, ThemeMode } from '@/domain/types';
import { PRESETS, ACCENT_CHOICES, presetById } from '@/theme/themes';
import { ThemeScope, usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { templateFor } from '@/seed/templates';
import { compressImage, IMAGE_SIZES } from '@/lib/image';
import { toEn } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { Button, Card, Field, Input, Segmented, Textarea } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

export default function Branding() {
  const { tenant, bundle, ctx, features, can } = useDash();
  const [b, setB] = useState<BrandingTheme>(bundle.branding);
  const [t, setT] = useState<Tenant>(tenant);
  const [busy, setBusy] = useState(false);
  const setP = (patch: Partial<Tenant['profile']>) => setT((x) => ({ ...x, profile: { ...x.profile, ...patch } }));
  const dirty = JSON.stringify(b) !== JSON.stringify(bundle.branding) || JSON.stringify(t) !== JSON.stringify(tenant);
  if (!can('branding.edit'))
    return (
      <Page className="pt-10">
        <p className="flex items-center gap-2 text-muted">
          <Lock size={16} /> فقط مدیر کسب‌وکار به این بخش دسترسی دارد.
        </p>
      </Page>
    );

  const save = async () => {
    setBusy(true);
    try {
      await data.branding.update(ctx, b);
      await data.tenants.update(ctx, { name: t.name.trim(), profile: t.profile });
      toast('ظاهر و اطلاعات ذخیره شد');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const preset = presetById(b.presetId);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="ظاهر و برند" subtitle="صفحه رزرو شما، با هویت خودتان" />
      <Page>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-10">
            {/* Identity */}
            <section>
              <h2 className="mb-3 text-lg font-extrabold">هویت بصری</h2>
              <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => setB({ ...b, presetId: p.id, accent: undefined, mode: undefined })} className="press w-36 shrink-0 text-start lg:w-auto">
                    <ThemeScope presetId={p.id} className={cn('relative aspect-[4/5] overflow-hidden rounded-theme-lg border-2', b.presetId === p.id ? 'border-ink' : 'border-transparent')}>
                      <PresetThumb seed={tenant.slug} />
                      {b.presetId === p.id && (
                        <motion.span layoutId="preset-check" className="absolute top-2 end-2 grid size-7 place-items-center rounded-full bg-ink text-paper">
                          <Check size={15} />
                        </motion.span>
                      )}
                    </ThemeScope>
                    <div className="mt-2 text-sm font-bold">
                      {p.name} <span className="font-normal text-muted" dir="ltr">· {p.latin}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-muted">{preset.description}</p>
            </section>

            <section className="grid gap-6 sm:grid-cols-2">
              <Field label="رنگ اصلی">
                <div className="flex flex-wrap items-center gap-2">
                  {[preset.accent, ...ACCENT_CHOICES.filter((c) => c.toLowerCase() !== preset.accent.toLowerCase())].map((c) => {
                    const on = (b.accent ?? preset.accent).toLowerCase() === c.toLowerCase();
                    return (
                      <button key={c} aria-label={c} onClick={() => setB({ ...b, accent: c === preset.accent ? undefined : c })} className={cn('press grid size-9 place-items-center rounded-full', on && 'ring-2 ring-ink ring-offset-2 ring-offset-paper')} style={{ background: c }}>
                        {on && <Check size={15} color="#fff" />}
                      </button>
                    );
                  })}
                  <label className="press relative grid size-9 cursor-pointer place-items-center rounded-full border border-dashed border-ink/40 text-lg" title="رنگ دلخواه">
                    +
                    <input type="color" value={b.accent ?? preset.accent} onChange={(e) => setB({ ...b, accent: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
                  </label>
                </div>
              </Field>
              <Field label="حالت">
                <Segmented
                  value={b.mode ?? preset.mode}
                  onChange={(v: ThemeMode) => setB({ ...b, mode: v === preset.mode ? undefined : v })}
                  options={[
                    { value: 'light', label: 'روشن' },
                    { value: 'dark', label: 'تیره' },
                  ]}
                />
              </Field>
            </section>

            {/* Images */}
            <section>
              <h2 className="mb-3 text-lg font-extrabold">تصاویر</h2>
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <ImageField label="لوگو" value={b.logo} size={IMAGE_SIZES.logo} round onChange={(logo) => setB({ ...b, logo })} />
                <ImageField label="تصویر جلد" hint="اگر خالی باشد، طرح هویت بصری نمایش داده می‌شود" value={b.cover} size={IMAGE_SIZES.cover} onChange={(cover) => setB({ ...b, cover })} />
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
                  گالری {!features.gallery && <span className="rounded-full border border-line px-1.5 text-[10px] font-bold">PRO</span>}
                </div>
                {features.gallery ? (
                  <Gallery value={b.gallery} onChange={(gallery) => setB({ ...b, gallery })} />
                ) : (
                  <Card className="flex items-center gap-3 p-4 text-sm text-muted">
                    <Sparkles size={18} className="text-accent" /> گالری تصاویر در پلن حرفه‌ای فعال است.
                  </Card>
                )}
              </div>
            </section>

            {/* Texts */}
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold">متن‌ها</h2>
              <Field label="نام کسب‌وکار">
                <Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
              </Field>
              <Field label="شعار کوتاه">
                <Input value={t.profile.tagline} onChange={(e) => setP({ tagline: e.target.value })} />
              </Field>
              <Field label="درباره ما">
                <Textarea value={t.profile.description} onChange={(e) => setP({ description: e.target.value })} rows={3} />
              </Field>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-extrabold">آدرس و ارتباط</h2>
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="آدرس">
                  <Input value={t.profile.address} onChange={(e) => setP({ address: e.target.value })} />
                </Field>
                <Field label="شهر">
                  <Input value={t.profile.city} onChange={(e) => setP({ city: e.target.value })} />
                </Field>
              </div>
              <Field label="موقعیت روی نقشه" hint="عرض و طول جغرافیایی؛ لینک نشان، بلد و گوگل خودکار ساخته می‌شود">
                <div className="grid grid-cols-2 gap-2">
                  <Input dir="ltr" placeholder="lat 35.71" value={t.profile.location.lat ?? ''} onChange={(e) => setP({ location: { ...t.profile.location, lat: Number(toEn(e.target.value)) || undefined } })} />
                  <Input dir="ltr" placeholder="lng 51.36" value={t.profile.location.lng ?? ''} onChange={(e) => setP({ location: { ...t.profile.location, lng: Number(toEn(e.target.value)) || undefined } })} />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                {(['neshan', 'balad', 'google'] as const).map((k) => (
                  <Field key={k} label={`لینک ${k === 'neshan' ? 'نشان' : k === 'balad' ? 'بلد' : 'گوگل مپ'} (اختیاری)`}>
                    <Input dir="ltr" value={t.profile.location.mapLinks[k] ?? ''} onChange={(e) => setP({ location: { ...t.profile.location, mapLinks: { ...t.profile.location.mapLinks, [k]: e.target.value || undefined } } })} />
                  </Field>
                ))}
              </div>
              <Field label="شماره‌های تماس" hint="با ویرگول جدا کنید">
                <Input dir="ltr" value={t.profile.phones.join(', ')} onChange={(e) => setP({ phones: toEn(e.target.value).split(/[,،]/).map((x) => x.trim()).filter(Boolean) })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ['instagram', 'اینستاگرام'],
                    ['telegram', 'تلگرام'],
                    ['whatsapp', 'واتساپ'],
                    ['bale', 'بله'],
                    ['eitaa', 'ایتا'],
                    ['website', 'وب‌سایت'],
                  ] as const
                ).map(([k, l]) => (
                  <Field key={k} label={l}>
                    <Input dir="ltr" value={t.profile.socials[k] ?? ''} onChange={(e) => setP({ socials: { ...t.profile.socials, [k]: e.target.value || undefined } })} />
                  </Field>
                ))}
              </div>
            </section>
          </div>

          {/* Live preview */}
          <aside className="order-first lg:order-none">
            <div className="lg:sticky lg:top-8">
              <div className="mb-2 text-[13px] font-semibold text-muted">پیش‌نمایش زنده</div>
              <ThemeScope presetId={b.presetId} overrides={b} className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[36px] border-[6px] border-ink/90 shadow-2xl">
                <Preview tenant={t} branding={b} />
              </ThemeScope>
            </div>
          </aside>
        </div>
        <div className={cn('sticky bottom-[calc(80px+var(--safe-bottom))] mt-8 transition-opacity lg:bottom-6', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
          <Button variant="primary" size="lg" block loading={busy} onClick={save}>
            ذخیره تغییرات
          </Button>
        </div>
      </Page>
    </div>
  );
}

function PresetThumb({ seed }: { seed: string }) {
  const palette = usePalette();
  return <Motif palette={palette} seed={seed} className="size-full" compact labels={templateFor(palette.preset.businessType ?? 'barbershop').artLabels} />;
}

function Preview({ tenant, branding }: { tenant: Tenant; branding: BrandingTheme }) {
  const palette = usePalette();
  const logo = useFileUrl(branding.logo);
  const cover = useFileUrl(branding.cover);
  return (
    <div className="bg-paper text-ink">
      <div className="relative h-44">
        {cover ? <img src={cover} alt="" className="size-full object-cover" /> : <Motif palette={palette} seed={tenant.slug} className="size-full" labels={templateFor(tenant.businessType).artLabels} />}
        <span className="absolute top-3 start-3 grid size-9 place-items-center overflow-hidden rounded-full bg-ink text-sm font-bold text-paper ring-2 ring-paper/70">
          {logo ? <img src={logo} alt="" className="size-full object-cover" /> : tenant.name.charAt(0)}
        </span>
      </div>
      <div className="-mt-4 rounded-t-[20px] bg-paper px-4 pt-4 pb-5">
        <div className="text-[18px] leading-7 font-extrabold">{tenant.name}</div>
        <div className="text-[12px] text-muted">{tenant.profile.tagline}</div>
        <div className="mt-3 flex items-center gap-2 rounded-theme bg-ink p-2.5 text-paper">
          <span className="size-6 rounded-full bg-accent" />
          <span className="text-[11px]">اولین نوبت آزاد · امروز ۱۷:۳۰</span>
        </div>
        {['خدمت اول', 'خدمت دوم'].map((x) => (
          <div key={x} className="flex justify-between border-b border-line py-2 text-[12px]">
            <span className="font-bold">{x}</span>
            <span className="text-muted">۲۵۰٬۰۰۰ تومان</span>
          </div>
        ))}
        <div className="mt-3 grid h-10 place-items-center rounded-theme bg-accent text-[13px] font-bold text-accent-ink">رزرو نوبت</div>
      </div>
    </div>
  );
}

function ImageField({ label, hint, value, size, round, onChange }: { label: string; hint?: string; value?: FileRef; size: number; round?: boolean; onChange: (v: FileRef | undefined) => void }) {
  const url = useFileUrl(value);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const upload = async (f: File) => {
    setBusy(true);
    try {
      const img = await compressImage(f, size);
      onChange(await data.files.put(img.blob, { width: img.width, height: img.height }));
    } catch {
      toast('بارگذاری تصویر ناموفق بود', 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-3">
        <button onClick={() => input.current?.click()} className={cn('press grid shrink-0 place-items-center overflow-hidden border border-dashed border-ink/30 bg-surface hover:bg-surface-2', round ? 'size-24 rounded-full' : 'h-24 flex-1 rounded-theme-lg')}>
          {url ? <img src={url} alt="" className="size-full object-cover" /> : busy ? '…' : <ImagePlus size={22} className="text-muted" />}
        </button>
        {value && (
          <button aria-label="حذف" onClick={() => onChange(undefined)} className="press grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2">
            <Trash2 size={17} />
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
    </Field>
  );
}

function Gallery({ value, onChange }: { value: FileRef[]; onChange: (v: FileRef[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const add = async (files: FileList) => {
    const refs: FileRef[] = [];
    for (const f of Array.from(files).slice(0, 12 - value.length)) {
      const img = await compressImage(f, IMAGE_SIZES.gallery);
      refs.push(await data.files.put(img.blob, { width: img.width, height: img.height }));
    }
    onChange([...value, ...refs]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {value.map((g) => (
        <GalleryItem key={g.id} id={g.id} onRemove={() => onChange(value.filter((x) => x.id !== g.id))} />
      ))}
      {value.length < 12 && (
        <button onClick={() => input.current?.click()} className="press grid size-24 place-items-center rounded-theme border border-dashed border-ink/30 text-muted hover:bg-surface-2">
          <ImagePlus size={20} />
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && add(e.target.files)} />
    </div>
  );
}

function GalleryItem({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = useFileUrl({ id });
  return (
    <div className="group relative size-24 overflow-hidden rounded-theme bg-surface-2">
      {url && <img src={url} alt="" className="size-full object-cover" />}
      <button aria-label="حذف" onClick={onRemove} className="absolute top-1 end-1 grid size-7 place-items-center rounded-full bg-black/60 text-white">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
