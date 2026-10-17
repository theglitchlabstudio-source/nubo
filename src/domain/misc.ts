import type { Booking } from './types';

// Booking codes: 8 chars from an alphabet without look-alikes (no 0/O/1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateBookingCode(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(rnd, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** "AB3K7Q2M" → "AB3K-7Q2M" for display. */
export function fmtCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

function icsDate(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string) {
  return s.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
}

/** Minimal RFC 5545 calendar file for "add to calendar". */
export function buildIcs(e: { uid: string; start: number; end: number; title: string; location?: string; description?: string }) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GlitchLab Studio//Nubo//FA',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.uid}@nubo`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    e.location ? `LOCATION:${icsEscape(e.location)}` : '',
    e.description ? `DESCRIPTION:${icsEscape(e.description)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadFile(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV with a UTF-8 BOM so Excel opens Persian text correctly. */
export function toCsv(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
}

export function bookingSortAsc(a: Booking, b: Booking) {
  return Date.parse(a.start) - Date.parse(b.start);
}
