// Generates src/seed/holidays.json — official Iranian holidays for the given Jalali years.
// Solar holidays are fixed in the Jalali calendar. Lunar holidays are computed with the
// tabular Islamic calendar (islamic-civil), which matched Iran's 2025 official dates best;
// Iran announces lunar dates by observation, so they can be off by a day — verify yearly.
// Run: node scripts/gen-holidays.mjs
import { writeFileSync } from 'node:fs';
import { toJalali, toGregorian } from '../src/lib/jalali.ts';

const YEARS = [1405, 1406];
const SOLAR = [
  [1, 1, 'عید نوروز'], [1, 2, 'عید نوروز'], [1, 3, 'عید نوروز'], [1, 4, 'عید نوروز'],
  [1, 12, 'روز جمهوری اسلامی'], [1, 13, 'روز طبیعت'],
  [3, 14, 'رحلت امام خمینی'], [3, 15, 'قیام ۱۵ خرداد'],
  [11, 22, 'پیروزی انقلاب اسلامی'], [12, 29, 'ملی شدن صنعت نفت'],
];
const LUNAR = [
  [1, 9, 'تاسوعای حسینی'], [1, 10, 'عاشورای حسینی'], [2, 20, 'اربعین حسینی'],
  [2, 28, 'رحلت پیامبر و شهادت امام حسن'], [2, 29, 'شهادت امام رضا'],
  [3, 8, 'شهادت امام حسن عسکری'], [3, 17, 'میلاد پیامبر و امام صادق'],
  [6, 3, 'شهادت حضرت فاطمه'], [7, 13, 'ولادت امام علی'], [7, 27, 'مبعث'],
  [8, 15, 'ولادت امام زمان'], [9, 21, 'شهادت امام علی'], [10, 1, 'عید فطر'], [10, 2, 'تعطیلی عید فطر'],
  [10, 25, 'شهادت امام صادق'], [12, 10, 'عید قربان'], [12, 18, 'عید غدیر'],
];
const pad = (n) => String(n).padStart(2, '0');
const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-civil', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });
const out = [];
for (const jy of YEARS) {
  for (const [jm, jd, title] of SOLAR) {
    const g = toGregorian(jy, jm, jd);
    out.push({ date: `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`, title, kind: 'solar' });
  }
  const start = toGregorian(jy, 1, 1);
  const end = toGregorian(jy + 1, 1, 1);
  for (let t = Date.UTC(start.gy, start.gm - 1, start.gd); t < Date.UTC(end.gy, end.gm - 1, end.gd); t += 86400000) {
    const d = new Date(t + 43200000);
    const [hm, hd] = hijri.format(d).split('/').map(Number);
    const hit = LUNAR.find(([m, dd]) => m === hm && dd === hd);
    if (hit) out.push({ date: d.toISOString().slice(0, 10), title: hit[2], kind: 'lunar' });
  }
}
const merged = new Map();
for (const h of out.sort((a, b) => a.date.localeCompare(b.date))) {
  const prev = merged.get(h.date);
  merged.set(h.date, prev ? { ...prev, title: `${prev.title} · ${h.title}` } : { key: `oh-${h.date}`, ...h });
}
writeFileSync('src/seed/holidays.json', JSON.stringify([...merged.values()], null, 1));
console.log(merged.size, 'holidays written');
