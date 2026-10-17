import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { MessageCircle, Send, X, Sparkles } from 'lucide-react';
import { usePublic } from './PublicLayout';
import { firstAvailable, weekRows } from './helpers';
import { useChatbot, useNow, useSlotInputs } from '@/data/hooks';
import { scriptedChatbot, SUGGESTIONS, type ChatMessage } from '@/services/chatbot';
import { fmtRelativeDay, fmtTime, todayIn } from '@/lib/time';
import { cn } from '@/lib/cn';

/** Pro feature placeholder: a scripted assistant behind the `chatbot` flag. */
export function ChatBubble() {
  const { tenant, services } = usePublic();
  const config = useChatbot(tenant.id).data;
  const inputs = useSlotInputs(tenant.id).data;
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && config && !msgs.length) setMsgs([{ role: 'assistant', text: config.greeting }]);
  }, [open, config, msgs.length]);
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, typing]);

  const send = async (q: string) => {
    if (!q.trim() || !config || !inputs) return;
    const history: ChatMessage[] = [...msgs, { role: 'user', text: q.trim() }];
    setMsgs(history);
    setText('');
    setTyping(true);
    const nf = firstAvailable(inputs, services, now);
    const reply = await scriptedChatbot.reply(
      {
        tenant,
        config,
        services,
        week: weekRows(inputs.workingHours),
        nextFree: nf ? `${fmtRelativeDay(nf.date, todayIn(tenant.timezone, now))} ساعت ${fmtTime(nf.start, tenant.timezone)}` : undefined,
      },
      history,
    );
    setTyping(false);
    setMsgs((m) => [...m, reply]);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        aria-label="دستیار هوشمند"
        className="fixed bottom-[calc(84px+var(--safe-bottom))] left-4 z-40 grid size-14 place-items-center rounded-full bg-ink text-paper shadow-xl lg:bottom-8 lg:left-8"
        whileTap={{ scale: 0.92 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.6 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'x' : 'm'} initial={{ rotate: -45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 45, opacity: 0 }} transition={{ duration: 0.15 }}>
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
        {!open && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-paper bg-accent" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            style={{ transformOrigin: 'bottom left' }}
            className="fixed inset-x-3 bottom-[calc(152px+var(--safe-bottom))] z-40 flex max-h-[60dvh] flex-col overflow-hidden rounded-theme-lg border border-line bg-paper shadow-2xl sm:left-4 sm:right-auto sm:w-[380px] lg:bottom-28 lg:left-8"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-ink">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">دستیار {tenant.name}</div>
                <div className="text-[12px] text-muted">نسخه آزمایشی · پاسخ خودکار</div>
              </div>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', m.role === 'user' ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-7 whitespace-pre-line', m.role === 'user' ? 'rounded-ee-md bg-accent text-accent-ink' : 'rounded-es-md bg-surface-2')}>
                    {m.text}
                    {m.action && (
                      <Link to={m.action.to} className="mt-2 flex h-9 items-center justify-center rounded-full bg-ink px-4 text-[13px] font-bold text-paper">
                        {m.action.label}
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <div className="flex justify-end">
                  <div className="flex gap-1 rounded-2xl bg-surface-2 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="size-1.5 rounded-full bg-ink/50" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={end} />
            </div>
            {msgs.length <= 1 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="press shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-center gap-2 border-t border-line p-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="سوالتان را بنویسید…" className="h-11 min-w-0 flex-1 rounded-full bg-surface-2 px-4 outline-none" />
              <button type="submit" aria-label="ارسال" className="press grid size-11 place-items-center rounded-full bg-ink text-paper">
                <Send size={18} className="-scale-x-100" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
