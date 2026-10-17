import type { Service, Tenant, WorkingHours } from '@/domain/types';
import { type SlotInputs, getSlots, rangesFor } from '@/domain/slots';
import { type CivilDate, addDays, hhmmToMinutes, minutesOfDay, todayIn, weekdayOf } from '@/lib/time';
import { formatToman } from '@/lib/digits';

/** The earliest bookable moment across all services (shown as "next free slot"). */
export function firstAvailable(inputs: SlotInputs, services: Service[], now: number, days = 14): { date: CivilDate; start: number } | null {
  const active = services.filter((s) => s.active && s.staffIds.length).sort((a, b) => a.durationMin - b.durationMin);
  if (!active.length) return null;
  const today = todayIn(inputs.tz, now);
  for (let i = 0; i <= Math.min(days, inputs.settings.maxAdvanceDays); i += 1) {
    const date = addDays(today, i);
    let best: number | null = null;
    for (const service of active.slice(0, 3)) {
      const s = getSlots(inputs, { date, service, staffId: 'any', now })[0];
      if (s && (best === null || s.start < best)) best = s.start;
    }
    if (best !== null) return { date, start: best };
  }
  return null;
}

/** Business-level open/closed state right now, using default hours (or the first staff's). */
export function openState(inputs: SlotInputs, now: number): { open: boolean; until?: string; opensAt?: string } {
  const today = todayIn(inputs.tz, now);
  const staffId = inputs.staff[0]?.id ?? '';
  const { ranges } = rangesFor(inputs, staffId, today);
  const m = minutesOfDay(now, inputs.tz);
  const cur = ranges.find((r) => hhmmToMinutes(r.start) <= m && m < hhmmToMinutes(r.end));
  if (cur) return { open: true, until: cur.end };
  const next = ranges.find((r) => hhmmToMinutes(r.start) > m);
  return { open: false, opensAt: next?.start };
}

export function weekRows(hours: WorkingHours[]) {
  const biz = hours.filter((h) => h.staffId === null);
  return Array.from({ length: 7 }, (_, wd) => biz.find((h) => h.weekday === wd)?.ranges ?? []);
}

export function priceLabel(s: Pick<Service, 'priceType' | 'priceToman'>): string {
  switch (s.priceType) {
    case 'free':
      return 'رایگان';
    case 'hidden':
      return 'قیمت حضوری';
    case 'from':
      return `از ${formatToman(s.priceToman)}`;
    default:
      return formatToman(s.priceToman);
  }
}

export function needsStaffStep(tenant: Pick<Tenant, 'bookingSettings'>, service: Service | undefined): boolean {
  return !!service && tenant.bookingSettings.allowStaffChoice && service.staffIds.length > 1;
}

export function todayWeekday(tz: string, now: number) {
  return weekdayOf(todayIn(tz, now));
}

const STORE = 'nubo.customer';
/** Remember the customer's name/mobile on this device for faster repeat bookings (per-viewer convenience). */
export function rememberedCustomer(): { name: string; mobile: string } {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '') as { name: string; mobile: string };
  } catch {
    return { name: '', mobile: '' };
  }
}
export function rememberCustomer(v: { name: string; mobile: string }) {
  try {
    localStorage.setItem(STORE, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}
