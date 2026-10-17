// Slot-availability engine. Pure functions: no I/O, no Date.now() inside — `now` is passed in.
// See docs/ARCHITECTURE.md §4.2 for the algorithm description and the edge cases.
import { blockingInterval } from './bookingMachine';
import { type Interval, contains, merge, subtract } from './intervals';
import type { Booking, BookingSettings, DateOverride, Service, Staff, TimeOff, TimeRange, WorkingHours } from './types';
import { type CivilDate, MINUTE, addDays, dayRange, diffDays, todayIn, weekdayOf, zonedToUtc } from '@/lib/time';

export interface SlotInputs {
  tz: string;
  settings: BookingSettings;
  staff: Staff[];
  workingHours: WorkingHours[];
  dateOverrides: DateOverride[];
  timeOff: TimeOff[];
  bookings: Booking[];
}

export interface SlotQuery {
  date: CivilDate;
  service: Service;
  staffId: string | 'any';
  now: number;
  excludeBookingId?: string;
}

export interface Slot {
  start: number;
  end: number;
  staffIds: string[]; // staff free at this time
}

export type DayStatus = 'available' | 'full' | 'closed' | 'past' | 'out_of_range';

/** Which staff can be booked for a service (step 1). */
export function candidateStaff(inputs: SlotInputs, service: Service, staffId: string | 'any'): Staff[] {
  const eligible = inputs.staff
    .filter((s) => s.active && service.staffIds.includes(s.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return staffId === 'any' ? eligible : eligible.filter((s) => s.id === staffId);
}

/** Working ranges for one staff member on one date, honoring date overrides first. */
export function rangesFor(inputs: SlotInputs, staffId: string, date: CivilDate): { ranges: TimeRange[]; override: boolean } {
  const staffOverride = inputs.dateOverrides.find((o) => o.staffId === staffId && o.date === date);
  if (staffOverride) return { ranges: staffOverride.ranges, override: true };
  const bizOverride = inputs.dateOverrides.find((o) => o.staffId === null && o.date === date);
  if (bizOverride) return { ranges: bizOverride.ranges, override: true };

  const weekday = weekdayOf(date);
  const staffRows = inputs.workingHours.filter((w) => w.staffId === staffId);
  // A staff member with no rows at all inherits the business default.
  const rows = staffRows.length ? staffRows : inputs.workingHours.filter((w) => w.staffId === null);
  return { ranges: rows.find((w) => w.weekday === weekday)?.ranges ?? [], override: false };
}

/** Business-wide holiday/closure covering the whole date (ignores rows the owner disabled). */
export function businessClosure(inputs: SlotInputs, date: CivilDate): TimeOff | undefined {
  const { from, to } = dayRange(date, inputs.tz);
  return inputs.timeOff.find(
    (t) =>
      !t.disabled &&
      t.staffId === null &&
      t.allDay &&
      (t.kind === 'holiday' || t.kind === 'closure') &&
      Date.parse(t.start) <= from &&
      Date.parse(t.end) >= to,
  );
}

function freeIntervalsFor(inputs: SlotInputs, staffId: string, date: CivilDate, now: number, excludeBookingId?: string) {
  const { ranges, override } = rangesFor(inputs, staffId, date);
  // Step 3: open intervals, converted with the tenant timezone for this exact date.
  const open: Interval[] = ranges.map((r) => ({
    start: zonedToUtc(date, r.start, inputs.tz),
    end: r.end === '24:00' ? zonedToUtc(addDays(date, 1), '00:00', inputs.tz) : zonedToUtc(date, r.end, inputs.tz),
  }));
  if (!open.length) return { open, free: [] as Interval[], busyCount: 0 };

  const day = dayRange(date, inputs.tz);
  // Step 4: unavailability. A date override means "we're open", so it beats an all-day business holiday.
  const cuts: Interval[] = inputs.timeOff
    .filter((t) => !t.disabled && (t.staffId === null || t.staffId === staffId))
    .filter((t) => !(override && t.staffId === null && t.allDay && (t.kind === 'holiday' || t.kind === 'closure')))
    .map((t) => ({ start: Date.parse(t.start), end: Date.parse(t.end) }))
    .filter((i) => i.start < day.to && i.end > day.from);

  // Step 5: busy time. The buffer belongs to the earlier appointment.
  let busyCount = 0;
  for (const b of inputs.bookings) {
    if (b.id === excludeBookingId) continue;
    const blk = blockingInterval(b, inputs.settings, now);
    if (!blk || blk.staffId !== staffId) continue;
    if (blk.start < day.to && blk.end > day.from) {
      cuts.push({ start: blk.start, end: blk.end });
      if (blk.start >= day.from) busyCount += 1;
    }
  }
  return { open, free: subtract(open, cuts), busyCount };
}

/** All bookable start times for a date. */
export function getSlots(inputs: SlotInputs, q: SlotQuery): Slot[] {
  const { settings, tz } = inputs;
  const today = todayIn(tz, q.now);
  // Step 2: day-level rejects.
  if (diffDays(q.date, today) < 0 || diffDays(q.date, today) > settings.maxAdvanceDays) return [];
  const hasAnyOverride = inputs.dateOverrides.some((o) => o.date === q.date);
  if (!hasAnyOverride && businessClosure(inputs, q.date)) return [];

  const duration = q.service.durationMin * MINUTE;
  const buffer = (q.service.bufferAfterMin ?? settings.defaultBufferMin) * MINUTE;
  const step = settings.slotIntervalMin * MINUTE;
  const earliest = q.now + settings.minNoticeMin * MINUTE;

  const byStart = new Map<number, Slot>();
  for (const staff of candidateStaff(inputs, q.service, q.staffId)) {
    const { open, free, busyCount } = freeIntervalsFor(inputs, staff.id, q.date, q.now, q.excludeBookingId);
    // Step 6: daily cap per staff member.
    if (settings.maxBookingsPerDay != null && busyCount >= settings.maxBookingsPerDay) continue;

    // Step 7: walk a grid anchored to the start of each *original* working range,
    // so a shift starting at 10:15 offers 10:15, 10:45 … rather than 10:30.
    for (const range of open) {
      for (let t = range.start; t + duration + buffer <= range.end; t += step) {
        if (t < earliest) continue; // Step 8: minimum notice.
        const need = { start: t, end: t + duration + buffer };
        if (!free.some((f) => contains(f, need))) continue;
        // Step 9: merge across staff.
        const slot = byStart.get(t) ?? { start: t, end: t + duration, staffIds: [] };
        slot.staffIds.push(staff.id);
        byStart.set(t, slot);
      }
    }
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** Cheap per-day status for the calendar (stops at the first free slot). */
export function getDayStatus(inputs: SlotInputs, service: Service, staffId: string | 'any', date: CivilDate, now: number): DayStatus {
  const today = todayIn(inputs.tz, now);
  const d = diffDays(date, today);
  if (d < 0) return 'past';
  if (d > inputs.settings.maxAdvanceDays) return 'out_of_range';
  const hasAnyOverride = inputs.dateOverrides.some((o) => o.date === date);
  if (!hasAnyOverride && businessClosure(inputs, date)) return 'closed';
  const staff = candidateStaff(inputs, service, staffId);
  const anyOpen = staff.some((s) => rangesFor(inputs, s.id, date).ranges.length > 0);
  if (!anyOpen) return 'closed';
  return getSlots(inputs, { date, service, staffId, now }).length ? 'available' : 'full';
}

/**
 * Step 10: for "any staff", pick the free member with the fewest bookings that day
 * (sortOrder breaks ties). Deterministic and spreads load fairly.
 */
export function assignStaff(inputs: SlotInputs, slot: Slot, date: CivilDate, now: number): string {
  const day = dayRange(date, inputs.tz);
  const load = (id: string) =>
    inputs.bookings.filter((b) => {
      const blk = blockingInterval(b, inputs.settings, now);
      return blk && blk.staffId === id && blk.start >= day.from && blk.start < day.to;
    }).length;
  const order = new Map(inputs.staff.map((s) => [s.id, s.sortOrder]));
  return [...slot.staffIds].sort((a, b) => load(a) - load(b) || (order.get(a) ?? 0) - (order.get(b) ?? 0))[0];
}

/** Authoritative re-check used right before writing a booking. */
export function isSlotFree(
  inputs: SlotInputs,
  q: { date: CivilDate; service: Service; staffId: string; start: number; now: number; excludeBookingId?: string },
): boolean {
  return getSlots(inputs, q).some((s) => s.start === q.start && s.staffIds.includes(q.staffId));
}

/** Does [start, end) collide with another blocking booking of this staff member? (manual-booking warning) */
export function findOverlaps(inputs: SlotInputs, staffId: string, start: number, end: number, now: number, excludeId?: string) {
  return inputs.bookings.filter((b) => {
    if (b.id === excludeId) return false;
    const blk = blockingInterval(b, inputs.settings, now);
    return blk && blk.staffId === staffId && blk.start < end && start < blk.end;
  });
}

export { merge };
