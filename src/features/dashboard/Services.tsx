import { useState } from 'react';
import { Plus, Clock, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { PriceType, Service } from '@/domain/types';
import { priceLabel } from '@/features/public/helpers';
import { fmtDuration } from '@/lib/time';
import { formatNumber, parseNumber, toFa } from '@/lib/digits';
import { uid } from '@/lib/cn';
import { cn } from '@/lib/cn';
import { Avatar, Button, Card, EmptyState, Field, Input, Segmented, Switch, Textarea } from '@/ui/primitives';
import { Confirm, Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120, 180, 240];

export default function Services() {
  const { bundle, can, tenant } = useDash();
  const [editing, setEditing] = useState<Service | null>(null);
  const editable = can('services.edit');
  const services = bundle.services;
  const categories = [...new Set(services.map((s) => s.category || 'سایر'))];

  const blank = (): Service => ({
    id: uid('sv'),
    tenantId: tenant.id,
    name: '',
    description: '',
    category: categories[0] ?? '',
    durationMin: 30,
    bufferAfterMin: null,
    priceToman: 0,
    priceType: 'fixed',
    staffIds: bundle.staff.filter((s) => s.active).map((s) => s.id),
    active: true,
    autoConfirmSafe: false,
    sortOrder: services.length,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="خدمات"
        subtitle={`${toFa(services.filter((s) => s.active).length)} خدمت فعال`}
        actions={
          editable && (
            <Button variant="ink" icon={<Plus size={17} />} onClick={() => setEditing(blank())}>
              خدمت جدید
            </Button>
          )
        }
      />
      <Page>
        {!editable && (
          <p className="mb-4 flex items-center gap-2 rounded-theme bg-surface-2 p-3 text-sm text-muted">
            <Lock size={15} /> فقط مدیر کسب‌وکار می‌تواند خدمات را ویرایش کند.
          </p>
        )}
        {services.length === 0 ? (
          <Card>
            <EmptyState title="هنوز خدمتی تعریف نشده" action={editable && <Button variant="ink" onClick={() => setEditing(blank())}>افزودن اولین خدمت</Button>} />
          </Card>
        ) : (
          categories.map((cat) => (
            <section key={cat} className="mb-8">
              <div className="mb-2 text-[13px] font-semibold text-muted">{cat}</div>
              <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
                {services
                  .filter((s) => (s.category || 'سایر') === cat)
                  .map((s, i) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      disabled={!editable}
                      onClick={() => setEditing(s)}
                      className={cn('press flex w-full items-center gap-4 p-4 text-start hover:bg-surface-2 disabled:cursor-default', !s.active && 'opacity-50')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-bold">
                          {s.name}
                          {!s.active && <span className="rounded-full bg-surface-2 px-2 text-[11px] font-semibold text-muted">غیرفعال</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Clock size={13} /> {fmtDuration(s.durationMin)}
                          </span>
                          <span className="font-semibold text-ink">{priceLabel(s)}</span>
                        </div>
                      </div>
                      <div className="flex -space-x-2 space-x-reverse">
                        {s.staffIds.slice(0, 4).map((id) => {
                          const st = bundle.staff.find((x) => x.id === id);
                          return st ? <Avatar key={id} name={st.name} color={st.color} photo={st.photo} size={28} className="ring-2 ring-surface" /> : null;
                        })}
                      </div>
                    </motion.button>
                  ))}
              </div>
            </section>
          ))
        )}
      </Page>
      <ServiceEditor service={editing} onClose={() => setEditing(null)} isNew={!!editing && !services.some((s) => s.id === editing.id)} />
    </div>
  );
}

function ServiceEditor({ service, onClose, isNew }: { service: Service | null; onClose: () => void; isNew: boolean }) {
  return (
    <Sheet open={!!service} onClose={onClose} title={isNew ? 'خدمت جدید' : 'ویرایش خدمت'}>
      {service && <ServiceForm key={service.id} initial={service} onClose={onClose} isNew={isNew} />}
    </Sheet>
  );
}

function ServiceForm({ initial, onClose, isNew }: { initial: Service; onClose: () => void; isNew: boolean }) {
  const { ctx, bundle, features } = useDash();
  const [s, setS] = useState(initial);
  const [price, setPrice] = useState(initial.priceToman ? formatNumber(initial.priceToman) : '');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (patch: Partial<Service>) => setS((x) => ({ ...x, ...patch }));
  const valid = s.name.trim().length > 1 && s.staffIds.length > 0;

  const save = async () => {
    setBusy(true);
    try {
      const p = parseNumber(price);
      await data.services.save(ctx, { ...s, name: s.name.trim(), priceToman: Number.isFinite(p) ? p : 0 });
      toast('خدمت ذخیره شد');
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Field label="نام خدمت">
        <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="مثلاً اصلاح مو" autoFocus={isNew} />
      </Field>
      <Field label="دسته‌بندی" hint="برای گروه‌بندی در صفحه رزرو">
        <Input value={s.category} onChange={(e) => set({ category: e.target.value })} placeholder="مثلاً مو" list="cats" />
        <datalist id="cats">
          {[...new Set(bundle.services.map((x) => x.category))].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="مدت">
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button key={d} onClick={() => set({ durationMin: d })} className={cn('press h-10 rounded-full border px-3.5 text-sm font-semibold tabular', s.durationMin === d ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}>
              {d < 60 ? `${toFa(d)}′` : fmtDuration(d).replace(' ساعت', 'h').replace(' و ', ' ').replace(' دقیقه', '′')}
            </button>
          ))}
        </div>
      </Field>
      <Field label="فاصله بعد از نوبت (دقیقه)" hint="برای تمیزکاری یا آماده‌سازی. خالی = پیش‌فرض کسب‌وکار">
        <Input
          value={s.bufferAfterMin == null ? '' : toFa(s.bufferAfterMin)}
          onChange={(e) => {
            const n = parseNumber(e.target.value);
            set({ bufferAfterMin: Number.isFinite(n) ? n : null });
          }}
          inputMode="numeric"
          placeholder="پیش‌فرض"
        />
      </Field>
      <Field label="قیمت">
        <Segmented
          value={s.priceType}
          onChange={(v: PriceType) => set({ priceType: v })}
          size="sm"
          options={[
            { value: 'fixed', label: 'ثابت' },
            { value: 'from', label: 'از …' },
            { value: 'free', label: 'رایگان' },
            { value: 'hidden', label: 'حضوری' },
          ]}
        />
        {(s.priceType === 'fixed' || s.priceType === 'from') && (
          <div className="relative mt-2">
            <Input value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => price && setPrice(formatNumber(parseNumber(price) || 0))} inputMode="numeric" className="pe-16 tabular" placeholder="۰" />
            <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm text-muted">تومان</span>
          </div>
        )}
      </Field>
      <Field label="توضیحات (اختیاری)">
        <Textarea value={s.description} onChange={(e) => set({ description: e.target.value })} rows={2} />
      </Field>
      <Field label="چه کسانی انجام می‌دهند؟">
        <div className="flex flex-wrap gap-2">
          {bundle.staff
            .filter((x) => x.active)
            .map((st) => {
              const on = s.staffIds.includes(st.id);
              return (
                <button
                  key={st.id}
                  onClick={() => set({ staffIds: on ? s.staffIds.filter((x) => x !== st.id) : [...s.staffIds, st.id] })}
                  className={cn('press flex items-center gap-2 rounded-full border py-1 ps-1 pe-3.5 text-sm font-semibold', on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}
                >
                  <Avatar name={st.name} color={st.color} photo={st.photo} size={28} /> {st.name}
                </button>
              );
            })}
        </div>
      </Field>
      <Card className="px-4 py-2">
        <Switch checked={s.active} onChange={(v) => set({ active: v })} label="فعال" description="در صفحه رزرو نمایش داده شود" />
        {features.smartConfirm && <Switch checked={s.autoConfirmSafe} onChange={(v) => set({ autoConfirmSafe: v })} label="مناسب تایید هوشمند" description="در حالت هوشمند می‌تواند خودکار تایید شود" />}
      </Card>
      <div className="flex gap-2 pt-2">
        <Button variant="primary" size="lg" block disabled={!valid} loading={busy} onClick={save}>
          ذخیره
        </Button>
        {!isNew && (
          <Button variant="danger" size="lg" onClick={() => setConfirmDel(true)}>
            حذف
          </Button>
        )}
      </div>
      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="حذف خدمت؟"
        text="نوبت‌های قبلی این خدمت باقی می‌مانند. پیشنهاد: به‌جای حذف، خدمت را غیرفعال کنید."
        danger
        confirmLabel="حذف"
        onConfirm={async () => {
          await data.services.remove(ctx, s.id);
          toast('خدمت حذف شد');
          setConfirmDel(false);
          onClose();
        }}
      />
    </div>
  );
}
