// Turns a preset + owner overrides into the full set of CSS variables. See docs/DESIGN.md §2.
import type { BrandingTheme, ThemeMode } from '@/domain/types';
import { type ThemePreset, presetById } from './themes';

export interface Palette {
  mode: ThemeMode;
  paper: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  glass: string;
  radius: number;
  art: string[];
  preset: ThemePreset;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: number[]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

/** Mix `a` toward `b` by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** White or near-black text on a colored background, whichever reads better. */
export function readableOn(bg: string): string {
  return contrast(bg, '#FFFFFF') >= contrast(bg, '#141414') ? '#FFFFFF' : '#141414';
}

export function derivePalette(presetId: string, overrides: Partial<Pick<BrandingTheme, 'accent' | 'mode'>> = {}): Palette {
  const preset = presetById(presetId);
  const mode = overrides.mode ?? preset.mode;
  const sw = mode === 'dark' ? preset.dark : preset.light;
  const accent = overrides.accent ?? preset.accent;
  // Art colors follow the accent when the owner changes it (first art color is the accent slot).
  const art = preset.art.map((c) => (c.toLowerCase() === preset.accent.toLowerCase() ? accent : c));
  return {
    mode,
    paper: sw.paper,
    surface: sw.surface,
    surface2: mix(sw.surface, sw.ink, mode === 'dark' ? 0.08 : 0.05),
    ink: sw.ink,
    muted: sw.muted,
    line: alpha(sw.ink, mode === 'dark' ? 0.14 : 0.12),
    accent,
    accentInk: readableOn(accent),
    accentSoft: mix(sw.paper, accent, mode === 'dark' ? 0.2 : 0.14),
    glass: alpha(sw.paper, 0.74),
    radius: preset.radius,
    art,
    preset,
  };
}

export function paletteVars(p: Palette): Record<string, string> {
  return {
    '--paper': p.paper,
    '--surface': p.surface,
    '--surface-2': p.surface2,
    '--ink': p.ink,
    '--muted': p.muted,
    '--line': p.line,
    '--accent': p.accent,
    '--accent-ink': p.accentInk,
    '--accent-soft': p.accentSoft,
    '--glass': p.glass,
    '--radius': `${p.radius}px`,
    '--radius-lg': `${Math.min(p.radius * 1.5, 28)}px`,
    colorScheme: p.mode,
  };
}
