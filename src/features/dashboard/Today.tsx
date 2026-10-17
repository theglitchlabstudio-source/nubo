import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, Inbox, Sparkles, CalendarDays } from 'lucide-react';
import { useDash } from './context';
import { useOpenBooking, useOpenNew } from './shared';
import { useAudit, useBookingsAll, useNow } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { effectiveStatus, STATUS_COLOR } from '@/domain/bookingMachine';
import type { Booking } from '@/domain/types';
import { DAY, zonedParts, addDays, civilDateOf, dayRange, fmtAgo, fmtRelativeDay, fmtTime, jalaliOf, todayIn, weekdayOf } from '@/lib/time';
import { JALALI_MONTHS, WEEKDAYS } from '@/lib/jalali';
import { formatCompactToman, toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { Avatar, Button, Card, Dot, EmptyState, Label, StatusPill } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

export default function Today() {
  const { ctx, tenant, actor, base } = useDash();
  const all = useBookingsAll(ctx).data;
  const now = useNow();
  const tz = tenant.timezone;
  const today = todayIn(tz, now);
  const j = jalaliOf(today);

  const { requests, agenda, stats, tomorrowCount } = useMemo(() => {
    const list = all ?? [];
    const { from, to } = dayRange(today, tz);
    const weekFrom = dayRange(addDays(today, -weekdayOf(today)), tz).from;
    const live = (b: Booking) => !['cancelled', 'rejected', 'expired'].includes(effectiveStatus(b, now));
    const requests = list
      .filter((b) => ['pending', 'proposed'].includes(effectiveStatus(b, now)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const agenda = list
      .filter((b) => Date.parse(b.start) >= from && Date.parse(b.start) < to && live(b))
      .sort((a, b) => a.start.localeCompare(b.start));
    const week = list.filter((b) => Date.parse(b.start) >= weekFrom && Date.parse(b.start) < weekFrom + 7 * DAY && live(b));
    const revenue = agenda.filter((b) => effectiveStatus(b, now) !== 'no_show').reduce((s, b) => s + b.priceToman, 0);
    const t2 = dayRange(addDays(today, 1), tz);
    return {
      requests,
      agenda,
      stats: { today: agenda.length, week: week.length, revenue, pending: requests.filter((b) => b.status === 'pending').length },
      tomorrowCount: list.filter((b) => Date.parse(b.start) >= t2.from && Date.parse(b.start) < t2.to && live(b)).length,
    };
  }, [all, now, today, tz]);

  const hour = zonedParts(now, tz).h;
  const greet = hour < 12 ? 'صبح بخیر' : hour < 17 ? 'روز بخیر' : 'عصر بخیر';

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Poster header */}
      <section className="grid grid-cols-[auto_1fr] items-end gap-x-5 border-b border-line px-5 pt-6 pb-6 lg:px-10 lg:pt-10">
        <div className="numeral text-[84px] lg:text-[112px]">{toFa(j.jd)}</div>
        <div className="pb-2">
          <div className="text-[13px] font-semibold text-muted">
            {greet}، {actor.name.split(' ')[0]}
          </div>
          <div className="mt-1 text-xl font-extrabold lg:text-2xl">{JALALI_MONTHS[j.jm - 1]}</div>
          <div className="text-muted">
            {WEEKDAYS[weekdayOf(today)]} · {toFa(j.jy)}
          </div>
        </div>
        <div className="col-span-2 mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <MiniStat label="نوبت امروز" value={toFa(stats.today)} />
          <MiniStat label="در انتظار تایید" value={toFa(stats.pending)} accent={stats.pending > 0} />
          <MiniStat label="این هفته" value={toFa(stats.week)} />
          <MiniStat label="درآمد امروز (تومان)" value={formatCompactToman(stats.revenue)} />
        </div>
      </section>

      <div className="grid gap-8 px-5 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_320px] lg:px-10 lg:pt-8">
        {/* Requests */}
        <section>
          <SectionHead icon={<Inbox size={18} />} title="درخواست‌ها" count={requests.length} />
          {all === undefined ? null : requests.length === 0 ? (
            <Card>
              <EmptyState
                title="درخواست تازه‌ای نیست"
                text={tenant.bookingSettings.confirmationMode === 'auto' ? 'تایید خودکار فعال است؛ نوبت‌ها مستقیم در تقویم می‌نشینند.' : 'درخواست‌های آنلاین اینجا ظاهر می‌شوند.'}
              />
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {requests.map((b) => (
                  <RequestCard key={b.id} b={b} now={now} today={today} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Agenda */}
        <section>
          <SectionHead
            icon={<CalendarDays size={18} />}
            title="برنامه امروز"
            count={agenda.length}
            action={
              <Link to={`${base}/calendar`} className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-muted hover:text-ink">
                تقویم <ChevronLeft size={15} />
              </Link>
            }
          />
          <Agenda list={agenda} now={now} />
          {tomorrowCount > 0 && <p className="mt-4 text-center text-[13px] text-muted">فردا {toFa(tomorrowCount)} نوبت دارید.</p>}
        </section>

        {/* Activity */}
        <aside className="lg:border-s lg:border-line lg:ps-8">
          <Activity />
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className={cn('numeral mt-1.5 text-[30px] [&>span]:text-base', accent && 'text-accent')}>{value}</div>
    </div>
  );
}

function SectionHead({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-extrabold">{title}</h2>
      {count != null && <span className="rounded-full bg-surface-2 px-2 text-[12px] font-bold tabular">{toFa(count)}</span>}
      <span className="flex-1" />
      {action}
    </div>
  );
}

function RequestCard({ b, now, today }: { b: Booking; now: number; today: string }) {
  const { ctx, tenant, bundle } = useDash();
  const open = useOpenBooking();
  const [busy, setBusy] = useState(false);
  const tz = tenant.timezone;
  const staff = bundle.staff.find((s) => s.id === b.staffId);
  const fresh = now - Date.parse(b.createdAt) < 5 * 60_000;

  const approve = async () => {
    setBusy(true);
    try {
      await data.bookings.transition(ctx, b.id, 'confirmed');
      toast(`نوبت ${b.customerName} تایید شد`);
    } catch (e) {
      toast(errorMessage(e), 'error');
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className={cn('rounded-theme-lg border border-line bg-surface p-4', fresh && 'pulse-once')}
    >
      <button onClick={() => open(b.id)} className="flex w-full items-start gap-3 text-start">
        <Avatar name={b.customerName} color={staff?.color ?? 'var(--ink)'} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold">{b.customerName}</span>
            {fresh && <span className="rounded-full bg-accent px-2 text-[11px] font-bold text-accent-ink">تازه</span>}
          </div>
          <div className="text-[13px] text-muted">
            {b.serviceName}
            {staff && ` · ${staff.name}`}
          </div>
        </div>
        <span className="text-[12px] whitespace-nowrap text-muted">{fmtAgo(Date.parse(b.createdAt), now)}</span>
      </button>
      <div className="mt-3 flex items-center gap-2 rounded-theme bg-surface-2 px-3 py-2 text-sm">
        <span className="font-bold">{fmtRelativeDay(civilDateOf(Date.parse(b.start), tz), today)}</span>
        <span className="text-muted">ساعت</span>
        <span className="font-bold tabular">{fmtTime(b.start, tz)}</span>
        {b.status === 'proposed' && <StatusPill status="proposed" className="ms-auto" />}
      </div>
      {b.customerNote && <p className="mt-2 text-[13px] text-muted">«{b.customerNote}»</p>}
      {b.autoDecision?.decision === 'review' && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
          <Sparkles size={13} className="text-accent" /> {b.autoDecision.reasons.join(' · ')}
        </p>
      )}
      {b.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <Button variant="primary" className="flex-1" icon={<Check size={17} />} loading={busy} onClick={approve}>
            تایید
          </Button>
          <Button variant="secondary" onClick={() => open(b.id)}>
            رد یا زمان دیگر
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function Agenda({ list, now }: { list: Booking[]; now: number }) {
  const { tenant, bundle } = useDash();
  const open = useOpenBooking();
  const openNew = useOpenNew();
  const tz = tenant.timezone;
  if (!list.length)
    return (
      <Card>
        <EmptyState title="امروز نوبتی ندارید" action={<Button variant="ink" onClick={() => openNew()}>ثبت نوبت</Button>} />
      </Card>
    );
  const nextIdx = list.findIndex((b) => Date.parse(b.end) > now);
  return (
    <ol className="relative">
      {list.map((b, i) => {
        const staff = bundle.staff.find((s) => s.id === b.staffId);
        const st = effectiveStatus(b, now);
        const past = Date.parse(b.end) <= now;
        const isNext = i === nextIdx;
        return (
          <li key={b.id}>
            {isNext && i > 0 && (
              <div className="my-1 flex items-center gap-2 text-[11px] font-bold text-accent">
                <span className="size-2 rounded-full bg-accent" /> اکنون <span className="h-px flex-1 bg-accent/50" />
              </div>
            )}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => open(b.id)}
              className={cn('press flex w-full items-center gap-3 rounded-theme px-2 py-2.5 text-start hover:bg-surface-2', past && 'opacity-55', isNext && 'bg-accent-soft hover:bg-accent-soft')}
            >
              <span className="w-12 shrink-0 text-[15px] font-bold tabular">{fmtTime(b.start, tz)}</span>
              <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: staff?.color ?? 'var(--ink)' }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{b.customerName}</span>
                <span className="block truncate text-[13px] text-muted">
                  {b.serviceName}
                  {bundle.staff.length > 1 && staff ? ` · ${staff.name}` : ''}
                </span>
              </span>
              {st === 'completed' ? (
                <Check size={18} className="text-confirmed" />
              ) : st !== 'confirmed' ? (
                <Dot color={STATUS_COLOR[st]} size={9} />
              ) : null}
            </motion.button>
          </li>
        );
      })}
    </ol>
  );
}

function Activity() {
  const { tenant } = useDash();
  const audit = useAudit(tenant.id).data ?? [];
  const now = useNow();
  return (
    <div>
      <h2 className="mb-4 text-lg font-extrabold">فعالیت‌های اخیر</h2>
      {audit.length === 0 ? (
        <p className="text-sm text-muted">هنوز فعالیتی ثبت نشده است.</p>
      ) : (
        <ol className="flex flex-col gap-3.5 border-s border-line ps-4">
          {audit.slice(0, 8).map((a) => (
            <li key={a.id} className="relative text-[13px] leading-6">
              <span className={cn('absolute top-2 -start-[21px] size-2 rounded-full', a.actorRole === 'customer' ? 'bg-accent' : 'bg-ink/30')} />
              <div className="font-semibold">{a.summary}</div>
              <div className="text-muted">
                {a.actorName} · {fmtAgo(Date.parse(a.at), now)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
