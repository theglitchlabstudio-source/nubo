import { useEffect, useState } from 'react';
import { Bell, MessageSquareText, Smartphone } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useOpenBooking } from './shared';
import { useNotifications, useNow } from '@/data/hooks';
import { data } from '@/data';
import { fmtAgo } from '@/lib/time';
import { fmtMobile } from '@/lib/text';
import { cn } from '@/lib/cn';
import { Card, EmptyState, Segmented } from '@/ui/primitives';

export default function Outbox() {
  const { ctx, features } = useDash();
  const list = useNotifications(ctx).data ?? [];
  const now = useNow();
  const open = useOpenBooking();
  const [tab, setTab] = useState<'in_app' | 'sms'>('in_app');
  const shown = list.filter((n) => (tab === 'in_app' ? n.channel === 'in_app' : n.channel !== 'in_app'));

  useEffect(() => {
    if (list.some((n) => !n.read)) {
      const t = setTimeout(() => data.notifications.markAllRead(ctx), 1500);
      return () => clearTimeout(t);
    }
  }, [list, ctx]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="پیام‌ها"
        subtitle="اعلان‌های شما و پیامک‌هایی که برای مشتری ارسال می‌شود"
        actions={
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'in_app', label: 'اعلان‌ها' },
              { value: 'sms', label: 'پیامک مشتری' },
            ]}
          />
        }
      />
      <Page>
        {tab === 'sms' && (
          <p className="mb-4 rounded-theme bg-surface-2 p-3 text-[13px] leading-6 text-muted">
            {features.sms ? 'ارسال واقعی پیامک بعد از اتصال به سرویس پیامک فعال می‌شود.' : 'ارسال خودکار پیامک در پلن حرفه‌ای فعال است.'} فعلاً متن هر پیامک اینجا ثبت می‌شود و از صفحه هر نوبت می‌توانید با پیامک یا واتساپ گوشی خودتان بفرستید.
          </p>
        )}
        {shown.length === 0 ? (
          <Card>
            <EmptyState title="پیامی نیست" />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {shown.map((n) => (
              <button key={n.id} onClick={() => n.bookingId && open(n.bookingId)} className={cn('press flex gap-3 rounded-theme-lg border border-line bg-surface p-4 text-start hover:bg-surface-2', !n.read && 'border-accent')}>
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', n.channel === 'in_app' ? 'bg-accent text-accent-ink' : 'bg-surface-2')}>
                  {n.channel === 'in_app' ? <Bell size={18} /> : n.channel === 'sms' ? <Smartphone size={18} /> : <MessageSquareText size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[12px] text-muted">
                    <span>{n.channel === 'in_app' ? 'اعلان' : `پیامک به ${fmtMobile(n.recipient)}`}</span>
                    <span>{fmtAgo(Date.parse(n.createdAt), now)}</span>
                  </span>
                  <span className="mt-1 block text-[14px] leading-7 whitespace-pre-line">{n.body}</span>
                  {n.status === 'simulated' && n.channel !== 'in_app' && <span className="mt-1 inline-block rounded-full bg-surface-2 px-2 text-[11px] text-muted">نمایشی · ارسال نشده</span>}
                </span>
              </button>
            ))}
          </div>
        )}
      </Page>
    </div>
  );
}
