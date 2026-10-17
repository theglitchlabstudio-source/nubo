// Manual booking (walk-in / phone call). Opened via ?new=1 (+ optional nd/nt/nst/nc prefills).
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Search, UserPlus, X } from 'lucide-react';
import { useDash } from './context';
import { SlotPicker } from './shared';
import { useCustomers, useNow, useSlotInputs } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { BookingSource, Customer } from '@/domain/types';
import { civilDateOf, fmtDayLong, fmtDuration, fmtTime, todayIn } from '@/lib/time';
import { fmtMobile, isValidMobile, matchesSearch } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Avatar, Button, Field, Input, Segmented, Skeleton, Textarea } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export function NewBookingSheet() {
  const [params, setParams] = useSearchParams();
  const open = params.get('new') === '1';
  const close = () => {
    const next = new URLSearchParams(params);
    ['new', 'nd', 'nt', 'nst', 'nc'].forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  };
  return (
    <Sheet open={open} onClose={close} title="نوبت جدید" size="lg">
      {open && <Form params={params} onDone={close} />}
    </Sheet>
  );
}

function Form({ params, onDone }: { params: URLSearchParams; onDone: () => void }) {
  const { ctx, tenant, bundle } = useDash();
  const inputs = useSlotInputs(tenant.id).data;
  const customers = useCustomers(ctx).data ?? [];
  const now = useNow();
  const tz = tenant.timezone;
  const services = bundle.services.filter((s) => s.active && s.staffIds.length);

  const [query, setQuery] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const service = services.find((s) => s.id === serviceId);
  const [staffId, setStaffId] = useState(params.get('nst') ?? service?.staffIds[0] ?? '');
  const [date, setDate] = useState(params.get('nd') ?? todayIn(tz, now));
  const [start, setStart] = useState<number | null>(params.get('nt') ? Number(params.get('nt')) : null);
  const [source, setSource] = useState<BookingSource>('phone');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = params.get('nc');
    if (c) setCustomer(customers.find((x) => x.id === c) ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.length]);

  // Keep the staff valid for the chosen service.
  useEffect(() => {
    if (service && !service.staffIds.includes(staffId)) setStaffId(service.staffIds[0]);
  }, [service, staffId]);

  const matches = useMemo(
    () => (query.trim() ? customers.filter((c) => matchesSearch(`${c.name} ${c.mobile}`, query)).slice(0, 6) : []),
    [customers, query],
  );

  const who = customer ? { name: customer.name, mobile: customer.mobile } : { name, mobile };
  const valid = !!service && !!start && who.name.trim().length >= 2 && isValidMobile(who.mobile);

  const submit = async () => {
    if (!valid || !service || !start) return;
    setBusy(true);
    try {
      await data.bookings.createManual(ctx, { serviceId: service.id, staffId, start, customerId: customer?.id, name: who.name, mobile: who.mobile, note, source });
      toast('نوبت ثبت شد');
      onDone();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!inputs) return <Skeleton className="h-80" />;

  return (
    <div className="flex flex-col gap-6 pb-2">
      {/* Customer */}
      <section>
        <div className="mb-2 text-[13px] font-semibold text-muted">مشتری</div>
        {customer ? (
          <div className="flex items-center gap-3 rounded-theme-lg border border-ink bg-surface p-3">
            <Avatar name={customer.name} color="var(--ink)" size={40} />
            <div className="min-w-0 flex-1">
              <div className="font-bold">{customer.name}</div>
              <div className="text-[13px] text-muted tabular">{fmtMobile(customer.mobile)}</div>
            </div>
            <button aria-label="تغییر مشتری" onClick={() => setCustomer(null)} className="press grid size-10 place-items-center rounded-full hover:bg-surface-2">
              <X size={18} />
            </button>
          </div>
        ) : newMode ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="نام و نام خانوادگی" autoFocus />
            <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="09xx xxx xxxx" inputMode="tel" dir="ltr" className="text-start tabular" />
            <button onClick={() => setNewMode(false)} className="text-start text-[13px] font-semibold text-muted sm:col-span-2">
              ← جست‌وجو در مشتریان
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="نام یا شماره موبایل" className="ps-11" />
            </div>
            {matches.length > 0 && (
              <div className="mt-2 divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
                {matches.map((c) => (
                  <button key={c.id} onClick={() => setCustomer(c)} className="press flex w-full items-center gap-3 p-3 text-start hover:bg-surface-2">
                    <Avatar name={c.name} color="var(--ink)" size={34} />
                    <span className="flex-1 font-semibold">{c.name}</span>
                    <span className="text-[13px] text-muted tabular">{fmtMobile(c.mobile)}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setNewMode(true);
                if (/\d/.test(query)) setMobile(query);
                else setName(query);
              }}
              className="press mt-2 flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-surface-2"
            >
              <UserPlus size={17} /> مشتری جدید{query && !matches.length ? `: ${query}` : ''}
            </button>
          </div>
        )}
      </section>

      {/* Service */}
      <section>
        <div className="mb-2 text-[13px] font-semibold text-muted">خدمت</div>
        <div className="flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setServiceId(s.id);
                setStart(null);
              }}
              className={cn('press rounded-full border px-4 py-2 text-sm font-semibold', s.id === serviceId ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}
            >
              {s.name} <span className="font-normal opacity-60">· {fmtDuration(s.durationMin)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Time */}
      {service && (
        <section>
          <div className="mb-2 text-[13px] font-semibold text-muted">زمان</div>
          <SlotPicker
            inputs={inputs}
            service={service}
            staff={bundle.staff}
            staffId={staffId}
            onStaff={(id) => {
              setStaffId(id);
              setStart(null);
            }}
            date={date}
            onDate={(d) => {
              setDate(d);
              setStart(null);
            }}
            today={todayIn(tz, now)}
            selected={start}
            onPick={setStart}
            allowCustom
            now={now}
          />
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="نوع مراجعه">
          <Segmented
            value={source}
            onChange={setSource}
            options={[
              { value: 'phone', label: 'تلفنی' },
              { value: 'walk_in', label: 'حضوری' },
            ]}
          />
        </Field>
        <Field label="یادداشت داخلی">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={1} className="min-h-12" placeholder="اختیاری" />
        </Field>
      </section>

      <div className="glass sticky bottom-0 -mx-5 border-t border-line px-5 py-3 md:-mx-6 md:px-6">
        <Button variant="primary" size="lg" block disabled={!valid} loading={busy} onClick={submit}>
          {start ? `ثبت نوبت · ${fmtDayLong(civilDateOf(start, tz))} ساعت ${fmtTime(start, tz)}` : 'ثبت نوبت'}
        </Button>
      </div>
    </div>
  );
}
