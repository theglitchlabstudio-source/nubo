import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowRight, ExternalLink, LogIn, RotateCcw } from 'lucide-react';
import { useAudit, useTenant } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { TenantContext } from '@/data/ports';
import { getSession, impersonate } from '@/services/auth';
import { BUSINESS_TYPE_LABEL, FEATURE_LABEL, PLANS, getFeatures, subscriptionStatus } from '@/domain/features';
import type { FeatureKey, Tenant } from '@/domain/types';
import { addDays, diffDays, fmtAgo, fmtDate, todayIn } from '@/lib/time';
import { toFa } from '@/lib/digits';
import { isValidMobile, isValidSlug, normalizeMobile } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Button, Card, Field, Input, Segmented, Skeleton, Switch, Textarea } from '@/ui/primitives';
import { Confirm } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function TenantDetail() {
  const { id } = useParams();
  const q = useTenant(id);
  const audit = useAudit(id ?? null).data ?? [];
  const navigate = useNavigate();
  const [t, setT] = useState<Tenant | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  useEffect(() => {
    if (q.data) setT(q.data);
  }, [q.data]);

  if (!t || !q.data) return <div className="p-10"><Skeleton className="h-80" /></div>;
  const actor = getSession('hub')!;
  const ctx: TenantContext = { tenantId: t.id, actor };
  const today = todayIn(t.timezone);
  const features = getFeatures(t);
  const sub = subscriptionStatus(t, today);
  const dirty = JSON.stringify(t) !== JSON.stringify(q.data);

  const save = async (patch: Partial<Tenant> = {}) => {
    const next = { ...t, ...patch };
    if (!isValidSlug(next.slug)) return toast('آدرس (slug) معتبر نیست', 'error');
    if (!isValidMobile(next.contact.mobile)) return toast('موبایل رابط معتبر نیست', 'error');
    try {
      const { id: _i, createdAt: _c, ...rest } = next;
      await data.tenants.update(ctx, { ...rest, contact: { ...next.contact, mobile: normalizeMobile(next.contact.mobile) } });
      toast('ذخیره شد');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const extend = (days: number) => {
    const base = diffDays(t.subscription.endDate, today) < 0 ? today : t.subscription.endDate;
    setT({ ...t, subscription: { ...t.subscription, endDate: addDays(base, days) } });
  };

  const toggleFeature = (k: FeatureKey, v: boolean) => {
    const planHas = PLANS[t.planId].features.includes(k);
    const overrides = { ...t.featureOverrides };
    if (v === planHas) delete overrides[k];
    else overrides[k] = v;
    setT({ ...t, featureOverrides: overrides });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="px-5 pt-4 lg:px-10 lg:pt-8">
        <Link to="/hub/tenants" className="press -ms-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-sm font-semibold text-muted">
          <ArrowRight size={17} /> کسب‌وکارها
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4 px-5 pt-2 pb-6 lg:px-10">
        <div>
          <div className="text-[13px] font-semibold text-muted">{BUSINESS_TYPE_LABEL[t.businessType]}</div>
          <h1 className="text-[28px] font-extrabold tracking-tight">{q.data.name}</h1>
        </div>
        <div className="flex gap-2">
          <a href={`${import.meta.env.BASE_URL}b/${t.slug}`} target="_blank" rel="noreferrer" className="press inline-flex h-11 items-center gap-2 rounded-theme border border-line bg-surface px-4 font-semibold">
            <ExternalLink size={16} /> صفحه رزرو
          </a>
          <Button
            variant="ink"
            icon={<LogIn size={16} />}
            onClick={() => {
              impersonate(t.id);
              navigate(`/b/${t.slug}/admin`);
            }}
          >
            ورود به‌جای مدیر
          </Button>
        </div>
      </div>

      <div className="grid gap-8 px-5 lg:grid-cols-[1fr_320px] lg:px-10 [&>*]:min-w-0">
        <div className="flex flex-col gap-8">
          <section className="grid gap-5 sm:grid-cols-2">
            <Field label="پلن">
              <Segmented
                value={t.planId}
                onChange={(planId) => setT({ ...t, planId, featureOverrides: {} })}
                options={[
                  { value: 'basic', label: PLANS.basic.name },
                  { value: 'pro', label: PLANS.pro.name },
                ]}
              />
            </Field>
            <Field label="وضعیت">
              <Segmented
                value={t.status}
                onChange={(status) => (status === 'suspended' ? setSuspendOpen(true) : setT({ ...t, status }))}
                options={[
                  { value: 'active', label: 'فعال' },
                  { value: 'trial', label: 'آزمایشی' },
                  { value: 'suspended', label: 'معلق' },
                ]}
              />
            </Field>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-extrabold">اشتراک</h2>
            <Card className="p-5">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <div className="text-[12px] text-muted">شروع</div>
                  <div className="font-bold">{fmtDate(t.subscription.startDate, true)}</div>
                </div>
                <div>
                  <div className="text-[12px] text-muted">پایان</div>
                  <div className="font-bold">{fmtDate(t.subscription.endDate, true)}</div>
                </div>
                <div className={cn('text-sm font-bold', sub === 'expired' ? 'text-danger' : sub === 'expiring' ? 'text-pending' : 'text-confirmed')}>
                  {sub === 'expired' ? 'منقضی شده' : `${toFa(diffDays(t.subscription.endDate, today))} روز مانده`}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  [30, '+ ۱ ماه'],
                  [90, '+ ۳ ماه'],
                  [180, '+ ۶ ماه'],
                  [365, '+ ۱ سال'],
                ].map(([d, l]) => (
                  <Button key={d} size="sm" onClick={() => extend(d as number)}>
                    {l}
                  </Button>
                ))}
              </div>
            </Card>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-extrabold">امکانات</h2>
            <p className="mb-3 text-sm text-muted">پیش‌فرض از پلن می‌آید؛ هر مورد را می‌توانید برای این کسب‌وکار جداگانه روشن یا خاموش کنید.</p>
            <Card className="divide-y divide-line px-4">
              {(Object.keys(FEATURE_LABEL) as FeatureKey[]).map((k) => (
                <div key={k} className="py-1.5">
                  <Switch
                    checked={features[k]}
                    onChange={(v) => toggleFeature(k, v)}
                    label={FEATURE_LABEL[k]}
                    description={t.featureOverrides[k] !== undefined ? 'تنظیم اختصاصی' : undefined}
                  />
                </div>
              ))}
            </Card>
            {Object.keys(t.featureOverrides).length > 0 && (
              <button onClick={() => setT({ ...t, featureOverrides: {} })} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted">
                <RotateCcw size={13} /> بازگشت به پیش‌فرض پلن
              </button>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="نام کسب‌وکار">
              <Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
            </Field>
            <Field label="آدرس صفحه (slug)" error={!isValidSlug(t.slug) && 'فقط حروف انگلیسی کوچک، عدد و خط تیره'}>
              <Input dir="ltr" value={t.slug} onChange={(e) => setT({ ...t, slug: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="نام رابط">
              <Input value={t.contact.name} onChange={(e) => setT({ ...t, contact: { ...t.contact, name: e.target.value } })} />
            </Field>
            <Field label="موبایل رابط">
              <Input dir="ltr" value={t.contact.mobile} onChange={(e) => setT({ ...t, contact: { ...t.contact, mobile: e.target.value } })} />
            </Field>
            <Field label="یادداشت داخلی" className="sm:col-span-2">
              <Textarea value={t.internalNotes} onChange={(e) => setT({ ...t, internalNotes: e.target.value })} rows={3} placeholder="فقط برای شما" />
            </Field>
          </section>
        </div>

        <aside>
          <h2 className="mb-3 text-lg font-extrabold">فعالیت</h2>
          <ol className="flex flex-col gap-3 border-s border-line ps-4">
            {audit.slice(0, 12).map((a) => (
              <li key={a.id} className="relative text-[13px] leading-6">
                <span className="absolute top-2 -start-[21px] size-2 rounded-full bg-ink/30" />
                <div className="font-semibold">{a.summary}</div>
                <div className="text-muted">
                  {a.actorName}
                  {a.impersonatorName && ' (از هاب)'} · {fmtAgo(Date.parse(a.at))}
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <div className={cn('sticky bottom-[calc(80px+var(--safe-bottom))] mx-5 mt-8 transition-opacity lg:bottom-6 lg:mx-10', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <Button variant="primary" size="lg" block onClick={() => save()}>
          ذخیره تغییرات
        </Button>
      </div>

      <Confirm
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        title="تعلیق این کسب‌وکار؟"
        text="صفحه رزرو برای مشتری‌ها «موقتاً غیرفعال» نمایش داده می‌شود. داده‌ها حفظ می‌شوند."
        danger
        confirmLabel="تعلیق"
        onConfirm={async () => {
          setSuspendOpen(false);
          await save({ status: 'suspended' });
        }}
      />
    </div>
  );
}
