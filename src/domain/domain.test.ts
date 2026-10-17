import { describe, expect, it } from 'vitest';
import { getSlots, getDayStatus, assignStaff, isSlotFree } from './slots';
import type { SlotInputs } from './slots';
import type { Booking, Service, BookingSettings } from './types';
import { canTransition, effectiveStatus } from './bookingMachine';
import { subtract } from './intervals';
import { toJalali, toGregorian, jalaliMonthLength } from '@/lib/jalali';
import { zonedToUtc, timeOf, weekdayOf, civilDateOf } from '@/lib/time';
import { normalizeMobile, isValidMobile, slugify } from '@/lib/text';
import { toEn, formatToman } from '@/lib/digits';

const TZ = 'Asia/Tehran';
const settings: BookingSettings = {
  slotIntervalMin: 30,
  defaultBufferMin: 0,
  minNoticeMin: 0,
  maxAdvanceDays: 30,
  maxBookingsPerDay: null,
  confirmationMode: 'manual',
  smartRules: { allowFirstVisit: true, maxNoShows: 0, minHoursAhead: 0, oneActivePerDay: false },
  holdPendingSlots: true,
  pendingExpiryHours: 24,
  cancellationWindowHours: 12,
  allowStaffChoice: true,
};
const service: Service = {
  id: 'svc', tenantId: 't', name: 'اصلاح', description: '', category: '', durationMin: 30, bufferAfterMin: null,
  priceToman: 100000, priceType: 'fixed', staffIds: ['a', 'b'], active: true, autoConfirmSafe: true, sortOrder: 0,
};
// 2026-10-20 is a Tuesday → Iranian weekday 3 (سه‌شنبه)
const DATE = '2026-10-20';
const NOW = zonedToUtc('2026-10-19', '12:00', TZ);

function inputs(over: Partial<SlotInputs> = {}): SlotInputs {
  return {
    tz: TZ,
    settings,
    staff: [
      { id: 'a', tenantId: 't', name: 'A', title: '', color: '#000', active: true, sortOrder: 0 },
      { id: 'b', tenantId: 't', name: 'B', title: '', color: '#000', active: true, sortOrder: 1 },
    ],
    workingHours: [{ id: 'w', tenantId: 't', staffId: null, weekday: 3, ranges: [{ start: '10:00', end: '12:00' }] }],
    dateOverrides: [],
    timeOff: [],
    bookings: [],
    ...over,
  };
}

function booking(over: Partial<Booking>): Booking {
  return {
    id: 'bk', tenantId: 't', code: 'X', serviceId: 'svc', staffId: 'a', customerId: 'c',
    start: new Date(zonedToUtc(DATE, '10:00', TZ)).toISOString(),
    end: new Date(zonedToUtc(DATE, '10:30', TZ)).toISOString(),
    durationMin: 30, bufferAfterMin: 0, serviceName: '', priceToman: 0, customerName: '', customerMobile: '',
    status: 'confirmed', source: 'online', customerNote: '', internalNote: '',
    createdAt: '', updatedAt: '', statusChangedAt: '',
    ...over,
  };
}

const times = (slots: { start: number }[]) => slots.map((s) => timeOf(s.start, TZ));

describe('time + jalali', () => {
  it('converts known dates', () => {
    expect(toJalali(2026, 3, 21)).toEqual({ jy: 1405, jm: 1, jd: 1 });
    expect(toGregorian(1405, 7, 28)).toEqual({ gy: 2026, gm: 10, gd: 20 });
    expect(jalaliMonthLength(1405, 7)).toBe(30);
  });
  it('uses Saturday-first weekdays', () => {
    expect(weekdayOf('2026-10-17')).toBe(0); // Saturday
    expect(weekdayOf('2026-10-23')).toBe(6); // Friday
  });
  it('converts Tehran wall clock to UTC (+03:30)', () => {
    expect(new Date(zonedToUtc(DATE, '10:00', TZ)).toISOString()).toBe('2026-10-20T06:30:00.000Z');
    expect(civilDateOf(Date.parse('2026-10-20T21:00:00Z'), TZ)).toBe('2026-10-21');
  });
});

describe('intervals', () => {
  it('subtracts', () => {
    expect(subtract([{ start: 0, end: 10 }], [{ start: 3, end: 5 }])).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 10 },
    ]);
  });
});

describe('slot engine', () => {
  it('generates a grid inside working hours', () => {
    expect(times(getSlots(inputs(), { date: DATE, service, staffId: 'a', now: NOW }))).toEqual([
      '10:00', '10:30', '11:00', '11:30',
    ]);
  });

  it('treats gaps between ranges as breaks and anchors the grid to each range', () => {
    const wh = [{ id: 'w', tenantId: 't', staffId: null, weekday: 3, ranges: [{ start: '10:15', end: '11:15' }, { start: '12:00', end: '13:00' }] }];
    expect(times(getSlots(inputs({ workingHours: wh }), { date: DATE, service, staffId: 'a', now: NOW }))).toEqual([
      '10:15', '10:45', '12:00', '12:30',
    ]);
  });

  it('blocks confirmed bookings with their buffer (half-open)', () => {
    const b = booking({ bufferAfterMin: 15 });
    expect(times(getSlots(inputs({ bookings: [b] }), { date: DATE, service, staffId: 'a', now: NOW }))).toEqual([
      '11:00', '11:30',
    ]);
  });

  it('honors pending holds only while not expired', () => {
    const held = booking({ status: 'pending', holdExpiresAt: new Date(NOW + 3_600_000).toISOString() });
    const stale = booking({ status: 'pending', holdExpiresAt: new Date(NOW - 1).toISOString() });
    expect(times(getSlots(inputs({ bookings: [held] }), { date: DATE, service, staffId: 'a', now: NOW }))[0]).toBe('10:30');
    expect(times(getSlots(inputs({ bookings: [stale] }), { date: DATE, service, staffId: 'a', now: NOW }))[0]).toBe('10:00');
    expect(effectiveStatus(stale, NOW)).toBe('expired');
  });

  it('merges staff for "any" and assigns the least loaded', () => {
    const b = booking({});
    const inp = inputs({ bookings: [b] });
    const slots = getSlots(inp, { date: DATE, service, staffId: 'any', now: NOW });
    expect(slots[0].staffIds).toEqual(['b']);
    const s1030 = slots.find((s) => timeOf(s.start, TZ) === '10:30')!;
    expect(s1030.staffIds.sort()).toEqual(['a', 'b']);
    expect(assignStaff(inp, s1030, DATE, NOW)).toBe('b');
  });

  it('applies minimum notice and advance window', () => {
    const now = zonedToUtc(DATE, '10:10', TZ);
    const s = getSlots(inputs({ settings: { ...settings, minNoticeMin: 30 } }), { date: DATE, service, staffId: 'a', now });
    expect(times(s)).toEqual(['11:00', '11:30']);
    expect(getDayStatus(inputs({ settings: { ...settings, maxAdvanceDays: 0 } }), service, 'a', DATE, NOW)).toBe('out_of_range');
  });

  it('closes on official holidays unless disabled or overridden', () => {
    const hol = {
      id: 'h', tenantId: 't', staffId: null, kind: 'holiday' as const, allDay: true, source: 'official_holiday' as const, disabled: false,
      start: new Date(zonedToUtc(DATE, '00:00', TZ)).toISOString(),
      end: new Date(zonedToUtc('2026-10-21', '00:00', TZ)).toISOString(),
    };
    expect(getDayStatus(inputs({ timeOff: [hol] }), service, 'a', DATE, NOW)).toBe('closed');
    expect(getDayStatus(inputs({ timeOff: [{ ...hol, disabled: true }] }), service, 'a', DATE, NOW)).toBe('available');
    const ov = [{ id: 'o', tenantId: 't', staffId: null, date: DATE, ranges: [{ start: '16:00', end: '17:00' }] }];
    expect(times(getSlots(inputs({ timeOff: [hol], dateOverrides: ov }), { date: DATE, service, staffId: 'a', now: NOW }))).toEqual([
      '16:00', '16:30',
    ]);
  });

  it('respects the daily cap and re-checks slots', () => {
    const inp = inputs({ bookings: [booking({})], settings: { ...settings, maxBookingsPerDay: 1 } });
    expect(getSlots(inp, { date: DATE, service, staffId: 'a', now: NOW })).toEqual([]);
    expect(isSlotFree(inputs({ bookings: [booking({})] }), { date: DATE, service, staffId: 'a', start: zonedToUtc(DATE, '10:00', TZ), now: NOW })).toBe(false);
  });
});

describe('state machine', () => {
  it('guards transitions by actor', () => {
    expect(canTransition('pending', 'confirmed', 'business')).toBe(true);
    expect(canTransition('pending', 'rejected', 'customer')).toBe(false);
    expect(canTransition('cancelled', 'confirmed', 'business')).toBe(false);
  });
});

describe('persian input', () => {
  it('normalizes mobiles and digits', () => {
    expect(normalizeMobile('+98 912 345 6789')).toBe('09123456789');
    expect(normalizeMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(isValidMobile('9123456789')).toBe(true);
    expect(isValidMobile('0812345678')).toBe(false);
    expect(toEn('۱۲٣')).toBe('123');
    expect(formatToman(150000)).toBe('۱۵۰٬۰۰۰ تومان');
    expect(slugify('آرایشگاه آرش')).toBe('araishgah-arsh');
  });
});
