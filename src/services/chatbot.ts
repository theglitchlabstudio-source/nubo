// Chatbot extension point (Pro). See docs/ARCHITECTURE.md §8.4.
// MVP: a scripted, rule-based provider so the feature can be demoed. Phase 4 swaps in a real LLM
// provider (called from the server) behind the same interface; it acts only through ChatbotTools.
import type { ChatbotConfig, Service } from '@/domain/types';
import type { PublicTenant } from '@/data/ports';
import { formatToman } from '@/lib/digits';
import { fmtHHmm, fmtDuration } from '@/lib/time';
import { WEEKDAYS } from '@/lib/jalali';
import { normalizeFa } from '@/lib/text';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  action?: { label: string; to: string };
}

export interface ChatbotContext {
  tenant: PublicTenant;
  config: ChatbotConfig;
  services: Service[];
  week: { start: string; end: string }[][];
  nextFree?: string;
}

export interface ChatbotProvider {
  reply(ctx: ChatbotContext, history: ChatMessage[]): Promise<ChatMessage>;
}

const has = (q: string, words: string[]) => words.some((w) => q.includes(w));

export const scriptedChatbot: ChatbotProvider = {
  async reply(ctx, history) {
    const q = normalizeFa(history[history.length - 1]?.text ?? '');
    await new Promise((r) => setTimeout(r, 450 + Math.random() * 400));
    const book = { label: 'رزرو نوبت', to: `/b/${ctx.tenant.slug}/book` };

    const faq = ctx.config.faq.find((f) => f.q && q.includes(normalizeFa(f.q)));
    if (faq) return { role: 'assistant', text: faq.a };

    if (has(q, ['نوبت', 'رزرو', 'وقت', 'خالی', 'آزاد'])) {
      return {
        role: 'assistant',
        text: ctx.nextFree ? `اولین زمان آزاد ${ctx.nextFree} است. می‌خواهید همین الان رزرو کنید؟` : 'برای دیدن زمان‌های آزاد، دکمه زیر را بزنید.',
        action: book,
      };
    }
    if (has(q, ['قیمت', 'هزینه', 'چند', 'تعرفه'])) {
      const lines = ctx.services
        .filter((s) => s.active)
        .slice(0, 6)
        .map((s) => `• ${s.name}: ${s.priceType === 'free' ? 'رایگان' : s.priceType === 'hidden' ? 'حضوری' : (s.priceType === 'from' ? 'از ' : '') + formatToman(s.priceToman)}`);
      return { role: 'assistant', text: `تعرفه‌ها:\n${lines.join('\n')}` };
    }
    if (has(q, ['ساعت', 'باز', 'کی', 'تعطیل', 'روز'])) {
      const lines = ctx.week.map((r, i) => `${WEEKDAYS[i]}: ${r.length ? r.map((x) => `${fmtHHmm(x.start)}–${fmtHHmm(x.end)}`).join('، ') : 'تعطیل'}`);
      return { role: 'assistant', text: lines.join('\n') };
    }
    if (has(q, ['آدرس', 'کجا', 'مسیر', 'لوکیشن'])) {
      return { role: 'assistant', text: ctx.tenant.profile.address || 'آدرس در پایین همین صفحه آمده است.' };
    }
    if (has(q, ['طول', 'مدت', 'چقدر طول'])) {
      return { role: 'assistant', text: ctx.services.filter((s) => s.active).slice(0, 6).map((s) => `• ${s.name}: ${fmtDuration(s.durationMin)}`).join('\n') };
    }
    if (has(q, ['لغو', 'کنسل'])) {
      return { role: 'assistant', text: ctx.tenant.profile.bookingRulesText || 'از صفحه پیگیری نوبت می‌توانید آن را لغو کنید.' };
    }
    if (has(q, ['سلام', 'درود', 'وقت بخیر'])) return { role: 'assistant', text: ctx.config.greeting };
    return {
      role: 'assistant',
      text: 'متوجه شدم. می‌توانم درباره ساعت کاری، قیمت‌ها، آدرس یا زمان‌های آزاد کمک کنم. برای سوال‌های تخصصی، لطفاً تماس بگیرید.',
    };
  },
};

export const SUGGESTIONS = ['اولین نوبت آزاد کی است؟', 'قیمت‌ها چقدر است؟', 'ساعت کاری', 'آدرس کجاست؟'];
