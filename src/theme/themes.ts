// The seven business identities + the Nubo product brand. See docs/DESIGN.md §3.
import type { BusinessType, ThemeMode } from '@/domain/types';

export type Motif = 'poster' | 'tabs' | 'blobs' | 'glass' | 'grid' | 'dots' | 'network' | 'nubo';

export interface Swatch {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
}

export interface ThemePreset {
  id: string;
  name: string; // Persian display name
  latin: string;
  businessType: BusinessType | null;
  mode: ThemeMode; // natural mode
  light: Swatch;
  dark: Swatch;
  accent: string;
  /** Extra colors used by the generated artwork. */
  art: string[];
  radius: number;
  motif: Motif;
  description: string;
}

const DARK_BASE: Swatch = { paper: '#141413', surface: '#1D1D1B', ink: '#F0EEE9', muted: '#8F8B84' };

export const PRESETS: ThemePreset[] = [
  {
    id: 'signal',
    name: 'سیگنال',
    latin: 'Signal',
    businessType: 'barbershop',
    mode: 'dark',
    light: { paper: '#EEEDEA', surface: '#F7F6F3', ink: '#141414', muted: '#77746E' },
    dark: { paper: '#141414', surface: '#1E1E1D', ink: '#F0EEE9', muted: '#8F8B84' },
    accent: '#E5321D',
    art: ['#E5321D', '#F0EEE9', '#141414'],
    radius: 6,
    motif: 'poster',
    description: 'جسور و دقیق، مثل یک پوستر سوئیسی؛ خط قرمز، اعداد بزرگ.',
  },
  {
    id: 'peony',
    name: 'پیونی',
    latin: 'Peony',
    businessType: 'beauty_salon',
    mode: 'light',
    light: { paper: '#F4EEE6', surface: '#FBF7F2', ink: '#2B2220', muted: '#8A7C76' },
    dark: { paper: '#1B1615', surface: '#251E1C', ink: '#F4EEE6', muted: '#A39490' },
    accent: '#C4573F',
    art: ['#EDB8AE', '#C4573F', '#B5CCC8', '#557590', '#F1EBDC'],
    radius: 18,
    motif: 'tabs',
    description: 'گرم و ظریف؛ رنگ‌های پودری مثل پوشه‌های دفتر طراحی.',
  },
  {
    id: 'calm',
    name: 'آرامش',
    latin: 'Calm',
    businessType: 'psychology',
    mode: 'light',
    light: { paper: '#F3EBDD', surface: '#FAF5EC', ink: '#2A2A33', muted: '#85808A' },
    dark: { paper: '#17161B', surface: '#201F26', ink: '#F3EBDD', muted: '#9C96A0' },
    accent: '#5B63B7',
    art: ['#F07A45', '#F2C14E', '#5C9BD6', '#A6A5DA'],
    radius: 22,
    motif: 'blobs',
    description: 'نرم و امن؛ هاله‌های رنگی محو روی کاغذ کرم.',
  },
  {
    id: 'frost',
    name: 'شفاف',
    latin: 'Frost',
    businessType: 'dental',
    mode: 'light',
    light: { paper: '#F4F5F7', surface: '#FFFFFF', ink: '#16181D', muted: '#7D828C' },
    dark: { paper: '#121417', surface: '#1B1E22', ink: '#EEF0F3', muted: '#8C929B' },
    accent: '#2E86AB',
    art: ['#2B2D31', '#E9ECEF', '#9BC4D4', '#2E86AB'],
    radius: 16,
    motif: 'glass',
    description: 'تمیز و روشن؛ لایه‌های شیشه‌ای مات.',
  },
  {
    id: 'grid',
    name: 'گرید',
    latin: 'Grid',
    businessType: 'clinic',
    mode: 'light',
    light: { paper: '#E9E6DF', surface: '#F3F1EC', ink: '#121212', muted: '#75716A' },
    dark: { paper: '#121315', surface: '#1B1C1F', ink: '#ECEAE5', muted: '#8E8B85' },
    accent: '#1D4ED8',
    art: ['#1D4ED8', '#121212'],
    radius: 3,
    motif: 'grid',
    description: 'منظم و قابل اعتماد؛ شبکه دقیق با بلوک‌های آبی.',
  },
  {
    id: 'volt',
    name: 'ولت',
    latin: 'Volt',
    businessType: 'gym',
    mode: 'dark',
    light: { paper: '#E8E7E3', surface: '#F3F2EF', ink: '#121310', muted: '#75756F' },
    dark: { paper: '#111210', surface: '#1B1C19', ink: '#EDEDE8', muted: '#8C8C85' },
    accent: '#F26A1B',
    art: ['#F26A1B', '#EDEDE8', '#2A2B28'],
    radius: 12,
    motif: 'dots',
    description: 'پرانرژی و پیوسته؛ ردیف نقطه‌ها مثل روزهای تمرین.',
  },
  {
    id: 'network',
    name: 'شبکه',
    latin: 'Network',
    businessType: 'tutor',
    mode: 'light',
    light: { paper: '#E6E6E4', surface: '#F1F1EF', ink: '#1F1F1F', muted: '#777773' },
    dark: { paper: '#141414', surface: '#1E1E1E', ink: '#EDEDEB', muted: '#8E8E8A' },
    accent: '#E8643C',
    art: ['#E8643C', '#F3BCC8', '#7BA88E', '#86ACD8', '#F6D23A', '#1F1F1F'],
    radius: 14,
    motif: 'network',
    description: 'بازیگوش و یادگیرنده؛ نقطه‌های رنگی که به هم وصل می‌شوند.',
  },
];

/** Nubo's own brand: landing page and Hub. */
export const NUBO_PRESET: ThemePreset = {
  id: 'nubo',
  name: 'نوبو',
  latin: 'Nubo',
  businessType: null,
  mode: 'light',
  light: { paper: '#ECEAE5', surface: '#F6F5F2', ink: '#141414', muted: '#77746E' },
  dark: DARK_BASE,
  accent: '#F2611D',
  art: ['#F2611D', '#141414', '#ECEAE5'],
  radius: 14,
  motif: 'nubo',
  description: '',
};

export function presetById(id: string): ThemePreset {
  return PRESETS.find((p) => p.id === id) ?? (id === 'nubo' ? NUBO_PRESET : PRESETS[0]);
}

export function presetForType(t: BusinessType): ThemePreset {
  return PRESETS.find((p) => p.businessType === t) ?? PRESETS[0];
}

/** Accent alternatives offered in the branding editor. */
export const ACCENT_CHOICES = [
  '#E5321D', '#F26A1B', '#F2611D', '#E8643C', '#C4573F', '#D4A017', '#2F9E6A', '#2E86AB',
  '#1D4ED8', '#5B63B7', '#8E5BB7', '#C2417A', '#141414',
];
