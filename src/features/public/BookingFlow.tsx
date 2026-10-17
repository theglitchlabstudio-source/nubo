// The booking wizard. One decision per step; state lives in the URL (?s=&p=&d=&t=)
// so back/forward and refresh work. Used full-screen on phones and inside the sticky panel on desktop.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Clock, Users, X, Sparkles } from 'lucide-react';
import { usePublic } from './PublicLayout';
import { needsStaffStep, priceLabel, rememberCustomer, rememberedCustomer } from './helpers';
import { useNow, useSlotInputs } from '@/data/hooks';
import { data } from '@/data';
import { DataError, errorMessage } from '@/data/errors';
import { getDayStatus, getSlots } from '@/domain/slots';
import type { Service, Staff } from '@/domain/types';
import { type CivilDate, civilDateOf, fmtDayLong, fmtDuration, fmtTime, jalaliOf, todayIn } from '@/lib/time';
import { JALALI_MONTHS } from '@/lib/jalali';
import { toFa } from '@/lib/digits';
import { isValidMobile } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Avatar, Button, EmptyState, Field, IconButton, Input, Skeleton, Textarea } from '@/ui/primitives';
import { DotCalendar, type DotDayStatus } from '@/ui/DotCalendar';
import { SlotGrid } from '@/ui/SlotGrid';
import { toast } from '@/ui/Toast';

type Step = 'service' | 'staff' | 'date' | 'time' | 'details';
const ORDER: { step: Step; key: string }[] = [
  { step: 'service', key: 's' },
  { step: 'staff', key: 'p' },
  { step: 'date', key: 'd' },
  { step: 'time', key: 't' },
  { step: 'details', key: '' },
];
const TITLES: Record<Step, string> = {
  service: 'چه خدمتی می‌خواهید؟',
  staff: 'با چه کسی؟',
  date: 'چه روزی؟',
  time: 'چه ساعتی؟',
  details: 'اطلاعات شما',
};

export function BookingFlow({ embedded, onExit }: { embedded?: boolean; onExit?: () => void }) {
  const { tenant, services, staff } = usePublic();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const inputsQ = useSlotInputs(tenant.id);
  const now = useNow();

  const activeServices = services.filter((s) => s.active && s.staffIds.length);
  const service = activeServices.find((s) => s.id === params.get('s'));
  const staffStep = needsStaffStep(tenant, service);
  const steps = ORDER.filter((o) => o.step !== 'staff' || staffStep);
  const staffParam = staffStep ? params.get('p') : service ? (service.staffIds.length === 1 ? service.staffIds[0] : 'any') : null;
  const date = params.get('d') as CivilDate | null;
  const time = params.get('t') ? Number(params.get('t')) : null;

  const values: Record<string, string | null> = { s: service?.id ?? null, p: staffParam, d: date, t: time ? String(time) : null };
  const current = steps.find((o) => o.key && !values[o.key])?.step ?? 'details';
  const index = steps.findIndex((o) => o.step === current);
  const [dir, setDir] = useState(1);

  const set = (key: string, value: string) => {
    setDir(1);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      // Changing an earlier choice clears the later ones.
      const pos = ORDER.findIndex((o) => o.key === key);
      for (const o of ORDER.slice(pos + 1)) if (o.key) next.delete(o.key);
      return next;
    });
  };

  const back = () => {
    if (index === 0) {
      onExit ? onExit() : navigate(`/b/${tenant.slug}`);
      return;
    }
    setDir(-1);
    const prevKey = steps[index - 1].key;
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      const pos = ORDER.findIndex((o) => o.key === prevKey);
      for (const o of ORDER.slice(pos)) if (o.key) next.delete(o.key);
      return next;
    });
  };

  const staffObj = staff.find((s) => s.id === staffParam);

  return (
    <div className={cn('flex flex-col', !embedded && 'min-h-dvh')}>
      {/* Top bar */}
      <div className={cn('z-10 flex items-center gap-2', embedded ? 'pb-4' : 'glass sticky top-0 border-b border-line px-3 py-2')}>
        <IconButton label="بازگشت" onClick={back}>
          <ArrowRight size={21} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <Progress count={steps.length} index={index} />
          <div className="mt-1 truncate text-[12px] text-muted">
            مرحله {toFa(index + 1)} از {toFa(steps.length)} · {tenant.name}
          </div>
        </div>
        {!embedded && (
          <IconButton label="بستن" onClick={() => navigate(`/b/${tenant.slug}`)}>
            <X size={20} />
          </IconButton>
        )}
      </div>

      <div className={cn('flex-1', !embedded && 'mx-auto w-full max-w-xl px-5 pt-5 pb-10')}>
        <h1 className={cn('font-extrabold tracking-tight', embedded ? 'text-[22px]' : 'text-[27px]')}>{TITLES[current]}</h1>
        <Summary service={service} staff={staffStep ? staffObj : undefined} anyStaff={staffStep && staffParam === 'any'} date={date} time={time} tz={tenant.timezone} onEdit={(k) => {
          setDir(-1);
          setParams((prev) => {
            const next = new URLSearchParams(prev);
            const pos = ORDER.findIndex((o) => o.key === k);
            for (const o of ORDER.slice(pos)) if (o.key) next.delete(o.key);
            return next;
          });
        }} />

        <div className="relative mt-5">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={current}
              custom={dir}
              initial={{ opacity: 0, x: dir * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * 28 }}
              transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {current === 'service' && <ServiceStep services={activeServices} staff={staff} onPick={(s) => set('s', s.id)} />}
              {current === 'staff' && service && <StaffStep service={service} staff={staff} onPick={(id) => set('p', id)} />}
              {(current === 'date' || current === 'time') && !inputsQ.data && <Skeleton className="h-80 w-full" />}
              {current === 'date' && service && inputsQ.data && (
                <DotCalendar
                  today={todayIn(tenant.timezone, now)}
                  selected={date}
                  onSelect={(d) => set('d', d)}
                  statusOf={(d): DotDayStatus => {
                    const st = getDayStatus(inputsQ.data!, service, staffParam ?? 'any', d, now);
                    if (st === 'closed' && inputsQ.data!.holidays.some((h) => !h.disabled && civilDateOf(Date.parse(h.start), tenant.timezone) === d)) return 'holiday';
                    return st;
                  }}
                  holidayTitle={(d) => inputsQ.data!.holidays.find((h) => civilDateOf(Date.parse(h.start), tenant.timezone) === d)?.reason}
                />
              )}
              {current === 'time' && service && date && inputsQ.data && (
                <TimeStep
                  slots={getSlots(inputsQ.data, { date, service, staffId: staffParam ?? 'any', now })}
                  tz={tenant.timezone}
                  date={date}
                  onPick={(start) => set('t', String(start))}
                  onOtherDay={back}
                />
              )}
              {current === 'details' && service && date && time && (
                <DetailsStep service={service} staffId={staffParam ?? 'any'} start={time} embedded={embedded} onSlotTaken={() => {
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('t');
                    return next;
                  });
                }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Progress({ count, index }: { count: number; index: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          className={cn('h-1.5 rounded-full', i < index ? 'bg-ink' : i === index ? 'bg-accent' : 'bg-ink/15')}
          animate={{ width: i === index ? 26 : 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      ))}
    </div>
  );
}

function Summary({
  service,
  staff,
  anyStaff,
  date,
  time,
  tz,
  onEdit,
}: {
  service?: Service;
  staff?: Staff;
  anyStaff?: boolean;
  date: CivilDate | null;
  time: number | null;
  tz: string;
  onEdit: (key: string) => void;
}) {
  const chips: { key: string; label: string }[] = [];
  if (service) chips.push({ key: 's', label: service.name });
  if (staff) chips.push({ key: 'p', label: staff.name });
  else if (anyStaff) chips.push({ key: 'p', label: 'هر کدام زودتر' });
  if (date) chips.push({ key: 'd', label: fmtDayLong(date) });
  if (time) chips.push({ key: 't', label: `ساعت ${fmtTime(time, tz)}` });
  if (!chips.length) return null;
  return (
    <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
      <AnimatePresence initial={false}>
        {chips.map((c) => (
          <motion.button
            key={c.key}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => onEdit(c.key)}
            className="press shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium hover:border-ink/40"
          >
            {c.label}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ServiceStep({ services, staff, onPick }: { services: Service[]; staff: Staff[]; onPick: (s: Service) => void }) {
  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))];
  const [cat, setCat] = useState<string>('all');
  const list = cat === 'all' ? services : services.filter((s) => s.category === cat);
  return (
    <div>
      {categories.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {['all', ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn('press relative h-9 shrink-0 rounded-full px-4 text-sm font-semibold', cat === c ? 'text-paper' : 'bg-surface-2 text-muted')}
            >
              {cat === c && <motion.span layoutId="svc-cat" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              <span className="relative">{c === 'all' ? 'همه' : c}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {list.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onPick(s)}
            className="press group flex items-center gap-4 rounded-theme-lg border border-line bg-surface p-4 text-start hover:border-ink/35"
          >
            <div className="min-w-0 flex-1">
              <div className="font-bold">{s.name}</div>
              {s.description && <div className="mt-0.5 line-clamp-1 text-[13px] text-muted">{s.description}</div>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} /> {fmtDuration(s.durationMin)}
                </span>
                <span className="font-semibold text-ink">{priceLabel(s)}</span>
              </div>
            </div>
            <div className="flex -space-x-2 space-x-reverse">
              {s.staffIds.slice(0, 3).map((id) => {
                const st = staff.find((x) => x.id === id);
                return st ? <Avatar key={id} name={st.name} color={st.color} photo={st.photo} size={28} className="ring-2 ring-surface" /> : null;
              })}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function StaffStep({ service, staff, onPick }: { service: Service; staff: Staff[]; onPick: (id: string) => void }) {
  const list = staff.filter((s) => s.active && service.staffIds.includes(s.id));
  return (
    <div className="flex flex-col gap-2.5">
      <button onClick={() => onPick('any')} className="press flex items-center gap-4 rounded-theme-lg border border-ink bg-ink p-4 text-start text-paper">
        <span className="relative grid size-12 place-items-center">
          <span className="absolute top-1 right-1 size-5 rounded-full bg-accent" />
          <span className="absolute bottom-1 left-1 size-6 rounded-full bg-paper/80" />
          <span className="absolute bottom-2 right-2 size-3 rounded-full bg-paper/40" />
        </span>
        <span>
          <span className="flex items-center gap-1.5 font-bold">
            هر کدام زودتر <Sparkles size={15} className="text-accent" />
          </span>
          <span className="text-[13px] opacity-70">اولین زمان آزاد را نشان می‌دهیم</span>
        </span>
      </button>
      {list.map((s, i) => (
        <motion.button
          key={s.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 + i * 0.04 }}
          onClick={() => onPick(s.id)}
          className="press flex items-center gap-4 rounded-theme-lg border border-line bg-surface p-4 text-start hover:border-ink/35"
        >
          <Avatar name={s.name} color={s.color} photo={s.photo} size={48} />
          <span>
            <span className="block font-bold">{s.name}</span>
            <span className="text-[13px] text-muted">{s.title}</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function TimeStep({ slots, tz, date, onPick, onOtherDay }: { slots: ReturnType<typeof getSlots>; tz: string; date: CivilDate; onPick: (start: number) => void; onOtherDay: () => void }) {
  const j = jalaliOf(date);
  return (
    <div>
      <div className="mb-5 flex items-end gap-3 border-b border-line pb-4">
        <span className="numeral text-[56px]">{toFa(j.jd)}</span>
        <span className="pb-1.5">
          <span className="block font-bold">{JALALI_MONTHS[j.jm - 1]}</span>
          <span className="text-sm text-muted">{fmtDayLong(date).split(' ')[0]} · {toFa(slots.length)} زمان آزاد</span>
        </span>
      </div>
      {slots.length ? (
        <SlotGrid slots={slots} tz={tz} selected={null} onSelect={(s) => onPick(s.start)} />
      ) : (
        <EmptyState title="این روز پر شد" text="روز دیگری را انتخاب کنید." action={<Button onClick={onOtherDay}>انتخاب روز دیگر</Button>} />
      )}
    </div>
  );
}

function DetailsStep({ service, staffId, start, embedded, onSlotTaken }: { service: Service; staffId: string; start: number; embedded?: boolean; onSlotTaken: () => void }) {
  const { tenant, staff } = usePublic();
  const navigate = useNavigate();
  const remembered = useMemo(rememberedCustomer, []);
  const [name, setName] = useState(remembered.name);
  const [mobile, setMobile] = useState(remembered.mobile);
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const tz = tenant.timezone;
  const date = civilDateOf(start, tz);
  const j = jalaliOf(date);
  const auto = tenant.bookingSettings.confirmationMode === 'auto';
  const nameErr = touched && name.trim().length < 2 && 'نام را کامل بنویسید';
  const mobileErr = touched && !isValidMobile(mobile) && 'شماره موبایل درست نیست (مثل ۰۹۱۲۳۴۵۶۷۸۹)';
  const st = staff.find((s) => s.id === staffId);

  const submit = async () => {
    setTouched(true);
    if (name.trim().length < 2 || !isValidMobile(mobile)) return;
    setBusy(true);
    try {
      const res = await data.bookings.createRequest(tenant.slug, { serviceId: service.id, staffId, start, name, mobile, note });
      rememberCustomer({ name, mobile });
      navigate(`/b/${tenant.slug}/booking/${res.code}?new=1`, { replace: true });
    } catch (e) {
      toast(errorMessage(e), 'error');
      if (e instanceof DataError && e.code === 'SLOT_TAKEN') onSlotTaken();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-stretch overflow-hidden rounded-theme-lg border border-line bg-surface">
        <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-accent text-accent-ink">
          <span className="numeral text-[44px]">{toFa(j.jd)}</span>
          <span className="mt-1 text-[13px] font-semibold">{JALALI_MONTHS[j.jm - 1]}</span>
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="text-[13px] text-muted">{fmtDayLong(date).split(' ')[0]} · ساعت {fmtTime(start, tz)}</div>
          <div className="mt-1 font-bold">{service.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-muted">
            <span>{fmtDuration(service.durationMin)}</span>
            <span className="font-semibold text-ink">{priceLabel(service)}</span>
            {st && (
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> {st.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <Field label="نام و نام خانوادگی" error={nameErr} htmlFor="bk-name">
        <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="مثلاً سارا محمدی" invalid={!!nameErr} />
      </Field>
      <Field label="شماره موبایل" error={mobileErr} hint="تایید نوبت به همین شماره پیامک می‌شود" htmlFor="bk-mobile">
        <Input
          id="bk-mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          className="text-start tabular"
          placeholder="09xx xxx xxxx"
          invalid={!!mobileErr}
        />
      </Field>
      <Field label="توضیحات (اختیاری)" htmlFor="bk-note">
        <Textarea id="bk-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="اگر نکته‌ای هست بنویسید" />
      </Field>

      {tenant.profile.bookingRulesText && (
        <p className="rounded-theme bg-surface-2 p-3.5 text-[13px] leading-6 text-muted">{tenant.profile.bookingRulesText}</p>
      )}

      <div className={cn(!embedded && 'glass pb-safe sticky bottom-0 -mx-5 border-t border-line px-5 pt-3 pb-3')}>
        <Button variant="primary" size="lg" block loading={busy} onClick={submit}>
          {auto ? 'ثبت نوبت' : 'ارسال درخواست نوبت'}
        </Button>
        {!auto && <p className="mt-2 text-center text-[12px] text-muted">نوبت پس از تایید {tenant.name} قطعی می‌شود.</p>}
      </div>
    </div>
  );
}
