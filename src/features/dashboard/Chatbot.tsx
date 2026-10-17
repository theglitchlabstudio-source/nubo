import { useEffect, useState } from 'react';
import { Plus, Sparkles, Trash2, ExternalLink } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { useChatbot } from '@/data/hooks';
import { data } from '@/data';
import type { ChatbotConfig } from '@/domain/types';
import { Button, ButtonLink, Card, Field, Input, Textarea } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

/** Pro feature placeholder (ARCHITECTURE §8.4): settings now, real AI provider in Phase 4. */
export default function Chatbot() {
  const { tenant, features, ctx, base } = useDash();
  const q = useChatbot(tenant.id);
  const [c, setC] = useState<ChatbotConfig | null>(null);
  useEffect(() => {
    if (q.data) setC(q.data);
  }, [q.data]);

  if (!features.chatbot) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="دستیار هوشمند" />
        <Page>
          <Card className="overflow-hidden">
            <div className="grid-paper flex h-40 items-center justify-center gap-3 border-b border-line">
              {[16, 28, 44, 28, 16].map((s, i) => (
                <span key={i} className={i === 2 ? 'rounded-full bg-accent' : 'rounded-full bg-ink/80'} style={{ width: s, height: s }} />
              ))}
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-xl font-extrabold">
                <Sparkles className="text-accent" /> به‌زودی در پلن حرفه‌ای
              </div>
              <p className="mt-2 leading-8 text-muted">دستیاری که ۲۴ ساعته به سوال‌های مشتری‌ها درباره ساعت کاری، قیمت‌ها و زمان‌های آزاد جواب می‌دهد و می‌تواند مستقیم نوبت ثبت کند؛ همیشه طبق قوانین نوبت‌دهی شما.</p>
              <ButtonLink to={`${base}/plan`} variant="primary" className="mt-5">
                مشاهده پلن‌ها
              </ButtonLink>
            </div>
          </Card>
        </Page>
      </div>
    );
  }
  if (!c) return null;
  const save = async () => {
    await data.chatbot.save(ctx, c);
    toast('ذخیره شد');
  };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="دستیار هوشمند"
        subtitle="نسخه آزمایشی · پاسخ‌های از پیش تعریف‌شده"
        actions={
          <a href={`${import.meta.env.BASE_URL}b/${tenant.slug}`} target="_blank" rel="noreferrer" className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-semibold">
            <ExternalLink size={14} /> امتحان کنید
          </a>
        }
      />
      <Page className="flex flex-col gap-6">
        <Field label="پیام خوشامد">
          <Textarea value={c.greeting} onChange={(e) => setC({ ...c, greeting: e.target.value })} rows={2} />
        </Field>
        <div>
          <div className="mb-2 text-[13px] font-semibold text-muted">سوال‌های پرتکرار</div>
          <div className="flex flex-col gap-3">
            {c.faq.map((f, i) => (
              <Card key={i} className="flex flex-col gap-2 p-3">
                <div className="flex gap-2">
                  <Input value={f.q} onChange={(e) => setC({ ...c, faq: c.faq.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)) })} placeholder="کلمه کلیدی سوال" />
                  <button aria-label="حذف" onClick={() => setC({ ...c, faq: c.faq.filter((_, k) => k !== i) })} className="press grid size-12 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2">
                    <Trash2 size={17} />
                  </button>
                </div>
                <Textarea value={f.a} onChange={(e) => setC({ ...c, faq: c.faq.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)) })} rows={2} placeholder="پاسخ" />
              </Card>
            ))}
            <Button icon={<Plus size={16} />} onClick={() => setC({ ...c, faq: [...c.faq, { q: '', a: '' }] })} className="self-start">
              افزودن سوال
            </Button>
          </div>
        </div>
        <Button variant="primary" size="lg" onClick={save}>
          ذخیره
        </Button>
      </Page>
    </div>
  );
}
