// Booking detail + every action allowed by the state machine. Opened from anywhere via ?b=<id>.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Clock, MessageCircle, Phone, Send, Smartphone, X, CalendarClock, Ban, UserX, CheckCheck, Sparkles, ChevronLeft } from 'lucide-react';
import { useDash } from './context';
import { SlotPicker } from './shared';
import { useAudit, useBooking, useNow, useSlotInputs } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { effectiveStatus, nextStatuses } from '@/domain/bookingMachine';
import { fmtCode } from '@/domain/misc';
import type { Booking, BookingStatus } from '@/domain/types';
import { customerMessage, shareLinks, type NotifyEvent } from '@/services/notifications';
import { civilDateOf, fmtAgo, fmtDayLong, fmtDuration, fmtTime, todayIn } from '@/lib/time';
import { formatToman } from '@/lib/digits';
import { fmtMobile, telLink } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Avatar, Button, Field, StatusPill, Textarea, Skeleton } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

type Mode = 'detail' | 'reject' | 'cancel' | 'propose' | 'reschedule';

const SOURCE_LABEL: Record<Booking['source'], string> = { online: 'آنلاین', phone: 'تلفنی', walk_in: 'حضوری', chatbot: 'دستیار هوشمند', admin: 'داشبورد' };

export function BookingSheet() {
  const [params, setParams] = useSearchParams();
  const id = params.get('b') ?? undefined;
  const { ctx } = useDash();
  const q = useBooking(ctx, id);
  const [mode, setMode] = useState<Mode>('detail');

  useEffect(() => setMode('detail'), [id]);

  const close = () => {
    const next = new URLSearchParams(params);
    next.delete('b');
    setParams(next, { replace: true });
  };

  const titles: Record<Mode, string> = {
    detail: 'جزئیات نوبت',
    reject: 'رد درخواست',
    cancel: 'لغو نوبت',
    propose: 'پیشنهاد زمان دیگر',
    reschedule: 'جابه‌جایی نوبت',
  };

  return (
    <Sheet
      open={!!id}
      onClose={close}
      size={mode === 'propose' || mode === 'reschedule' ? 'lg' : 'md'}
      title={
        mode === 'detail' ? (
          titles.detail
        ) : (
          <button onClick={() => setMode('detail')} className="press -ms-2 inline-flex items-center gap-1 rounded-full px-2">
            <ArrowRight size={18} /> {titles[mode]}
          </button>
        )
      }
    >
      {!q.data ? (
        <Skeleton className="h-60 w-full" />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
            {mode === 'detail' && <Detail b={q.data} setMode={setMode} onDone={close} />}
            {(mode === 'reject' || mode === 'cancel') && <ReasonForm b={q.data} to={mode === 'reject' ? 'rejected' : 'cancelled'} onDone={() => setMode('detail')} />}
            {(mode === 'propose' || mode === 'reschedule') && <TimeForm b={q.data} mode={mode} onDone={() => setMode('detail')} />}
          </motion.div>
        </AnimatePresence>
      )}
    </Sheet>
  );
}

function Detail({ b, setMode, onDone }: { b: Booking; setMode: (m: Mode) => void; onDone: () => void }) {
  const { ctx, tenant, bundle, base } = useDash();
  const now = useNow();
  const status = effectiveStatus(b, now);
  const tz = tenant.timezone;
  const start = Date.parse(b.start);
  const staff = bundle.staff.find((s) => s.id === b.staffId);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState(b.internalNote);
  const history = (useAudit(tenant.id).data ?? []).filter((a) => a.entityId === b.id);
  const allowed = nextStatuses(status, 'business');
  const started = start <= now;

  const go = async (to: BookingStatus, label: string) => {
    setBusy(to);
    try {
      await data.bookings.transition(ctx, b.id, to);
      toast(label);
      if (to === 'confirmed') onDone();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const event: NotifyEvent | null =
    status === 'confirmed' ? 'booking.confirmed' : status === 'rejected' ? 'booking.rejected' : status === 'proposed' ? 'booking.proposed' : status === 'cancelled' ? 'booking.cancelled' : status === 'pending' ? 'booking.created' : null;
  const trackUrl = `${location.origin}${import.meta.env.BASE_URL}b/${tenant.slug}/booking/${b.code}`;
  const links = event ? shareLinks(b.customerMobile, customerMessage(event, b, tenant.name, tz, trackUrl)) : null;
  const reminder = shareLinks(b.customerMobile, customerMessage('booking.reminder', b, tenant.name, tz, trackUrl));

  return (
    <div className="flex flex-col gap-5">
      {/* Customer */}
      <div className="flex items-center gap-3">
        <Avatar name={b.customerName} color="var(--ink)" size={48} />
        <div className="min-w-0 flex-1">
          <Link to={`${base}/customers/${b.customerId}`} className="block truncate text-lg font-extrabold hover:underline">
            {b.customerName}
          </Link>
          <div className="text-sm text-muted tabular" dir="ltr" style={{ textAlign: 'right' }}>
            {fmtMobile(b.customerMobile)}
          </div>
        </div>
        <a href={telLink(b.customerMobile)} aria-label="تماس" className="press grid size-11 place-items-center rounded-full bg-surface-2">
          <Phone size={19} />
        </a>
      </div>

      {/* When */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-theme-lg border border-line bg-line">
        <Cell label="تاریخ" value={fmtDayLong(civilDateOf(start, tz))} />
        <Cell label="ساعت" value={`${fmtTime(start, tz)} تا ${fmtTime(b.end, tz)}`} />
        <Cell label="خدمت" value={b.serviceName} sub={fmtDuration(b.durationMin)} />
        <Cell label="کارمند" value={staff?.name ?? '—'} />
        <Cell label="مبلغ" value={b.priceToman ? formatToman(b.priceToman) : 'رایگان'} />
        <Cell label="وضعیت" value={<StatusPill status={status} />} />
      </div>

      {b.status === 'proposed' && b.proposal && (
        <div className="rounded-theme border border-proposed/40 bg-proposed/8 p-3 text-sm">
          زمان پیشنهادی: <b>{fmtDayLong(civilDateOf(Date.parse(b.proposal.start), tz))} ساعت {fmtTime(b.proposal.start, tz)}</b> — منتظر پاسخ مشتری
        </div>
      )}

      {b.autoDecision && (
        <div className="flex items-start gap-2.5 rounded-theme bg-surface-2 p-3 text-[13px]">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <b>{b.autoDecision.decision === 'approve' ? 'تایید هوشمند' : 'تایید هوشمند: نیاز به بررسی'}</b>
            <div className="text-muted">{b.autoDecision.reasons.join(' · ')}</div>
          </div>
        </div>
      )}

      {b.customerNote && (
        <div className="rounded-theme bg-surface-2 p-3 text-sm">
          <div className="mb-1 text-[12px] font-semibold text-muted">یادداشت مشتری</div>
          {b.customerNote}
        </div>
      )}
      {b.statusReason && <div className="text-sm text-muted">علت: {b.statusReason}</div>}

      {/* Actions */}
      {status === 'pending' && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" size="lg" className="col-span-2" icon={<Check size={18} />} loading={busy === 'confirmed'} onClick={() => go('confirmed', 'نوبت تایید شد')}>
            تایید درخواست
          </Button>
          <Button icon={<CalendarClock size={17} />} onClick={() => setMode('propose')}>
            زمان دیگر
          </Button>
          <Button variant="danger" icon={<X size={17} />} onClick={() => setMode('reject')}>
            رد
          </Button>
        </div>
      )}
      {status === 'confirmed' && (
        <div className="grid grid-cols-2 gap-2">
          {started && allowed.includes('completed') && (
            <Button variant="ink" icon={<CheckCheck size={17} />} loading={busy === 'completed'} onClick={() => go('completed', 'ثبت شد: انجام شد')}>
              انجام شد
            </Button>
          )}
          {started && allowed.includes('no_show') && (
            <Button variant="danger" icon={<UserX size={17} />} loading={busy === 'no_show'} onClick={() => go('no_show', 'غیبت ثبت شد')}>
              غیبت
            </Button>
          )}
          {!started && (
            <Button icon={<CalendarClock size={17} />} onClick={() => setMode('reschedule')}>
              جابه‌جایی
            </Button>
          )}
          <Button variant="ghost" icon={<Ban size={17} />} onClick={() => setMode('cancel')} className={started ? 'col-span-2' : ''}>
            لغو نوبت
          </Button>
        </div>
      )}
      {status === 'proposed' && (
        <Button variant="ghost" icon={<Ban size={17} />} onClick={() => setMode('cancel')}>
          لغو درخواست
        </Button>
      )}
      {(status === 'completed' || status === 'no_show') && (
        <Button variant="ghost" onClick={() => go(status === 'completed' ? 'no_show' : 'completed', 'اصلاح شد')}>
          اصلاح: {status === 'completed' ? 'غیبت بود' : 'انجام شد'}
        </Button>
      )}

      {/* Notify via the secretary's own phone apps (free, works today) */}
      {links && (
        <div>
          <div className="mb-2 text-[13px] font-semibold text-muted">خبر دادن به مشتری</div>
          <div className="grid grid-cols-3 gap-2">
            <ShareBtn href={links.sms} icon={<Smartphone size={17} />} label="پیامک" />
            <ShareBtn href={links.whatsapp} icon={<MessageCircle size={17} />} label="واتساپ" />
            <ShareBtn href={links.telegram} icon={<Send size={17} />} label="تلگرام" />
          </div>
          {status === 'confirmed' && !started && (
            <a href={reminder.sms} className="mt-2 flex h-10 items-center justify-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
              <Clock size={14} /> ارسال یادآوری <ChevronLeft size={14} />
            </a>
          )}
        </div>
      )}

      <Field label="یادداشت داخلی (فقط برای شما)">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== b.internalNote && data.bookings.update(ctx, b.id, { internalNote: note }).then(() => toast('یادداشت ذخیره شد'))}
          rows={2}
          placeholder="مثلاً: رنگ شماره ۷.۱"
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[12px] text-muted">
        <span>
          کد <span className="mono font-bold text-ink">{fmtCode(b.code)}</span> · {SOURCE_LABEL[b.source]} · ثبت {fmtAgo(Date.parse(b.createdAt), now)}
        </span>
      </div>
      {history.length > 0 && (
        <ol className="flex flex-col gap-2 border-s border-line ps-4">
          {history.map((h) => (
            <li key={h.id} className="relative text-[13px]">
              <span className="absolute top-2 -start-[21px] size-2 rounded-full bg-ink/40" />
              <b>{h.summary}</b> <span className="text-muted">· {h.actorName} · {fmtAgo(Date.parse(h.at), now)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-surface p-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 font-bold">{value}</div>
      {sub && <div className="text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

function ShareBtn({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-1.5 rounded-theme border border-line bg-surface text-sm font-semibold hover:bg-surface-2">
      {icon} {label}
    </a>
  );
}

const QUICK_REASONS: Record<'rejected' | 'cancelled', string[]> = {
  rejected: ['این زمان پر شده است', 'کارمند در دسترس نیست', 'این خدمت فعلاً ارائه نمی‌شود'],
  cancelled: ['به درخواست مشتری', 'تعطیلی غیرمنتظره', 'کارمند در دسترس نیست'],
};

function ReasonForm({ b, to, onDone }: { b: Booking; to: 'rejected' | 'cancelled'; onDone: () => void }) {
  const { ctx } = useDash();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">
        {to === 'rejected' ? 'درخواست' : 'نوبت'} <b className="text-ink">{b.customerName}</b> {to === 'rejected' ? 'رد' : 'لغو'} می‌شود. علت برای مشتری نمایش داده می‌شود (اختیاری).
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK_REASONS[to].map((r) => (
          <button key={r} onClick={() => setReason(r)} className={cn('press rounded-full border px-3.5 py-1.5 text-sm', reason === r ? 'border-ink bg-ink text-paper' : 'border-line')}>
            {r}
          </button>
        ))}
      </div>
      <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="علت…" />
      <Button
        variant="danger"
        size="lg"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await data.bookings.transition(ctx, b.id, to, { reason });
            toast(to === 'rejected' ? 'درخواست رد شد' : 'نوبت لغو شد');
            onDone();
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        {to === 'rejected' ? 'رد درخواست' : 'لغو نوبت'}
      </Button>
    </div>
  );
}

function TimeForm({ b, mode, onDone }: { b: Booking; mode: 'propose' | 'reschedule'; onDone: () => void }) {
  const { ctx, tenant, bundle } = useDash();
  const inputs = useSlotInputs(tenant.id).data;
  const now = useNow();
  const tz = tenant.timezone;
  const service = bundle.services.find((s) => s.id === b.serviceId);
  const [staffId, setStaffId] = useState(b.staffId);
  const [date, setDate] = useState(civilDateOf(Date.parse(b.start), tz));
  const [start, setStart] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!inputs || !service) return <Skeleton className="h-60" />;
  return (
    <div className="flex flex-col gap-5">
      <SlotPicker
        inputs={inputs}
        service={service}
        staff={bundle.staff}
        staffId={staffId}
        onStaff={setStaffId}
        date={date}
        onDate={(d) => {
          setDate(d);
          setStart(null);
        }}
        today={todayIn(tz, now)}
        selected={start}
        onPick={setStart}
        excludeBookingId={b.id}
        now={now}
      />
      {mode === 'propose' && <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="پیام برای مشتری (اختیاری)" />}
      <Button
        variant="primary"
        size="lg"
        disabled={!start}
        loading={busy}
        onClick={async () => {
          if (!start) return;
          setBusy(true);
          try {
            if (mode === 'propose') await data.bookings.transition(ctx, b.id, 'proposed', { proposal: { start, staffId, message } });
            else await data.bookings.reschedule(ctx, b.id, start, staffId);
            toast(mode === 'propose' ? 'پیشنهاد برای مشتری ارسال شد' : 'نوبت جابه‌جا شد');
            onDone();
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setBusy(false);
          }
        }}
      >
        {start ? `${mode === 'propose' ? 'پیشنهاد' : 'انتقال به'} ${fmtDayLong(date)} ساعت ${fmtTime(start, tz)}` : 'یک زمان انتخاب کنید'}
      </Button>
    </div>
  );
}
