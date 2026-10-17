import { toEn, toFa } from './digits';

/** Arabic ي/ك → Persian ی/ک, trim, collapse spaces. Used for names and search. */
export function normalizeFa(s: string): string {
  return s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalizeFa(toEn(query)).toLowerCase();
  if (!q) return true;
  return normalizeFa(toEn(haystack)).toLowerCase().includes(q);
}

// ---------- Mobile numbers ----------

/** Accepts +98…, 0098…, 98…, 9…, 09… in any digit system → "09xxxxxxxxx" (or the cleaned input if it can't). */
export function normalizeMobile(input: string): string {
  let s = toEn(input).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  return s;
}

export function isValidMobile(input: string): boolean {
  return /^09\d{9}$/.test(normalizeMobile(input));
}

// Unicode isolates keep the digit groups in left-to-right order inside RTL text.
const ltr = (s: string) => `\u2066${s}\u2069`;

/** «۰۹۱۲ ۳۴۵ ۶۷۸۹» */
export function fmtMobile(m: string): string {
  const s = normalizeMobile(m);
  if (s.length !== 11) return ltr(toFa(s));
  return ltr(toFa(`${s.slice(0, 4)} ${s.slice(4, 7)} ${s.slice(7)}`));
}

/** «۰۹۱۲ ••• ۶۷۸۹» for public pages. */
export function maskMobile(m: string): string {
  const s = normalizeMobile(m);
  return ltr(toFa(`${s.slice(0, 4)} ••• ${s.slice(7)}`));
}

export function telLink(m: string): string {
  const s = normalizeMobile(m);
  return s.startsWith('0') ? `tel:+98${s.slice(1)}` : `tel:${s}`;
}

// ---------- Slugs ----------

const FA_LATIN: Record<string, string> = {
  ا: 'a', آ: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh', د: 'd', ذ: 'z', ر: 'r',
  ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'gh',
  ک: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n', و: 'v', ه: 'h', ی: 'i', ئ: 'i', ء: '', أ: 'a', ؤ: 'o',
};

/** «آرایشگاه آرش» → "arayeshgah-arsh". Rough transliteration; the user can always edit it. */
export function slugify(name: string): string {
  return normalizeFa(toEn(name))
    .toLowerCase()
    .split('')
    .map((ch) => FA_LATIN[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const RESERVED_SLUGS = ['admin', 'hub', 'api', 'b', 'login', 'demo', 'nubo', 'app', 'static', 'assets'];

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug) && !RESERVED_SLUGS.includes(slug);
}

export { toFa };
