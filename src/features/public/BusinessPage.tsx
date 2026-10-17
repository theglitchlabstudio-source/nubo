import { useMemo } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Camera as Instagram, MapPin, Navigation, Phone, Send, Share2, ChevronLeft, MessageCircle, Globe } from 'lucide-react';
import { usePublic } from './PublicLayout';
import { firstAvailable, openState, priceLabel, weekRows } from './helpers';
import { BookingFlow } from './BookingFlow';
import { ChatBubble } from './ChatBubble';
import { useFileUrl, useNow, useSlotInputs } from '@/data/hooks';
import { getFeatures, BUSINESS_TYPE_LABEL } from '@/domain/features';
import { usePalette } from '@/theme/ThemeScope';
import { Motif } from '@/theme/Motif';
import { templateFor } from '@/seed/templates';
import { WEEKDAYS } from '@/lib/jalali';
import { civilDateOf, diffDays, fmtDate, fmtDuration, fmtHHmm, fmtRelativeDay, fmtTime, todayIn, weekdayOf } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { fmtMobile, telLink } from '@/lib/text';
import { geoLink, mapLinks } from '@/lib/maps';
import { cn } from '@/lib/cn';
import { Avatar, ButtonLink, Dot, Label, Skeleton } from '@/ui/primitives';
import { PoweredBy } from '@/ui/Brand';
import { useIsDesktop } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function BusinessPage() {
  const { tenant, branding, services, staff } = usePublic();
  const palette = usePalette();
  const inputsQ = useSlotInputs(tenant.id);
  const now = useNow();
  const desktop = useIsDesktop('(min-width: 1024px)');
  const features = getFeatures(tenant);
  const logoUrl = useFileUrl(branding.logo);
  const coverUrl = useFileUrl(branding.cover);
  const tz = tenant.timezone;
  const today = todayIn(tz, now);
  const activeServices = services.filter((s) => s.active);
  const activeStaff = staff.filter((s) => s.active);
  const artLabels = templateFor(tenant.businessType).artLabels;

  const next = useMemo(() => (inputsQ.data ? firstAvailable(inputsQ.data, services, now) : null), [inputsQ.data, services, now]);
  const open = inputsQ.data ? openState(inputsQ.data, now) : null;
  const links = mapLinks(tenant.profile.location);
  const geo = geoLink(tenant.profile.location);
  const phone = tenant.profile.phones[0];

  const share = async () => {
    const url = location.href.split('?')[0];
    try {
      if (navigator.share) await navigator.share({ title: tenant.name, text: tenant.profile.tagline, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('لینک کپی شد');
      }
    } catch {
      /* cancelled */
    }
  };

  const cover = (
    <div className="absolute inset-0">
      {coverUrl ? (
        <img src={coverUrl} alt="" className="size-full object-cover" />
      ) : (
        <Motif palette={palette} seed={tenant.slug} labels={artLabels} className="size-full" />
      )}
    </div>
  );

  const logo = (
    <span className="grid size-12 place-items-center overflow-hidden rounded-full bg-ink text-lg font-extrabold text-paper ring-4 ring-paper/70">
      {logoUrl ? <img src={logoUrl} alt="" className="size-full object-cover" /> : tenant.name.replace(/^(آرایشگاه|سالن زیبایی|مرکز|کلینیک|مطب|باشگاه|کلاس)\s*/, '').charAt(0)}
    </span>
  );

  const heading = (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Label>{BUSINESS_TYPE_LABEL[tenant.businessType]}</Label>
        {tenant.profile.city && (
          <>
            <span className="h-3 w-px bg-line" />
            <Label>{tenant.profile.city}</Label>
          </>
        )}
        {open && (
          <>
            <span className="h-3 w-px bg-line" />
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
              <Dot color={open.open ? '#2F9E6A' : '#9A968F'} size={7} className={open.open ? 'pulse-once' : ''} />
              {open.open ? `باز است تا ${fmtHHmm(open.until!)}` : open.opensAt ? `امروز از ${fmtHHmm(open.opensAt)} باز می‌شود` : 'امروز بسته است'}
            </span>
          </>
        )}
      </div>
      <h1 className="mt-3 text-[34px] leading-[1.15] font-extrabold tracking-tight text-balance sm:text-[44px]">{tenant.name}</h1>
      <p className="mt-2 text-[17px] text-muted">{tenant.profile.tagline}</p>
    </div>
  );

  return (
    <div className="pb-32 lg:pb-0">
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10 lg:px-8 lg:pt-8">
        <main className="min-w-0">
          {/* Cover */}
          <header className="relative h-[50svh] min-h-[360px] overflow-hidden lg:h-[420px] lg:rounded-theme-lg">
            {cover}
            <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
              {logo}
              <button onClick={share} aria-label="اشتراک‌گذاری" className="press glass grid size-11 place-items-center rounded-full text-ink">
                <Share2 size={19} />
              </button>
            </div>
          </header>

          <div className="relative -mt-7 rounded-t-[28px] bg-paper px-5 pt-6 lg:mt-0 lg:rounded-none lg:px-0 lg:pt-8">
            {heading}

            {/* Quick actions */}
            <div className="mt-6 grid grid-cols-4 gap-2 lg:max-w-md">
              {phone && <QuickAction href={telLink(phone)} icon={<Phone size={20} />} label="تماس" />}
              {(links[0] || geo) && <QuickAction href={geo && !desktop ? geo : links[0]?.href} icon={<Navigation size={20} />} label="مسیریابی" external />}
              {tenant.profile.socials.instagram && (
                <QuickAction href={`https://instagram.com/${tenant.profile.socials.instagram}`} icon={<Instagram size={20} />} label="اینستاگرام" external />
              )}
              <QuickAction onClick={share} icon={<Share2 size={20} />} label="اشتراک" />
            </div>

            {/* Next free slot */}
            <Link
              to={desktop ? '#book' : 'book'}
              className="press group mt-6 flex items-center gap-4 rounded-theme-lg bg-ink p-4 text-paper lg:hidden"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
                <Clock size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] opacity-70">اولین نوبت آزاد</span>
                {inputsQ.isLoading ? (
                  <Skeleton className="mt-1 h-6 w-32 bg-paper/20" />
                ) : next ? (
                  <span className="block text-lg font-bold">
                    {fmtRelativeDay(next.date, today)} · ساعت {fmtTime(next.start, tz)}
                  </span>
                ) : (
                  <span className="block font-bold">فعلاً زمان آزادی نیست</span>
                )}
              </span>
              <ArrowLeft size={22} className="transition-transform group-hover:-translate-x-1" />
            </Link>

            {/* Services */}
            <section className="mt-10">
              <SectionHead title="خدمات" count={activeServices.length} />
              <div className="divide-y divide-line border-y border-line">
                {activeServices.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                    <Link to={desktop ? `?s=${s.id}#book` : `book?s=${s.id}`} className="press group flex items-center gap-4 py-4 hover:bg-surface-2/60 lg:-mx-3 lg:px-3">
                      <span className="w-6 text-[13px] text-muted tabular">{toFa(String(i + 1).padStart(2, '0'))}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{s.name}</span>
                        <span className="mt-0.5 block text-[13px] text-muted">
                          {fmtDuration(s.durationMin)}
                          {s.category && ` · ${s.category}`}
                        </span>
                      </span>
                      <span className="text-[14px] font-semibold whitespace-nowrap">{priceLabel(s)}</span>
                      <ChevronLeft size={18} className="text-muted transition-transform group-hover:-translate-x-0.5" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Staff */}
            {activeStaff.length > 1 && (
              <section className="mt-10">
                <SectionHead title="تیم ما" count={activeStaff.length} />
                <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
                  {activeStaff.map((s) => (
                    <div key={s.id} className="flex w-40 shrink-0 flex-col items-start rounded-theme-lg border border-line bg-surface p-4 lg:w-auto">
                      <Avatar name={s.name} color={s.color} photo={s.photo} size={52} />
                      <div className="mt-3 font-bold">{s.name}</div>
                      <div className="text-[13px] text-muted">{s.title}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {features.gallery && branding.gallery.length > 0 && (
              <section className="mt-10">
                <SectionHead title="گالری" count={branding.gallery.length} />
                <div className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 lg:mx-0 lg:grid lg:grid-cols-3 lg:px-0">
                  {branding.gallery.map((g) => (
                    <GalleryImage key={g.id} id={g.id} />
                  ))}
                </div>
              </section>
            )}

            {/* About */}
            {tenant.profile.description && (
              <section className="mt-10">
                <SectionHead title="درباره ما" />
                <p className="leading-8 text-ink/85">{tenant.profile.description}</p>
              </section>
            )}

            {/* Hours */}
            <section className="mt-10">
              <SectionHead title="ساعت کاری" />
              {inputsQ.data && (
                <Hours rows={weekRows(inputsQ.data.workingHours)} todayWd={weekdayOf(today)} />
              )}
              {inputsQ.data && <UpcomingHolidays holidays={inputsQ.data.holidays} today={today} tz={tz} />}
            </section>

            {/* Location */}
            {(tenant.profile.address || links.length > 0) && (
              <section className="mt-10">
                <SectionHead title="آدرس" />
                <div className="rounded-theme-lg border border-line bg-surface p-4">
                  <div className="flex gap-3">
                    <MapPin size={20} className="mt-1 shrink-0 text-accent" />
                    <p className="leading-7">{tenant.profile.address}</p>
                  </div>
                  {links.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {links.map((l) => (
                        <a key={l.id} href={l.href} target="_blank" rel="noreferrer" className="press inline-flex h-10 items-center gap-2 rounded-full bg-surface-2 px-4 text-sm font-semibold hover:bg-accent-soft">
                          <Navigation size={15} /> {l.label}
                        </a>
                      ))}
                      {geo && (
                        <a href={geo} className="press inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold lg:hidden">
                          برنامه دیگر
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Contact + socials */}
            <section className="mt-10">
              <SectionHead title="ارتباط" />
              <div className="flex flex-wrap gap-2">
                {tenant.profile.phones.map((p) => (
                  <SocialChip key={p} href={telLink(p)} icon={<Phone size={15} />} label={fmtMobile(p)} ltr />
                ))}
                {tenant.profile.socials.instagram && <SocialChip href={`https://instagram.com/${tenant.profile.socials.instagram}`} icon={<Instagram size={15} />} label="اینستاگرام" />}
                {tenant.profile.socials.telegram && <SocialChip href={`https://t.me/${tenant.profile.socials.telegram}`} icon={<Send size={15} />} label="تلگرام" />}
                {tenant.profile.socials.whatsapp && <SocialChip href={`https://wa.me/98${tenant.profile.socials.whatsapp.replace(/^0/, '')}`} icon={<MessageCircle size={15} />} label="واتساپ" />}
                {tenant.profile.socials.bale && <SocialChip href={`https://ble.ir/${tenant.profile.socials.bale}`} icon={<MessageCircle size={15} />} label="بله" />}
                {tenant.profile.socials.eitaa && <SocialChip href={`https://eitaa.com/${tenant.profile.socials.eitaa}`} icon={<MessageCircle size={15} />} label="ایتا" />}
                {tenant.profile.socials.website && <SocialChip href={tenant.profile.socials.website} icon={<Globe size={15} />} label="وب‌سایت" />}
              </div>
            </section>

            <footer className="mt-14 border-t border-line pt-6 pb-4">
              <PoweredBy />
            </footer>
          </div>
        </main>

        {/* Desktop: sticky booking panel */}
        {desktop && (
          <aside id="book" className="hidden lg:block">
            <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-theme-lg border border-line bg-surface p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
              <BookingFlow embedded onExit={() => undefined} />
            </div>
          </aside>
        )}
      </div>

      {/* Phone: sticky book bar */}
      <div className="glass pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <ButtonLink to="book" variant="primary" size="lg" block className="text-[17px]">
            رزرو نوبت
          </ButtonLink>
        </div>
      </div>

      {features.chatbot && <ChatBubble />}
    </div>
  );
}

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {count != null && <span className="text-[13px] text-muted tabular">{toFa(String(count).padStart(2, '0'))}</span>}
    </div>
  );
}

function QuickAction({ href, onClick, icon, label, external }: { href?: string; onClick?: () => void; icon: React.ReactNode; label: string; external?: boolean }) {
  const inner = (
    <>
      <span className="grid size-12 place-items-center rounded-full border border-line bg-surface transition-colors group-hover:bg-accent group-hover:text-accent-ink">{icon}</span>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </>
  );
  const cls = 'press group flex flex-col items-center gap-1.5';
  return href ? (
    <a href={href} className={cls} target={external ? '_blank' : undefined} rel="noreferrer">
      {inner}
    </a>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function SocialChip({ href, icon, label, ltr }: { href: string; icon: React.ReactNode; label: string; ltr?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="press inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold hover:border-ink/40">
      {icon}
      <span dir={ltr ? 'ltr' : undefined} className={ltr ? 'tabular' : undefined}>
        {label}
      </span>
    </a>
  );
}

function Hours({ rows, todayWd }: { rows: { start: string; end: string }[][]; todayWd: number }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {rows.map((ranges, wd) => (
        <div key={wd} className={cn('flex items-center justify-between py-3', wd === todayWd && 'font-bold')}>
          <span className="flex items-center gap-2">
            {wd === todayWd ? <Dot color="var(--accent)" /> : <span className="w-2" />}
            {WEEKDAYS[wd]}
          </span>
          <span className={cn('tabular', !ranges.length && 'text-muted')}>
            {ranges.length ? ranges.map((r) => `${fmtHHmm(r.start)} تا ${fmtHHmm(r.end)}`).join('  ·  ') : 'تعطیل'}
          </span>
        </div>
      ))}
    </div>
  );
}

function UpcomingHolidays({ holidays, today, tz }: { holidays: { start: string; reason?: string; disabled: boolean }[]; today: string; tz: string }) {
  const upcoming = holidays
    .filter((h) => !h.disabled)
    .map((h) => ({ ...h, date: civilDateOf(Date.parse(h.start), tz) }))
    .filter((h) => diffDays(h.date, today) >= 0 && diffDays(h.date, today) <= 30)
    .slice(0, 3);
  if (!upcoming.length) return null;
  return (
    <div className="mt-4 flex flex-col gap-2">
      {upcoming.map((h) => (
        <div key={h.date} className="flex items-center gap-3 text-[13px]">
          <span className="relative size-3 rounded-full border border-ink/30">
            <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-ink/40" />
          </span>
          <span className="font-semibold">{fmtDate(h.date)}</span>
          <span className="text-muted">تعطیل · {h.reason}</span>
        </div>
      ))}
    </div>
  );
}

function GalleryImage({ id }: { id: string }) {
  const url = useFileUrl({ id });
  return (
    <div className="aspect-[4/5] w-56 shrink-0 snap-start overflow-hidden rounded-theme-lg bg-surface-2 lg:w-auto">
      {url && <img src={url} alt="" className="size-full object-cover" loading="lazy" />}
    </div>
  );
}
