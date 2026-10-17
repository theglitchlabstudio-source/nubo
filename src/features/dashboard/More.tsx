import { Link } from 'react-router';
import { motion } from 'motion/react';
import { BadgeCheck, ChartNoAxesColumn, ChevronLeft, Clock3, ExternalLink, KeyRound, LogOut, MessageSquareText, Palette, Scissors, Settings2, Share2, Sparkles, UserRound } from 'lucide-react';
import { useDash } from './context';
import { PageHeader } from './Layout';
import { signOut } from '@/services/auth';
import { ROLE_LABEL } from '@/domain/features';
import { Avatar } from '@/ui/primitives';
import { NuboMark, PoweredBy } from '@/ui/Brand';

/** Phone-only menu for secondary pages. */
export default function More() {
  const { base, tenant, actor, can } = useDash();
  const groups = [
    {
      title: 'کسب‌وکار',
      items: [
        { to: 'services', label: 'خدمات', icon: Scissors },
        { to: 'staff', label: 'کارکنان', icon: UserRound },
        { to: 'availability', label: 'ساعت کاری و تعطیلات', icon: Clock3 },
        { to: 'settings/booking', label: 'قوانین نوبت‌دهی', icon: Settings2 },
        ...(can('branding.edit') ? [{ to: 'settings/branding', label: 'ظاهر و برند', icon: Palette }] : []),
      ],
    },
    {
      title: 'ابزارها',
      items: [
        { to: 'share', label: 'لینک و QR', icon: Share2 },
        { to: 'stats', label: 'آمار', icon: ChartNoAxesColumn },
        { to: 'notifications', label: 'پیام‌ها', icon: MessageSquareText },
        { to: 'chatbot', label: 'دستیار هوشمند', icon: Sparkles },
        ...(can('staff.edit') ? [{ to: 'settings/users', label: 'کاربران و رمزها', icon: KeyRound }] : []),
        { to: 'plan', label: 'اشتراک', icon: BadgeCheck },
      ],
    },
  ];
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="بیشتر" />
      <div className="flex flex-col gap-6 px-5">
        <div className="flex items-center gap-3 rounded-theme-lg border border-line bg-surface p-4">
          <Avatar name={actor.name} color="var(--ink)" size={44} />
          <div className="min-w-0 flex-1">
            <div className="font-bold">{actor.name}</div>
            <div className="text-[13px] text-muted">{ROLE_LABEL[actor.role]}</div>
          </div>
          <button onClick={() => signOut(tenant.id)} className="press inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-2">
            <LogOut size={16} /> خروج
          </button>
        </div>
        {groups.map((g) => (
          <section key={g.title}>
            <div className="mb-2 text-[13px] font-semibold text-muted">{g.title}</div>
            <div className="divide-y divide-line overflow-hidden rounded-theme-lg border border-line bg-surface">
              {g.items.map((it, i) => (
                <motion.div key={it.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={`${base}/${it.to}`} className="press flex h-14 items-center gap-3 px-4 hover:bg-surface-2">
                    <it.icon size={19} className="text-muted" />
                    <span className="flex-1 font-medium">{it.label}</span>
                    <ChevronLeft size={17} className="text-muted" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
        <a href={`${import.meta.env.BASE_URL}b/${tenant.slug}`} target="_blank" rel="noreferrer" className="press flex h-14 items-center justify-center gap-2 rounded-theme-lg border border-line font-semibold">
          <ExternalLink size={17} /> مشاهده صفحه رزرو
        </a>
        <div className="flex flex-col items-center gap-3 py-4">
          <Link to="/">
            <NuboMark size={16} />
          </Link>
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}
