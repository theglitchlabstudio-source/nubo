// All date/time math lives here.
// - Instants are UTC ISO strings (or epoch ms inside calculations).
// - CivilDate is a Gregorian "YYYY-MM-DD" in the tenant's timezone.
// - Jalali appears only in the formatting helpers at the bottom.

import { JALALI_MONTHS, WEEKDAYS, toGregorian, toJalali } from './jalali';
import { pad2, toFa } from './digits';

export type Instant = string;
export type CivilDate = string; // "2026-10-20"
export type HHmm = string; // "14:30"

export const DEFAULT_TZ = 'Asia/Tehran';
export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function partsFormatter(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

/** Wall-clock parts of an instant in a timezone. */
export function zonedParts(ms: number, tz: string) {
  const p: Record<string, number> = {};
  for (const part of partsFormatter(tz).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return { y: p.year, m: p.month, d: p.day, h: p.hour % 24, mi: p.minute, s: p.second };
}

/** Offset of `tz` from UTC at a given instant, in ms. */
function tzOffset(ms: number, tz: string) {
  const z = zonedParts(ms, tz);
  const asUtc = Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/**
 * "HH:mm on civil date D in tz" → epoch ms.
 * We never add a fixed +3:30; the offset is looked up for that exact date, so DST changes are safe.
 */
export function zonedToUtc(date: CivilDate, time: HHmm, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  // Two passes handle the rare case where the offset differs between guess and result.
  const first = guess - tzOffset(guess, tz);
  return guess - tzOffset(first, tz);
}

export function civilDateOf(ms: number, tz: string): CivilDate {
  const z = zonedParts(ms, tz);
  return `${z.y}-${pad2(z.m)}-${pad2(z.d)}`;
}

export function timeOf(ms: number, tz: string): HHmm {
  const z = zonedParts(ms, tz);
  return `${pad2(z.h)}:${pad2(z.mi)}`;
}

export function minutesOfDay(ms: number, tz: string): number {
  const z = zonedParts(ms, tz);
  return z.h * 60 + z.mi;
}

export function hhmmToMinutes(t: HHmm): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHmm(min: number): HHmm {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

export function addDays(date: CivilDate, n: number): CivilDate {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

export function diffDays(a: CivilDate, b: CivilDate): number {
  const pa = a.split('-').map(Number);
  const pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pa[0], pa[1] - 1, pa[2]) - Date.UTC(pb[0], pb[1] - 1, pb[2])) / DAY);
}

/** Iranian weekday: 0 = Saturday … 6 = Friday. */
export function weekdayOf(date: CivilDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 1) % 7;
}

/** Saturday of the week containing `date`. */
export function startOfWeek(date: CivilDate): CivilDate {
  return addDays(date, -weekdayOf(date));
}

export function todayIn(tz: string, now = Date.now()): CivilDate {
  return civilDateOf(now, tz);
}

/** The UTC range [start, end) covering a civil date in tz. */
export function dayRange(date: CivilDate, tz: string): { from: number; to: number } {
  return { from: zonedToUtc(date, '00:00', tz), to: zonedToUtc(addDays(date, 1), '00:00', tz) };
}

// ---------- Jalali helpers ----------

export function jalaliOf(date: CivilDate) {
  const [y, m, d] = date.split('-').map(Number);
  return toJalali(y, m, d);
}

export function civilFromJalali(jy: number, jm: number, jd: number): CivilDate {
  const g = toGregorian(jy, jm, jd);
  return `${g.gy}-${pad2(g.gm)}-${pad2(g.gd)}`;
}

// ---------- Formatting (Persian) ----------

/** «۲۵ مهر» or «۲۵ مهر ۱۴۰۵» */
export function fmtDate(date: CivilDate, withYear = false): string {
  const j = jalaliOf(date);
  return `${toFa(j.jd)} ${JALALI_MONTHS[j.jm - 1]}${withYear ? ` ${toFa(j.jy)}` : ''}`;
}

/** «شنبه ۲۵ مهر» */
export function fmtDayLong(date: CivilDate, withYear = false): string {
  return `${WEEKDAYS[weekdayOf(date)]} ${fmtDate(date, withYear)}`;
}

/** «امروز» / «فردا» / «دیروز» / «شنبه ۲۵ مهر» */
export function fmtRelativeDay(date: CivilDate, today: CivilDate): string {
  const d = diffDays(date, today);
  if (d === 0) return 'امروز';
  if (d === 1) return 'فردا';
  if (d === -1) return 'دیروز';
  return fmtDayLong(date);
}

export function fmtTime(ms: number | Instant, tz: string): string {
  const v = typeof ms === 'string' ? Date.parse(ms) : ms;
  return toFa(timeOf(v, tz));
}

export function fmtHHmm(t: HHmm): string {
  return toFa(t);
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${toFa(min)} دقیقه`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${toFa(h)} ساعت و ${toFa(m)} دقیقه` : `${toFa(h)} ساعت`;
}

/** «۳ ساعت پیش» style relative time for activity feeds. */
export function fmtAgo(ms: number, now = Date.now()): string {
  const diff = Math.round((now - ms) / MINUTE);
  if (diff < 1) return 'همین حالا';
  if (diff < 60) return `${toFa(diff)} دقیقه پیش`;
  const h = Math.round(diff / 60);
  if (h < 24) return `${toFa(h)} ساعت پیش`;
  return `${toFa(Math.round(h / 24))} روز پیش`;
}
