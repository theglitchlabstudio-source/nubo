import { useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useUsers } from '@/data/hooks';
import { data } from '@/data';
import { ROLE_LABEL } from '@/domain/features';
import type { User } from '@/domain/types';
import { toEn } from '@/lib/digits';
import { uid } from '@/lib/cn';
import { Avatar, Button, Card, Field, Input, Switch } from '@/ui/primitives';
import { Sheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function Users() {
  const { tenant, ctx } = useDash();
  const users = useUsers(tenant.id).data ?? [];
  const [editing, setEditing] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const isNew = !!editing && !users.some((u) => u.id === editing.id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="کاربران و رمزها"
        subtitle="چه کسانی وارد داشبورد می‌شوند"
        actions={
          <Button
            variant="ink"
            icon={<Plus size={16} />}
            onClick={() => {
              setPin('');
              setEditing({ id: uid('u'), tenantId: tenant.id, role: 'secretary', name: '', mobile: '', pinHash: '', active: true });
            }}
          >
            منشی جدید
          </Button>
        }
      />
      <Page>
        <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => {
                setPin('');
                setEditing(u);
              }}
              className="press flex w-full items-center gap-3 p-4 text-start hover:bg-surface-2"
            >
              <Avatar name={u.name} color={u.role === 'owner' ? 'var(--accent)' : '#7BA88E'} size={42} />
              <div className="flex-1">
                <div className="font-bold">{u.name}</div>
                <div className="text-[13px] text-muted">
                  {ROLE_LABEL[u.role]}
                  {!u.active && ' · غیرفعال'}
                </div>
              </div>
              <KeyRound size={17} className="text-muted" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] text-muted">در نسخه نهایی، ورود با کد پیامکی انجام می‌شود.</p>
      </Page>
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'منشی جدید' : 'ویرایش کاربر'}>
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="نام">
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label={isNew ? 'رمز ۴ رقمی' : 'رمز جدید (اختیاری)'}>
              <Input value={pin} onChange={(e) => setPin(toEn(e.target.value).replace(/\D/g, '').slice(0, 4))} inputMode="numeric" dir="ltr" className="text-center text-xl tracking-[0.5em]" placeholder="••••" />
            </Field>
            {editing.role !== 'owner' && (
              <Card className="px-4 py-2">
                <Switch checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} label="فعال" />
              </Card>
            )}
            <Button
              variant="primary"
              size="lg"
              disabled={editing.name.trim().length < 2 || (isNew ? pin.length !== 4 : pin.length > 0 && pin.length !== 4)}
              onClick={async () => {
                await data.users.save(ctx, editing, pin || undefined);
                toast('ذخیره شد');
                setEditing(null);
              }}
            >
              ذخیره
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
