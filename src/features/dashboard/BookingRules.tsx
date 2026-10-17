import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Hand, Zap, Sparkles, Lock } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { BookingSettings, ConfirmationMode } from '@/domain/types';
import { toFa } from '@/lib/digits';
import { cn } from '@/lib/cn';
import { Button, Card, Field, Segmented, Select, Switch, Textarea } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

const MODES: { id: ConfirmationMode; title: string; text: string; icon: typeof Hand }[] = [
  { id: 'manual', title: 'تایید دستی', text: 'هر درخواست اول به صندوق شما می‌آید و شما تایید یا رد می‌کنید.', icon: Hand },
  { id: 'auto', title: 'تایید خودکار', text: 'نوبت‌ها بلافاصله قطعی می‌شوند. مناسب برنامه‌های منظم.', icon: Zap },
  { id: 'smart', title: 'تایید هوشمند', text: 'مشتری‌های آشنا خودکار تایید می‌شوند؛ موارد خاص برای بررسی می‌آیند.', icon: Sparkles },
];

export default function BookingRules() {
  const { tenant, ctx, can, features } = useDash();
  const [s, setS] = useState<BookingSettings>(tenant.bookingSettings);
  const [rulesText, setRulesText] = useState(tenant.profile.bookingRulesText);
  const [busy, setBusy] = useState(false);
  const editable = can('rules.edit');
  useEffect(() => setS(tenant.bookingSettings), [tenant.bookingSettings]);
  const set = (patch: Partial<BookingSettings>) => setS((x) => ({ ...x, ...patch }));
  const dirty = JSON.stringify(s) !== JSON.stringify(tenant.bookingSettings) || rulesText !== tenant.profile.bookingRulesText;

  const save = async () => {
    setBusy(true);
    try {
      await data.tenants.update(ctx, { bookingSettings: s, profile: { ...tenant.profile, bookingRulesText: rulesText } });
      toast('قوانین ذخیره شد');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="قوانین نوبت‌دهی" subtitle="مشتری‌ها چطور و تا کی نوبت بگیرند" />
      <Page>
        {!editable && (
          <p className="mb-5 flex items-center gap-2 rounded-theme bg-surface-2 p-3 text-sm text-muted">
            <Lock size={15} /> فقط مدیر کسب‌وکار می‌تواند این بخش را تغییر دهد.
          </p>
        )}
        <fieldset disabled={!editable} className="flex flex-col gap-10">
          <section>
            <h2 className="mb-3 text-lg font-extrabold">تایید درخواست‌ها</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => {
                const locked = m.id === 'smart' && !features.smartConfirm;
                const on = s.confirmationMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={locked}
                    onClick={() => set({ confirmationMode: m.id })}
                    className={cn('press relative flex flex-col items-start rounded-theme-lg border p-4 text-start', on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink/30', locked && 'opacity-60')}
                  >
                    <m.icon size={22} className={on ? 'text-accent' : ''} />
                    <span className="mt-3 font-bold">{m.title}</span>
                    <span className={cn('mt-1 text-[13px] leading-6', on ? 'opacity-75' : 'text-muted')}>{m.text}</span>
                    {locked && <span className="absolute top-3 end-3 rounded-full border border-line px-1.5 text-[10px] font-bold">PRO</span>}
                    {on && <motion.span layoutId="mode-dot" className="absolute top-4 end-4 size-2.5 rounded-full bg-accent" />}
                  </button>
                );
              })}
            </div>
            {s.confirmationMode === 'smart' && (
              <Card className="mt-3 px-4 py-2">
                <Switch checked={s.smartRules.allowFirstVisit} onChange={(v) => set({ smartRules: { ...s.smartRules, allowFirstVisit: v } })} label="مراجعه اول هم خودکار تایید شود" />
                <div className="flex items-center gap-4 py-2">
                  <span className="flex-1 font-medium">حداکثر غیبت قبلی</span>
                  <div className="w-32">
                    <Select value={s.smartRules.maxNoShows} onChange={(e) => set({ smartRules: { ...s.smartRules, maxNoShows: Number(e.target.value) } })}>
                      {[0, 1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {toFa(n)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2">
                  <span className="flex-1 font-medium">حداقل فاصله تا نوبت</span>
                  <div className="w-32">
                    <Select value={s.smartRules.minHoursAhead} onChange={(e) => set({ smartRules: { ...s.smartRules, minHoursAhead: Number(e.target.value) } })}>
                      {[0, 1, 2, 3, 6, 12, 24].map((n) => (
                        <option key={n} value={n}>
                          {n ? `${toFa(n)} ساعت` : 'بدون محدودیت'}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Switch checked={s.smartRules.oneActivePerDay} onChange={(v) => set({ smartRules: { ...s.smartRules, oneActivePerDay: v } })} label="فقط یک نوبت در روز برای هر مشتری" />
                <p className="pb-2 text-[12px] text-muted">در خدمات هم مشخص کنید کدام‌ها «مناسب تایید هوشمند» هستند. دلیل هر تصمیم کنار درخواست نمایش داده می‌شود.</p>
              </Card>
            )}
            {s.confirmationMode !== 'auto' && (
              <Card className="mt-3 px-4 py-2">
                <Switch checked={s.holdPendingSlots} onChange={(v) => set({ holdPendingSlots: v })} label="نگه داشتن زمان تا تایید" description="زمان درخواست‌شده برای دیگران نمایش داده نمی‌شود" />
                <div className="flex items-center gap-4 py-2">
                  <span className="flex-1">
                    <span className="block font-medium">انقضای درخواست بی‌پاسخ</span>
                    <span className="text-sm text-muted">بعد از این مدت، زمان دوباره آزاد می‌شود</span>
                  </span>
                  <div className="w-32">
                    <Select value={s.pendingExpiryHours} onChange={(e) => set({ pendingExpiryHours: Number(e.target.value) })}>
                      {[2, 6, 12, 24, 48].map((n) => (
                        <option key={n} value={n}>
                          {toFa(n)} ساعت
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">زمان‌بندی</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="فاصله زمان‌های نوبت" hint="مثلاً ۳۰ دقیقه: ۱۰:۰۰، ۱۰:۳۰، ۱۱:۰۰…">
                <Segmented
                  value={String(s.slotIntervalMin)}
                  onChange={(v) => set({ slotIntervalMin: Number(v) })}
                  size="sm"
                  options={[15, 20, 30, 60].map((n) => ({ value: String(n), label: `${toFa(n)}′` }))}
                />
              </Field>
              <Field label="فاصله پیش‌فرض بین نوبت‌ها">
                <Select value={s.defaultBufferMin} onChange={(e) => set({ defaultBufferMin: Number(e.target.value) })}>
                  {[0, 5, 10, 15, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n ? `${toFa(n)} دقیقه` : 'بدون فاصله'}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="حداقل زمان قبل از نوبت">
                <Select value={s.minNoticeMin} onChange={(e) => set({ minNoticeMin: Number(e.target.value) })}>
                  {[0, 30, 60, 120, 180, 240, 720, 1440].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? 'بدون محدودیت' : n < 60 ? `${toFa(n)} دقیقه` : `${toFa(n / 60)} ساعت`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="حداکثر چند روز آینده">
                <Select value={s.maxAdvanceDays} onChange={(e) => set({ maxAdvanceDays: Number(e.target.value) })}>
                  {[7, 14, 21, 30, 60, 90].map((n) => (
                    <option key={n} value={n}>
                      {toFa(n)} روز
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="حداکثر نوبت روزانه هر کارمند">
                <Select value={s.maxBookingsPerDay ?? 0} onChange={(e) => set({ maxBookingsPerDay: Number(e.target.value) || null })}>
                  <option value={0}>نامحدود</option>
                  {[4, 6, 8, 10, 12, 16, 20].map((n) => (
                    <option key={n} value={n}>
                      {toFa(n)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="مهلت لغو توسط مشتری">
                <Select value={s.cancellationWindowHours} onChange={(e) => set({ cancellationWindowHours: Number(e.target.value) })}>
                  {[0, 1, 2, 3, 4, 6, 12, 24, 48].map((n) => (
                    <option key={n} value={n}>
                      {n ? `تا ${toFa(n)} ساعت قبل` : 'تا لحظه شروع'}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Card className="mt-4 px-4 py-2">
              <Switch checked={s.allowStaffChoice} onChange={(v) => set({ allowStaffChoice: v })} label="مشتری کارمند را انتخاب کند" description="در غیر این صورت، اولین فرد آزاد انتخاب می‌شود" />
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">متن قوانین برای مشتری</h2>
            <Textarea value={rulesText} onChange={(e) => setRulesText(e.target.value)} rows={3} />
          </section>
        </fieldset>
        {editable && (
          <div className={cn('sticky bottom-[calc(80px+var(--safe-bottom))] mt-8 transition-opacity lg:bottom-6', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <Button variant="primary" size="lg" block loading={busy} onClick={save}>
              ذخیره تغییرات
            </Button>
          </div>
        )}
      </Page>
    </div>
  );
}
