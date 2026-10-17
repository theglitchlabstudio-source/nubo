import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarCheck, KeyRound, QrCode, ShieldCheck, Sparkles, LayoutDashboard, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTenants } from '@/data/hooks';
import { data } from '@/data';
import { ThemeScope, usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { presetById } from '@/theme/themes';
import { BUSINESS_TYPE_LABEL } from '@/domain/features';
import { templateFor } from '@/seed/templates';
import { DEMO_PINS } from '@/seed/demo';
import { BRAND } from '@/config/brand';
import { toFa } from '@/lib/digits';
import type { Tenant } from '@/domain/types';
import { NuboMark } from '@/ui/Brand';
import { Button, ButtonLink } from '@/ui/primitives';
import { Confirm } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

const ORDER = ['barbershop', 'beauty_salon', 'psychology', 'dental', 'clinic', 'gym', 'tutor'];

export default function Landing() {
  const tenants = useTenants().data ?? [];
  const demos = tenants.filter((t) => t.isDemo).sort((a, b) => ORDER.indexOf(a.businessType) - ORDER.indexOf(b.businessType));
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <ThemeScope presetId="nubo" page>
      <div className="relative overflow-hidden">
        {/* Header */}
        <header className="glass sticky top-0 z-20 border-b border-line">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
            <NuboMark size={24} />
            <ButtonLink to="/hub" variant="ink" size="sm" icon={<LayoutDashboard size={15} />}>
              ورود به هاب
            </ButtonLink>
          </div>
        </header>

        {/* Hero */}
        <section className="relative">
          <div className="grid-paper pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pt-12 pb-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-8 lg:pt-20 lg:pb-24">
            <div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                <span className="size-2 rounded-full bg-accent" /> {BRAND.studio}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="mt-5 text-[44px] leading-[1.08] font-extrabold tracking-tight text-balance sm:text-[64px]"
              >
                نوبت‌دهی آنلاین،
                <br />
                <span className="text-accent">کمتر</span> ولی بهتر.
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-5 max-w-md text-lg leading-8 text-muted">
                یک صفحه رزرو زیبا با برند خود کسب‌وکار، تقویم شمسی و داشبوردی ساده برای منشی؛ برای آرایشگاه، سالن زیبایی، مطب، کلینیک، باشگاه و معلم خصوصی.
              </motion.p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }} className="mt-8 flex flex-wrap gap-3">
                <a href="#demos" className="press inline-flex h-[52px] items-center gap-2 rounded-theme bg-accent px-6 font-bold text-accent-ink">
                  دیدن نمونه‌ها <ArrowLeft size={18} />
                </a>
                <ButtonLink to="/b/arash-barber" size="lg" variant="secondary">
                  یک رزرو امتحانی
                </ButtonLink>
              </motion.div>
            </div>
            <HeroArt />
          </div>
        </section>

        {/* Seven identities */}
        <section id="demos" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20 lg:px-8">
          <div className="mb-8 flex items-end justify-between gap-6 border-b border-line pb-5">
            <div>
              <div className="text-[13px] font-semibold text-muted">۰۱ — نمونه‌های زنده</div>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">هفت کسب‌وکار، هفت هویت</h2>
            </div>
            <span className="numeral hidden text-[72px] text-ink/10 sm:block">{toFa(7)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((t, i) => (
              <DemoCard key={t.id} tenant={t} index={i} />
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <div className="text-[13px] font-semibold text-muted">۰۲ — چرا نوبو</div>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CalendarCheck, t: 'تقویم شمسی و تعطیلات رسمی', d: 'تعطیلات رسمی خودکار بسته می‌شود؛ صاحب کسب‌وکار هر روز را می‌تواند باز کند.' },
                { icon: ShieldCheck, t: 'تایید دستی، خودکار یا هوشمند', d: 'هر کسب‌وکار انتخاب می‌کند چقدر کنترل می‌خواهد. دلیل هر تصمیم نمایش داده می‌شود.' },
                { icon: QrCode, t: 'لینک، QR و اینستاگرام', d: 'QR آماده چاپ برای پیشخوان و لینک مخصوص بیو اینستاگرام.' },
                { icon: Sparkles, t: 'برند خود کسب‌وکار', d: 'لوگو، رنگ و طرح جلد؛ هر صفحه رزرو مثل یک محصول اختصاصی است.' },
              ].map((f, i) => (
                <motion.div key={f.t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <f.icon size={26} strokeWidth={1.6} />
                  <h3 className="mt-4 text-lg font-bold">{f.t}</h3>
                  <p className="mt-2 leading-7 text-muted">{f.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo access */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 rounded-theme-lg bg-ink p-6 text-paper sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold opacity-60">
                <KeyRound size={15} /> ۰۳ — دسترسی دمو
              </div>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">رمزهای ورود نسخه نمایشی</h2>
              <p className="mt-2 max-w-lg leading-7 opacity-70">داده‌ها فقط در همین مرورگر ذخیره می‌شوند. هر زمان بخواهید می‌توانید همه‌چیز را به حالت اول برگردانید.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { l: 'مدیر کسب‌وکار', p: DEMO_PINS.owner },
                { l: 'منشی', p: DEMO_PINS.secretary },
                { l: 'هاب (مدیر کل)', p: DEMO_PINS.super_admin },
              ].map((x) => (
                <div key={x.l} className="rounded-theme border border-paper/15 px-3 py-4">
                  <div className="numeral text-3xl tracking-[0.2em]">{toFa(x.p)}</div>
                  <div className="mt-2 text-[12px] opacity-60">{x.l}</div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2">
              <Button variant="ghost" className="text-paper hover:bg-paper/10" icon={<RotateCcw size={16} />} onClick={() => setResetOpen(true)}>
                بازنشانی داده‌های دمو
              </Button>
            </div>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted lg:px-8">
            <NuboMark size={18} className="text-ink" />
            <span>
              ساخته‌شده در{' '}
              <a href={BRAND.contactTel} className="font-semibold text-ink" dir="ltr">
                {BRAND.studio}
              </a>{' '}
              · <a href={BRAND.contactTel} dir="ltr">{toFa(BRAND.contactDisplay)}</a>
            </span>
          </div>
        </footer>
      </div>

      <Confirm
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="بازنشانی داده‌های دمو؟"
        text="همه نوبت‌ها و تغییرات کسب‌وکارهای نمونه پاک و دوباره ساخته می‌شوند. کسب‌وکارهایی که خودتان ساخته‌اید دست نمی‌خورند."
        confirmLabel="بازنشانی"
        danger
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          await data.admin.resetDemo();
          setBusy(false);
          setResetOpen(false);
          toast('داده‌های دمو بازنشانی شد');
        }}
      />
    </ThemeScope>
  );
}

function HeroArt() {
  const palette = usePalette();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="relative mx-auto aspect-square w-full max-w-[480px]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-theme-lg border border-line bg-surface">
        <Motif palette={palette} seed="nubo-hero" className="size-full" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass absolute -bottom-5 start-5 flex items-center gap-3 rounded-full border border-line py-2 ps-2 pe-5 shadow-lg"
      >
        <span className="grid size-10 place-items-center rounded-full bg-accent font-bold text-accent-ink">۲۸</span>
        <span className="text-sm">
          <span className="block font-bold">نوبت تایید شد</span>
          <span className="text-muted">امروز · ساعت ۱۷:۳۰</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function DemoCard({ tenant, index }: { tenant: Tenant; index: number }) {
  const preset = presetById(templateFor(tenant.businessType).presetId);
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (index % 3) * 0.06 }}>
      <ThemeScope presetId={preset.id} className="group overflow-hidden rounded-theme-lg border border-line">
        <Link to={`/b/${tenant.slug}`} className="relative block aspect-[4/3] overflow-hidden">
          <CardArt seed={tenant.slug} type={tenant.businessType} />
          <span className="glass absolute top-3 start-3 rounded-full px-3 py-1 text-[12px] font-bold">
            {preset.name} · <span dir="ltr">{preset.latin}</span>
          </span>
        </Link>
        <div className="p-4">
          <div className="text-[12px] font-semibold text-muted">{BUSINESS_TYPE_LABEL[tenant.businessType]}</div>
          <div className="mt-1 text-lg font-extrabold">{tenant.name}</div>
          <div className="mt-4 flex gap-2">
            <ButtonLink to={`/b/${tenant.slug}`} variant="primary" size="sm">
              صفحه رزرو
            </ButtonLink>
            <ButtonLink to={`/b/${tenant.slug}/admin`} variant="ghost" size="sm">
              داشبورد
            </ButtonLink>
          </div>
        </div>
      </ThemeScope>
    </motion.div>
  );
}

function CardArt({ seed, type }: { seed: string; type: Tenant['businessType'] }) {
  const palette = usePalette();
  return (
    <div className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
      <Motif palette={palette} seed={seed} labels={templateFor(type).artLabels} className="size-full" />
    </div>
  );
}
