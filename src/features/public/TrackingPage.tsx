import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowRight, CalendarPlus, Copy, Phone, Navigation, RotateCcw, XCircle, Check } from 'lucide-react';
import { usePublic } from './PublicLayout';
import { priceLabel } from './helpers';
import { usePublicBooking } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { STATUS_COLOR, STATUS_LABEL } from '@/domain/bookingMachine';
import { buildIcs, downloadFile, fmtCode } from '@/domain/misc';
import type { BookingStatus, PublicBooking } from '@/domain/types';
import { civilDateOf, fmtDayLong, fmtTime, jalaliOf } from '@/lib/time';
import { JALALI_MONTHS } from '@/lib/jalali';
import { toFa } from '@/lib/digits';
import { telLink } from '@/lib/text';
import { mapLinks } from '@/lib/maps';
import { cn } from '@/lib/cn';
import { Button, ButtonLink, Dot, Field, Input, Skeleton } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { PoweredBy } from '@/ui/Brand';
import { toast } from '@/ui/Toast';

type Action = 'cancel' | 'acceptProposal' | 'declineProposal';

export default function TrackingPage() {
  const { tenant } = usePublic();
  const { code } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const q = usePublicBooking(tenant.slug, code);
  const [action, setAction] = useState<Action | null>(null);

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-xl p-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }
  const b = q.data;
  if (!b) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="text-xl font-extrabold">نوبتی با این کد پیدا نشد</h1>
        <ButtonLink to={`/b/${tenant.slug}`} className="mt-6">
          بازگشت به {tenant.name}
        </ButtonLink>
      </div>
    );
  }

  const tz = tenant.timezone;
  const start = Date.parse(b.start);
  const date = civilDateOf(start, tz);
  const j = jalaliOf(date);
  const phone = tenant.profile.phones[0];
  const map = mapLinks(tenant.profile.location)[0];

  const addToCalendar = () => {
    const ics = buildIcs({
      uid: b.code,
      start,
      end: Date.parse(b.end),
      title: `${b.serviceName} · ${tenant.name}`,
      location: tenant.profile.address,
      description: `کد نوبت: ${fmtCode(b.code)}\n${location.href.split('?')[0]}`,
    });
    downloadFile(`nubo-${b.code}.ics`, ics, 'text/calendar');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(location.href.split('?')[0]);
      toast('لینک پیگیری کپی شد');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-5 pb-16">
      <div className="flex items-center justify-between py-3">
        <Link to={`/b/${tenant.slug}`} className="press -ms-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 font-semibold">
          <ArrowRight size={19} /> {tenant.name}
        </Link>
        <button onClick={copyLink} className="press inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:bg-surface-2">
          <Copy size={15} /> کپی لینک
        </button>
      </div>

      {isNew && <SuccessHero confirmed={b.status === 'confirmed'} tenantName={tenant.name} />}

      {/* Status */}
      <section className={cn('mt-4', isNew && 'mt-8')}>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-muted">وضعیت نوبت</div>
        <div className="mt-1 flex items-center gap-2.5 text-2xl font-extrabold">
          <Dot color={STATUS_COLOR[b.status]} size={12} />
          {STATUS_LABEL[b.status]}
        </div>
        {b.statusReason && <p className="mt-2 text-sm text-muted">علت: {b.statusReason}</p>}
        <Timeline status={b.status} />
      </section>

      {b.status === 'proposed' && b.proposal && (
        <section className="mt-6 rounded-theme-lg border-2 border-proposed bg-surface p-4">
          <div className="text-[13px] font-semibold text-proposed">{tenant.name} زمان دیگری پیشنهاد داده است</div>
          <div className="mt-2 text-xl font-extrabold">
            {fmtDayLong(civilDateOf(Date.parse(b.proposal.start), tz))} · ساعت {fmtTime(b.proposal.start, tz)}
          </div>
          {b.proposal.message && <p className="mt-1 text-sm text-muted">«{b.proposal.message}»</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="primary" block onClick={() => setAction('acceptProposal')}>
              قبول می‌کنم
            </Button>
            <Button variant="ghost" onClick={() => setAction('declineProposal')}>
              نه، ممنون
            </Button>
          </div>
        </section>
      )}

      {/* Ticket */}
      <section className="mt-6 overflow-hidden rounded-theme-lg border border-line bg-surface">
        <div className="flex">
          <div className="flex w-28 shrink-0 flex-col items-center justify-center border-e border-dashed border-line py-6">
            <span className="numeral text-[58px]">{toFa(j.jd)}</span>
            <span className="mt-1 font-bold">{JALALI_MONTHS[j.jm - 1]}</span>
            <span className="text-[13px] text-muted">{toFa(j.jy)}</span>
          </div>
          <div className="min-w-0 flex-1 p-4">
            <div className="text-[13px] text-muted">{fmtDayLong(date).split(' ')[0]}</div>
            <div className="numeral mt-1 text-[34px]">{fmtTime(start, tz)}</div>
            <div className="mt-3 font-bold">{b.serviceName}</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {b.staffName}
              {b.priceToman > 0 && ` · ${priceLabel({ priceType: 'fixed', priceToman: b.priceToman })}`}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-line px-4 py-3 text-[13px]">
          <span className="text-muted">
            {b.customerName} · <span dir="ltr">{toFa(b.maskedMobile)}</span>
          </span>
          <span className="mono font-bold" dir="ltr">
            {fmtCode(b.code)}
          </span>
        </div>
      </section>

      {/* Actions */}
      <section className="mt-6 grid grid-cols-2 gap-2.5">
        {(b.status === 'confirmed' || b.status === 'pending') && (
          <Button size="lg" icon={<CalendarPlus size={18} />} onClick={addToCalendar}>
            افزودن به تقویم
          </Button>
        )}
        {phone && (
          <a href={telLink(phone)} className="press inline-flex h-[52px] items-center justify-center gap-2 rounded-theme border border-line bg-surface font-semibold hover:bg-surface-2">
            <Phone size={18} /> تماس
          </a>
        )}
        {map && (
          <a href={map.href} target="_blank" rel="noreferrer" className="press inline-flex h-[52px] items-center justify-center gap-2 rounded-theme border border-line bg-surface font-semibold hover:bg-surface-2">
            <Navigation size={18} /> مسیریابی
          </a>
        )}
        <ButtonLink to={`/b/${tenant.slug}/book`} size="lg" icon={<RotateCcw size={17} />}>
          نوبت جدید
        </ButtonLink>
      </section>

      {b.canCancel && (
        <button onClick={() => setAction('cancel')} className="press mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-theme text-[15px] font-semibold text-danger hover:bg-danger/5">
          <XCircle size={18} /> لغو نوبت
        </button>
      )}
      {!b.canCancel && b.status === 'confirmed' && (
        <p className="mt-6 text-center text-[13px] text-muted">مهلت لغو آنلاین تمام شده است. برای تغییر، با {tenant.name} تماس بگیرید.</p>
      )}

      <p className="mt-8 rounded-theme bg-surface-2 p-3.5 text-center text-[13px] text-muted">این صفحه را نگه دارید؛ وضعیت نوبت همین‌جا به‌روز می‌شود.</p>

      <footer className="mt-12">
        <PoweredBy />
      </footer>

      <VerifySheet action={action} onClose={() => setAction(null)} booking={b} slug={tenant.slug} />
    </div>
  );
}

function SuccessHero({ confirmed, tenantName }: { confirmed: boolean; tenantName: string }) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center pt-6 text-center">
      <div className="relative grid size-28 place-items-center">
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-accent"
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.25 }}
        />
        <motion.span
          className="absolute inset-0 rounded-full bg-accent"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        />
        <svg viewBox="0 0 52 52" className="relative size-14 text-accent-ink">
          <motion.path
            d="M14 27 l8 8 l16 -18"
            fill="none"
            stroke="currentColor"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-6 text-[26px] font-extrabold">
        {confirmed ? 'نوبت شما ثبت شد' : 'درخواست شما ارسال شد'}
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-2 max-w-xs text-muted">
        {confirmed ? `منتظر دیدارتان در ${tenantName} هستیم.` : `به‌محض تایید ${tenantName}، پیامک تایید برایتان ارسال می‌شود.`}
      </motion.p>
    </motion.section>
  );
}

function Timeline({ status }: { status: BookingStatus }) {
  const failed = ['rejected', 'cancelled', 'expired', 'no_show'].includes(status);
  const steps = [
    { label: 'ثبت درخواست', done: true },
    { label: status === 'proposed' ? 'زمان پیشنهادی' : 'تایید', done: ['confirmed', 'completed', 'no_show'].includes(status), current: status === 'pending' || status === 'proposed' },
    { label: failed ? STATUS_LABEL[status] : 'انجام', done: status === 'completed', failed },
  ];
  return (
    <div className="mt-5 flex items-start">
      {steps.map((s, i) => (
        <div key={i} className="flex flex-1 flex-col items-start">
          <div className="flex w-full items-center">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full',
                s.failed ? 'bg-ink/15 text-ink' : s.done ? 'bg-ink text-paper' : s.current ? 'border-2 border-accent' : 'border-2 border-ink/15',
              )}
            >
              {s.done && <Check size={14} strokeWidth={3} />}
              {s.failed && <XCircle size={14} />}
              {s.current && <span className="size-2 animate-pulse rounded-full bg-accent" />}
            </motion.span>
            {i < steps.length - 1 && <span className={cn('mx-1.5 h-0.5 flex-1 rounded-full', steps[i + 1].done ? 'bg-ink' : 'bg-ink/12')} />}
          </div>
          <span className={cn('mt-2 text-[12px] font-semibold', s.done || s.current ? 'text-ink' : 'text-muted')}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function VerifySheet({ action, onClose, booking, slug }: { action: Action | null; onClose: () => void; booking: PublicBooking; slug: string }) {
  const [last4, setLast4] = useState('');
  const [busy, setBusy] = useState(false);
  const titles: Record<Action, string> = { cancel: 'لغو نوبت', acceptProposal: 'قبول زمان پیشنهادی', declineProposal: 'رد زمان پیشنهادی' };
  const run = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await data.bookings.customerAction(slug, booking.code, action, last4);
      toast(action === 'cancel' ? 'نوبت لغو شد' : action === 'acceptProposal' ? 'نوبت تایید شد' : 'پیشنهاد رد شد');
      setLast4('');
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={!!action}
      onClose={onClose}
      title={action ? titles[action] : ''}
      footer={
        <Button variant={action === 'cancel' ? 'danger' : 'primary'} size="lg" block loading={busy} disabled={last4.length < 4} onClick={run}>
          {action === 'cancel' ? 'بله، لغو شود' : 'تایید'}
        </Button>
      }
    >
      <p className="text-muted">برای اطمینان، ۴ رقم آخر شماره موبایلی که با آن نوبت گرفته‌اید را وارد کنید.</p>
      <Field label="۴ رقم آخر موبایل" className="mt-4">
        <Input value={last4} onChange={(e) => setLast4(e.target.value.slice(0, 4))} inputMode="numeric" dir="ltr" className="text-center text-2xl tracking-[0.5em] tabular" placeholder="••••" autoFocus />
      </Field>
    </Sheet>
  );
}
