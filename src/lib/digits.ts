const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

/** Latin digits → Persian digits (for display). */
export function toFa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

/** Persian / Arabic digits → Latin digits (for parsing and storage). */
export function toEn(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

/** 150000 → «۱۵۰٬۰۰۰» */
export function formatNumber(n: number): string {
  return toFa(Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
}

/** 150000 → «۱۵۰٬۰۰۰ تومان» */
export function formatToman(n: number): string {
  return `${formatNumber(n)} تومان`;
}

/** Parse a user-typed number in any digit system. Returns NaN when empty/invalid. */
export function parseNumber(value: string): number {
  const clean = toEn(value).replace(/[٬,\s]/g, '');
  return clean === '' ? NaN : Number(clean);
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 12_450_000 → «۱۲٫۵ میلیون», 850_000 → «۸۵۰ هزار» (for compact stats). */
export function formatCompactToman(n: number): string {
  if (n >= 1_000_000) return `${toFa((Math.round(n / 100_000) / 10).toString()).replace('.', '٫')} میلیون`;
  if (n >= 1_000) return `${toFa(Math.round(n / 1000))} هزار`;
  return toFa(n);
}
