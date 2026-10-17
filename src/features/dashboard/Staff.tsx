import { useRef, useState } from 'react';
import { Camera, Plus, Lock, Sparkles } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { WeekEditor, rowsFromWeek, validWeek, weekFromRows, type Week } from './WeekEditor';
import { rangesLabel } from './shared';
import { useSlotInputs } from '@/data/hooks';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import type { Staff } from '@/domain/types';
import { PLANS } from '@/domain/features';
import { STAFF_COLORS } from '@/seed/demo';
import { compressImage, IMAGE_SIZES } from '@/lib/image';
import { WEEKDAYS_SHORT } from '@/lib/jalali';
import { toFa } from '@/lib/digits';
import { uid, cn } from '@/lib/cn';
import { Avatar, Button, ButtonLink, Card, Field, Input, Switch } from '@/ui/primitives';
import { Confirm, Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function StaffPage() {
  const { bundle, can, tenant, features, base } = useDash();
  const inputs = useSlotInputs(tenant.id).data;
  const [editing, setEditing] = useState<Staff | null>(null);
  const editable = can('staff.edit');
  const limit = features.multiStaff ? PLANS.pro.limits.maxStaff : 1;
  const atLimit = bundle.staff.length >= limit;

  const blank = (): Staff => ({
    id: uid('st'),
    tenantId: tenant.id,
    name: '',
    title: '',
    color: STAFF_COLORS[bundle.staff.length % STAFF_COLORS.length],
    active: true,
    sortOrder: bundle.staff.length,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="کارکنان"
        subtitle={`${toFa(bundle.staff.filter((s) => s.active).length)} نفر فعال`}
        actions={
          editable &&
          !atLimit && (
            <Button variant="ink" icon={<Plus size={17} />} onClick={() => setEditing(blank())}>
              کارمند جدید
            </Button>
          )
        }
      />
      <Page>
        {!editable && (
          <p className="mb-4 flex items-center gap-2 rounded-theme bg-surface-2 p-3 text-sm text-muted">
            <Lock size={15} /> فقط مدیر کسب‌وکار می‌تواند کارکنان را ویرایش کند.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {bundle.staff.map((s) => {
            const own = inputs?.workingHours.filter((w) => w.staffId === s.id) ?? [];
            const services = bundle.services.filter((sv) => sv.staffIds.includes(s.id));
            return (
              <button key={s.id} disabled={!editable} onClick={() => setEditing(s)} className={cn('press flex flex-col items-start rounded-theme-lg border border-line bg-surface p-5 text-start hover:border-ink/30', !s.active && 'opacity-50')}>
                <div className="flex w-full items-center gap-3">
                  <Avatar name={s.name} color={s.color} photo={s.photo} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold">{s.name}</div>
                    <div className="text-[13px] text-muted">{s.title}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {services.slice(0, 4).map((sv) => (
                    <span key={sv.id} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px]">
                      {sv.name}
                    </span>
                  ))}
                  {services.length > 4 && <span className="px-1 text-[12px] text-muted">+{toFa(services.length - 4)}</span>}
                </div>
                <div className="mt-3 text-[12px] text-muted">{own.length ? 'ساعت کاری اختصاصی' : 'ساعت کاری کسب‌وکار'}</div>
              </button>
            );
          })}
        </div>
        {atLimit && editable && (
          <Card className="mt-6 flex flex-wrap items-center gap-4 p-5">
            <Sparkles className="text-accent" />
            <div className="min-w-0 flex-1">
              <div className="font-bold">چند کارمند در پلن حرفه‌ای</div>
              <div className="text-sm text-muted">در پلن پایه یک کارمند فعال است.</div>
            </div>
            <ButtonLink to={`${base}/plan`} variant="soft" size="sm">
              مشاهده پلن‌ها
            </ButtonLink>
          </Card>
        )}
      </Page>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing && bundle.staff.some((s) => s.id === editing.id) ? 'ویرایش کارمند' : 'کارمند جدید'} size="lg">
        {editing && <StaffForm key={editing.id} initial={editing} onClose={() => setEditing(null)} isNew={!bundle.staff.some((s) => s.id === editing.id)} />}
      </Sheet>
    </div>
  );
}

function StaffForm({ initial, onClose, isNew }: { initial: Staff; onClose: () => void; isNew: boolean }) {
  const { ctx, bundle, tenant } = useDash();
  const inputs = useSlotInputs(tenant.id).data;
  const [s, setS] = useState(initial);
  const [serviceIds, setServiceIds] = useState(bundle.services.filter((sv) => sv.staffIds.includes(initial.id)).map((sv) => sv.id));
  const ownRows = inputs?.workingHours.filter((w) => w.staffId === initial.id) ?? [];
  const [custom, setCustom] = useState(ownRows.length > 0);
  const [week, setWeek] = useState<Week>(ownRows.length ? weekFromRows(ownRows, initial.id) : weekFromRows(inputs?.workingHours ?? [], null));
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Staff>) => setS((x) => ({ ...x, ...patch }));

  const upload = async (f: File) => {
    const img = await compressImage(f, IMAGE_SIZES.staff);
    const ref = await data.files.put(img.blob, { width: img.width, height: img.height });
    set({ photo: ref });
  };

  const save = async () => {
    setBusy(true);
    try {
      await data.staff.save(ctx, { ...s, name: s.name.trim() });
      for (const sv of bundle.services) {
        const want = serviceIds.includes(sv.id);
        const has = sv.staffIds.includes(s.id);
        if (want !== has) await data.services.save(ctx, { ...sv, staffIds: want ? [...sv.staffIds, s.id] : sv.staffIds.filter((x) => x !== s.id) });
      }
      await data.availability.saveWeek(ctx, s.id, custom ? rowsFromWeek(week, tenant.id, s.id) : []);
      toast('ذخیره شد');
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <button onClick={() => file.current?.click()} className="press relative" aria-label="عکس">
          <Avatar name={s.name || '؟'} color={s.color} photo={s.photo} size={72} />
          <span className="absolute -bottom-1 -left-1 grid size-8 place-items-center rounded-full border-2 border-paper bg-ink text-paper">
            <Camera size={14} />
          </span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="flex flex-wrap gap-2">
          {STAFF_COLORS.map((c) => (
            <button key={c} onClick={() => set({ color: c })} aria-label={c} className={cn('press size-8 rounded-full', s.color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-paper')} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام">
          <Input value={s.name} onChange={(e) => set({ name: e.target.value })} autoFocus={isNew} />
        </Field>
        <Field label="عنوان">
          <Input value={s.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً آرایشگر" />
        </Field>
      </div>
      <Field label="خدمات">
        <div className="flex flex-wrap gap-2">
          {bundle.services.map((sv) => {
            const on = serviceIds.includes(sv.id);
            return (
              <button key={sv.id} onClick={() => setServiceIds(on ? serviceIds.filter((x) => x !== sv.id) : [...serviceIds, sv.id])} className={cn('press rounded-full border px-3.5 py-1.5 text-sm font-semibold', on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface')}>
                {sv.name}
              </button>
            );
          })}
        </div>
      </Field>
      <Card className="px-4 py-2">
        <Switch checked={s.active} onChange={(v) => set({ active: v })} label="فعال" description="در صفحه رزرو قابل انتخاب باشد" />
        <Switch
          checked={custom}
          onChange={setCustom}
          label="ساعت کاری اختصاصی"
          description={custom ? 'ساعت‌های این کارمند با کسب‌وکار فرق دارد' : `مثل کسب‌وکار: ${WEEKDAYS_SHORT.map((d, i) => (week[i].length ? d : '')).filter(Boolean).join(' ')}`}
        />
      </Card>
      {custom && (
        <div className="rounded-theme-lg border border-line bg-surface px-4">
          <WeekEditor value={week} onChange={setWeek} />
        </div>
      )}
      {!custom && week.some((r) => r.length) && <p className="text-[13px] text-muted">نمونه: شنبه {rangesLabel(week[0]) || 'تعطیل'}</p>}
      <div className="flex gap-2 pt-2">
        <Button variant="primary" size="lg" block disabled={s.name.trim().length < 2 || (custom && !validWeek(week))} loading={busy} onClick={save}>
          ذخیره
        </Button>
        {!isNew && bundle.staff.length > 1 && (
          <Button variant="danger" size="lg" onClick={() => setConfirmDel(true)}>
            حذف
          </Button>
        )}
      </div>
      <Confirm
        open={confirmDel}
        onClose={() => setConfirmDel(false)}
        title="حذف کارمند؟"
        text="نوبت‌های قبلی باقی می‌مانند. برای مرخصی یا توقف موقت، کارمند را غیرفعال کنید."
        danger
        confirmLabel="حذف"
        onConfirm={async () => {
          await data.staff.remove(ctx, s.id);
          setConfirmDel(false);
          onClose();
          toast('حذف شد');
        }}
      />
    </div>
  );
}
