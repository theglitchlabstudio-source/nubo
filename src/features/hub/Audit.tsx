import { HubHeader } from './HubRoutes';
import { useAudit, useTenants } from '@/data/hooks';
import { fmtAgo } from '@/lib/time';
import { Card, EmptyState } from '@/ui/primitives';

export default function Audit() {
  const audit = useAudit(null).data ?? [];
  const tenants = useTenants().data ?? [];
  const name = (id: string | null) => tenants.find((t) => t.id === id)?.name ?? '—';
  return (
    <div className="mx-auto max-w-4xl">
      <HubHeader title="گزارش فعالیت" subtitle="همه تغییرات، در همه کسب‌وکارها" />
      <div className="px-5 lg:px-10">
        {audit.length === 0 ? (
          <Card>
            <EmptyState title="فعالیتی ثبت نشده" />
          </Card>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
            {audit.slice(0, 150).map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-4 text-sm">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${a.actorRole === 'customer' ? 'bg-accent' : 'bg-ink/40'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{a.summary}</div>
                  <div className="text-[12px] text-muted">
                    {name(a.tenantId)} · {a.actorName}
                    {a.impersonatorName && ` (ورود از هاب: ${a.impersonatorName})`}
                  </div>
                </div>
                <span className="text-[12px] whitespace-nowrap text-muted">{fmtAgo(Date.parse(a.at))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
