// Create a business from a template in about three minutes, on-site with the client.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { ArrowRight, Check, Copy, ExternalLink, LogIn } from 'lucide-react';
import { HubHeader } from './HubRoutes';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { impersonate } from '@/services/auth';
import { BUSINESS_TYPE_LABEL, PLANS } from '@/domain/features';
import type { BusinessType, PlanId, Tenant } from '@/domain/types';
import { TEMPLATES } from '@/seed/templates';
import { PRESETS, presetById } from '@/theme/themes';
import { ThemeScope, usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { fmtDuration } from '@/lib/time';
import { toEn, toFa } from '@/lib/digits';
import { isValidMobile, isValidSlug, slugify } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Button, Field, Input, Segmented } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

const STEPS = ['قالب', 'اطلاعات', 'ظاهر', 'تمام'];

export default function NewTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<BusinessType>('barbershop');
  const tpl = TEMPLATES.find((t) => t.type === type)!;
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactName, setContactName] = useState('');
  const [mobile, setMobile] = useState('');
  const [plan, setPlan] = useState<PlanId>('basic');
  const [days, setDays] = useState(30);
  const [pin, setPin] = useState('');
  const [presetId, setPresetId] = useState(tpl.presetId);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Tenant | null>(null);

  const autoSlug = useMemo(() => slugify(name), [name]);
  const finalSlug = slugTouched ? slug : autoSlug;
  const infoValid = name.trim().length > 1 && isValidSlug(finalSlug) && contactName.trim().length > 1 && isValidMobile(mobile) && /^\d{4}$/.test(toEn(pin));

  const create = async () => {
    setBusy(true);
    try {
      const t = await data.tenants.create({
        name: name.trim(),
        slug: finalSlug,
        businessType: type,
        planId: plan,
        contact: { name: contactName.trim(), mobile },
        subscriptionDays: days,
        presetId,
        ownerName: contactName.trim(),
        ownerPin: toEn(pin),
      });
      setCreated(t);
      setStep(3);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <HubHeader title="کسب‌وکار جدید" subtitle="از روی قالب، در چند دقیقه" />
      <div className="px-5 lg:px-10">
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold', i < step ? 'bg-ink text-paper' : i === step ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted')}>
                {i < step ? <Check size={14} /> : toFa(i + 1)}
              </span>
              <span className={cn('hidden text-sm font-semibold sm:inline', i > step && 'text-muted')}>{s}</span>
              {i < STEPS.length - 1 && <span className={cn('h-px flex-1', i < step ? 'bg-ink' : 'bg-line')} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.22 }}>
            {step === 0 && (
              <div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => {
                        setType(t.type);
                        setPresetId(t.presetId);
                      }}
                      className={cn('press overflow-hidden rounded-theme-lg border-2 text-start', type === t.type ? 'border-ink' : 'border-line')}
                    >
                      <ThemeScope presetId={t.presetId} className="aspect-[16/9]">
                        <Art seed={t.type} />
                      </ThemeScope>
                      <div className="bg-surface p-3">
                        <div className="font-bold">{BUSINESS_TYPE_LABEL[t.type]}</div>
                        <div className="text-[12px] text-muted">
                          {toFa(t.services.length)} خدمت · هویت {presetById(t.presetId).name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-theme-lg border border-line bg-surface p-4">
                  <div className="text-[13px] font-semibold text-muted">خدمات آماده این قالب</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tpl.services.map((s) => (
                      <span key={s.name} className="rounded-full bg-surface-2 px-3 py-1 text-[13px]">
                        {s.name} · {fmtDuration(s.durationMin)}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="primary" size="lg" className="mt-6" onClick={() => setStep(1)}>
                  ادامه
                </Button>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام کسب‌وکار" className="sm:col-span-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`مثلاً ${tpl.type === 'barbershop' ? 'آرایشگاه پارسا' : 'کلینیک نور'}`} autoFocus />
                </Field>
                <Field label="آدرس صفحه" hint={`nubo/b/${finalSlug || '…'}`} error={finalSlug && !isValidSlug(finalSlug) && 'فقط حروف انگلیسی کوچک، عدد و خط تیره'} className="sm:col-span-2">
                  <Input
                    dir="ltr"
                    value={finalSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                  />
                </Field>
                <Field label="نام مدیر / رابط">
                  <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                </Field>
                <Field label="موبایل مدیر">
                  <Input dir="ltr" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xx xxx xxxx" />
                </Field>
                <Field label="رمز ۴ رقمی مدیر" hint="برای ورود به داشبورد">
                  <Input dir="ltr" inputMode="numeric" value={pin} onChange={(e) => setPin(toEn(e.target.value).replace(/\D/g, '').slice(0, 4))} className="text-center tracking-[0.5em]" />
                </Field>
                <Field label="پلن">
                  <Segmented
                    value={plan}
                    onChange={setPlan}
                    options={[
                      { value: 'basic', label: PLANS.basic.name },
                      { value: 'pro', label: PLANS.pro.name },
                    ]}
                  />
                </Field>
                <Field label="مدت اشتراک">
                  <Segmented
                    value={String(days)}
                    onChange={(v) => setDays(Number(v))}
                    size="sm"
                    options={[
                      { value: '14', label: '۱۴ روز آزمایشی' },
                      { value: '30', label: '۱ ماه' },
                      { value: '90', label: '۳ ماه' },
                      { value: '365', label: '۱ سال' },
                    ]}
                  />
                </Field>
                <div className="flex gap-2 sm:col-span-2">
                  <Button size="lg" icon={<ArrowRight size={17} />} onClick={() => setStep(0)}>
                    قبلی
                  </Button>
                  <Button variant="primary" size="lg" disabled={!infoValid} onClick={() => setStep(2)}>
                    ادامه
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PRESETS.map((p) => (
                    <button key={p.id} onClick={() => setPresetId(p.id)} className="press text-start">
                      <ThemeScope presetId={p.id} className={cn('aspect-square overflow-hidden rounded-theme-lg border-2', presetId === p.id ? 'border-ink' : 'border-transparent')}>
                        <Art seed={finalSlug || p.id} />
                      </ThemeScope>
                      <div className="mt-1.5 text-sm font-bold">{p.name}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted">لوگو و تصاویر را بعداً از داشبورد کسب‌وکار اضافه کنید.</p>
                <div className="mt-6 flex gap-2">
                  <Button size="lg" icon={<ArrowRight size={17} />} onClick={() => setStep(1)}>
                    قبلی
                  </Button>
                  <Button variant="primary" size="lg" loading={busy} onClick={create}>
                    ساخت کسب‌وکار
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && created && <Done tenant={created} onOpen={() => {
              impersonate(created.id);
              navigate(`/b/${created.slug}/admin`);
            }} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Art({ seed }: { seed: string }) {
  const palette = usePalette();
  return <Motif palette={palette} seed={seed} compact className="size-full" />;
}

function Done({ tenant, onOpen }: { tenant: Tenant; onOpen: () => void }) {
  const url = `${location.origin}${import.meta.env.BASE_URL}b/${tenant.slug}`;
  const [qr, setQr] = useState('');
  useMemo(() => {
    QRCode.toDataURL(url, { margin: 1, width: 400 }).then(setQr);
  }, [url]);
  return (
    <div className="flex flex-col items-center text-center">
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="grid size-20 place-items-center rounded-full bg-accent text-accent-ink">
        <Check size={36} />
      </motion.span>
      <h2 className="mt-5 text-2xl font-extrabold">{tenant.name} آماده است</h2>
      <p className="mt-1 text-muted">لینک یا QR را همین حالا به صاحب کسب‌وکار نشان دهید.</p>
      {qr && <img src={qr} alt="QR" className="mt-6 size-44 rounded-theme bg-white p-2" />}
      <div className="mono mt-4 max-w-full truncate rounded-theme bg-surface-2 px-4 py-2 text-sm" dir="ltr">
        {url}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          icon={<Copy size={16} />}
          onClick={async () => {
            await navigator.clipboard.writeText(url).catch(() => undefined);
            toast('لینک کپی شد');
          }}
        >
          کپی لینک
        </Button>
        <a href={url} target="_blank" rel="noreferrer" className="press inline-flex h-11 items-center gap-2 rounded-theme border border-line bg-surface px-5 font-semibold">
          <ExternalLink size={16} /> صفحه رزرو
        </a>
        <Button variant="ink" icon={<LogIn size={16} />} onClick={onOpen}>
          تنظیم داشبورد
        </Button>
      </div>
    </div>
  );
}
