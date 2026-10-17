// Notification templates + "notify via phone apps" deep links. See docs/ARCHITECTURE.md §8.1.
// In the MVP every message is written to the outbox as `simulated`. Phase 4 sends them for real
// (Kavenegar / SMS.ir "lookup" templates, Bale/Telegram bots) from the server.
import type { Booking } from '@/domain/types';
import { fmtCode } from '@/domain/misc';
import { civilDateOf, fmtDayLong, fmtTime } from '@/lib/time';
import { normalizeMobile } from '@/lib/text';

export type NotifyEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.rejected'
  | 'booking.proposed'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'booking.reminder';

export function customerMessage(event: NotifyEvent, b: Booking, tenantName: string, tz: string, trackUrl?: string): string {
  const when = (iso: string) => `${fmtDayLong(civilDateOf(Date.parse(iso), tz))} ساعت ${fmtTime(iso, tz)}`;
  const link = trackUrl ? `\nپیگیری: ${trackUrl}` : '';
  const hi = `${b.customerName} عزیز،`;
  switch (event) {
    case 'booking.created':
      return `${hi} درخواست نوبت شما برای «${b.serviceName}» در ${tenantName} (${when(b.start)}) ثبت شد و پس از تایید خبرتان می‌کنیم.\nکد: ${fmtCode(b.code)}${link}`;
    case 'booking.confirmed':
      return `${hi} نوبت شما برای «${b.serviceName}» در ${tenantName}، ${when(b.start)} تایید شد. منتظرتان هستیم.${link}`;
    case 'booking.rejected':
      return `${hi} متاسفانه ${tenantName} امکان پذیرش نوبت ${when(b.start)} را ندارد.${b.statusReason ? `\nعلت: ${b.statusReason}` : ''}${link}`;
    case 'booking.proposed':
      return `${hi} ${tenantName} زمان ${b.proposal ? when(b.proposal.start) : ''} را برای «${b.serviceName}» پیشنهاد داده است. لطفاً تایید یا رد کنید.${link}`;
    case 'booking.cancelled':
      return `${hi} نوبت ${when(b.start)} در ${tenantName} لغو شد.${link}`;
    case 'booking.rescheduled':
      return `${hi} نوبت شما در ${tenantName} به ${when(b.start)} منتقل شد.${link}`;
    case 'booking.reminder':
      return `یادآوری: ${hi} نوبت «${b.serviceName}» شما در ${tenantName}، ${when(b.start)} است.${link}`;
  }
}

/** Opens the secretary's own phone apps with a ready message — free and works today. */
export function shareLinks(mobile: string, text: string) {
  const m = normalizeMobile(mobile);
  const intl = m.startsWith('0') ? `98${m.slice(1)}` : m;
  const body = encodeURIComponent(text);
  return {
    sms: `sms:${m}?body=${body}`,
    whatsapp: `https://wa.me/${intl}?text=${body}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${body}`,
  };
}
