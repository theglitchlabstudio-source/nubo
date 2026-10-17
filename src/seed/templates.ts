// Business templates: create a ready-to-use tenant in minutes (Hub → new business).
import type { BookingSettings, BusinessType, PriceType, TimeRange } from '@/domain/types';
import { presetForType } from '@/theme/themes';

export interface ServiceDraft {
  name: string;
  category: string;
  durationMin: number;
  priceToman: number;
  priceType?: PriceType;
  description?: string;
  bufferAfterMin?: number;
  autoConfirmSafe?: boolean;
}

export interface BusinessTemplate {
  type: BusinessType;
  name: string;
  presetId: string;
  services: ServiceDraft[];
  /** Index 0 = Saturday … 6 = Friday. Empty array = closed. */
  week: TimeRange[][];
  settings: Partial<BookingSettings>;
  texts: { tagline: string; description: string; bookingRulesText: string };
  staffTitle: string;
  artLabels: string[];
}

const split = (a: string, b: string, c: string, d: string): TimeRange[] => [
  { start: a, end: b },
  { start: c, end: d },
];
const one = (a: string, b: string): TimeRange[] => [{ start: a, end: b }];
const sixDays = (r: TimeRange[], thu: TimeRange[] = r): TimeRange[][] => [r, r, r, r, r, thu, []];

export const DEFAULT_SETTINGS: BookingSettings = {
  slotIntervalMin: 30,
  defaultBufferMin: 0,
  minNoticeMin: 120,
  maxAdvanceDays: 30,
  maxBookingsPerDay: null,
  confirmationMode: 'manual',
  smartRules: { allowFirstVisit: false, maxNoShows: 0, minHoursAhead: 3, oneActivePerDay: true },
  holdPendingSlots: true,
  pendingExpiryHours: 24,
  cancellationWindowHours: 12,
  allowStaffChoice: true,
};

export const TEMPLATES: BusinessTemplate[] = [
  {
    type: 'barbershop',
    name: 'آرایشگاه مردانه',
    presetId: presetForType('barbershop').id,
    staffTitle: 'آرایشگر',
    artLabels: [],
    services: [
      { name: 'اصلاح مو', category: 'مو', durationMin: 45, priceToman: 250000, autoConfirmSafe: true, description: 'کوتاهی با قیچی یا ماشین، شست‌وشو و حالت‌دهی' },
      { name: 'اصلاح مو و ریش', category: 'مو', durationMin: 60, priceToman: 350000, autoConfirmSafe: true },
      { name: 'فید و طراحی', category: 'مو', durationMin: 50, priceToman: 300000, autoConfirmSafe: true, description: 'فید کلاسیک، اسکین‌فید یا طراحی خط' },
      { name: 'اصلاح و فرم ریش', category: 'ریش', durationMin: 20, priceToman: 120000, autoConfirmSafe: true },
      { name: 'رنگ مو', category: 'رنگ', durationMin: 90, priceToman: 600000, priceType: 'from' },
      { name: 'پکیج داماد', category: 'پکیج', durationMin: 180, priceToman: 3500000, priceType: 'from', description: 'اصلاح، پاکسازی پوست، ماسک و حالت‌دهی' },
    ],
    week: sixDays(split('10:00', '14:00', '16:00', '22:00')),
    settings: { slotIntervalMin: 15, confirmationMode: 'auto', minNoticeMin: 60, cancellationWindowHours: 3 },
    texts: {
      tagline: 'اصلاح دقیق، بدون معطلی',
      description: 'فضایی آرام و تمیز، آرایشگرهای باتجربه و نوبت سر وقت. نوبتت را آنلاین بگیر و دیگر منتظر نمان.',
      bookingRulesText: 'لطفاً ۱۰ دقیقه زودتر تشریف بیاورید. لغو نوبت تا ۳ ساعت قبل امکان‌پذیر است.',
    },
  },
  {
    type: 'beauty_salon',
    name: 'سالن زیبایی',
    presetId: presetForType('beauty_salon').id,
    staffTitle: 'متخصص زیبایی',
    artLabels: ['مو', 'رنگ', 'ناخن', 'پوست', 'میکاپ'],
    services: [
      { name: 'کوتاهی مو', category: 'مو', durationMin: 60, priceToman: 450000, autoConfirmSafe: true },
      { name: 'براشینگ و حالت‌دهی', category: 'مو', durationMin: 45, priceToman: 300000, autoConfirmSafe: true },
      { name: 'رنگ و لایت', category: 'رنگ', durationMin: 180, priceToman: 2500000, priceType: 'from', description: 'قیمت نهایی بعد از مشاوره و بسته به بلندی مو' },
      { name: 'کاشت ناخن', category: 'ناخن', durationMin: 120, priceToman: 900000 },
      { name: 'مانیکور', category: 'ناخن', durationMin: 45, priceToman: 350000, autoConfirmSafe: true },
      { name: 'پاکسازی پوست', category: 'پوست', durationMin: 75, priceToman: 800000 },
      { name: 'میکاپ عروس', category: 'میکاپ', durationMin: 240, priceToman: 8000000, priceType: 'from', bufferAfterMin: 30 },
    ],
    week: sixDays(one('10:00', '20:00'), one('10:00', '17:00')),
    settings: { confirmationMode: 'manual', minNoticeMin: 180, cancellationWindowHours: 24 },
    texts: {
      tagline: 'زیبایی، با حوصله و ظرافت',
      description: 'خدمات تخصصی مو، ناخن، پوست و میکاپ با مواد اورجینال. هر نوبت با دقت برنامه‌ریزی می‌شود تا وقت شما هدر نرود.',
      bookingRulesText: 'برای رنگ و لایت، جلسه مشاوره رایگان است. لغو نوبت تا ۲۴ ساعت قبل.',
    },
  },
  {
    type: 'psychology',
    name: 'مشاوره و روانشناسی',
    presetId: presetForType('psychology').id,
    staffTitle: 'روانشناس',
    artLabels: ['گفت‌وگو', 'آرامش', 'خانواده', 'رشد'],
    services: [
      { name: 'جلسه اول (ارزیابی)', category: 'فردی', durationMin: 60, priceToman: 1000000, description: 'آشنایی، بررسی نیازها و برنامه درمان' },
      { name: 'مشاوره فردی', category: 'فردی', durationMin: 50, priceToman: 900000, autoConfirmSafe: true },
      { name: 'زوج‌درمانی', category: 'زوج و خانواده', durationMin: 75, priceToman: 1400000 },
      { name: 'مشاوره کودک و نوجوان', category: 'کودک', durationMin: 50, priceToman: 800000 },
      { name: 'جلسه آنلاین (تصویری)', category: 'آنلاین', durationMin: 50, priceToman: 750000, autoConfirmSafe: true },
    ],
    week: sixDays(split('09:00', '13:00', '15:00', '20:00'), one('09:00', '13:00')),
    settings: { confirmationMode: 'manual', defaultBufferMin: 10, minNoticeMin: 720, cancellationWindowHours: 24, slotIntervalMin: 60 },
    texts: {
      tagline: 'جایی امن برای گفت‌وگو',
      description: 'روانشناسان بالینی و مشاوران خانواده با رویکردی گرم و علمی. همه جلسه‌ها محرمانه است.',
      bookingRulesText: 'لطفاً در صورت عدم امکان حضور، حداقل ۲۴ ساعت قبل اطلاع دهید. اطلاعات شما محرمانه می‌ماند.',
    },
  },
  {
    type: 'dental',
    name: 'دندانپزشکی',
    presetId: presetForType('dental').id,
    staffTitle: 'دندانپزشک',
    artLabels: [],
    services: [
      { name: 'معاینه و مشاوره', category: 'عمومی', durationMin: 20, priceToman: 300000, autoConfirmSafe: true },
      { name: 'جرم‌گیری و بروساژ', category: 'عمومی', durationMin: 40, priceToman: 900000, autoConfirmSafe: true },
      { name: 'ترمیم (پرکردن)', category: 'درمان', durationMin: 45, priceToman: 1500000, priceType: 'from' },
      { name: 'عصب‌کشی', category: 'درمان', durationMin: 90, priceToman: 4500000, priceType: 'from' },
      { name: 'بلیچینگ', category: 'زیبایی', durationMin: 60, priceToman: 3500000 },
      { name: 'ویزیت ارتودنسی', category: 'ارتودنسی', durationMin: 30, priceToman: 500000, autoConfirmSafe: true },
    ],
    week: sixDays(split('09:00', '14:00', '16:00', '20:00'), one('09:00', '13:00')),
    settings: { confirmationMode: 'smart', defaultBufferMin: 10, slotIntervalMin: 20, minNoticeMin: 240 },
    texts: {
      tagline: 'لبخند سالم، بدون استرس',
      description: 'تجهیزات به‌روز، استریل کامل و درمان بدون درد. از معاینه ساده تا درمان‌های زیبایی.',
      bookingRulesText: 'در صورت داشتن عکس یا سابقه درمان، همراه داشته باشید. لغو تا ۱۲ ساعت قبل.',
    },
  },
  {
    type: 'clinic',
    name: 'مطب و کلینیک',
    presetId: presetForType('clinic').id,
    staffTitle: 'پزشک',
    artLabels: [],
    services: [
      { name: 'ویزیت عمومی', category: 'ویزیت', durationMin: 15, priceToman: 350000, autoConfirmSafe: true },
      { name: 'ویزیت تخصصی داخلی', category: 'ویزیت', durationMin: 20, priceToman: 600000 },
      { name: 'نوار قلب', category: 'خدمات', durationMin: 15, priceToman: 250000, autoConfirmSafe: true },
      { name: 'سرم‌تراپی', category: 'خدمات', durationMin: 45, priceToman: 400000 },
      { name: 'چکاپ کامل', category: 'چکاپ', durationMin: 40, priceToman: 1200000 },
    ],
    week: [one('16:00', '21:00'), one('16:00', '21:00'), one('16:00', '21:00'), one('16:00', '21:00'), one('16:00', '21:00'), one('10:00', '13:00'), []],
    settings: { confirmationMode: 'manual', slotIntervalMin: 15, minNoticeMin: 60, cancellationWindowHours: 6 },
    texts: {
      tagline: 'ویزیت به‌موقع، بدون صف',
      description: 'متخصص داخلی با بیش از ۱۵ سال سابقه. نوبت بگیرید و دقیقاً سر ساعت ویزیت شوید.',
      bookingRulesText: 'لطفاً کارت ملی و دفترچه بیمه را همراه داشته باشید.',
    },
  },
  {
    type: 'gym',
    name: 'باشگاه ورزشی',
    presetId: presetForType('gym').id,
    staffTitle: 'مربی',
    artLabels: [],
    services: [
      { name: 'جلسه آزمایشی', category: 'شروع', durationMin: 45, priceToman: 0, priceType: 'free', autoConfirmSafe: true },
      { name: 'تمرین شخصی (PT)', category: 'تمرین', durationMin: 60, priceToman: 600000, autoConfirmSafe: true },
      { name: 'ارزیابی بدنی و برنامه', category: 'شروع', durationMin: 45, priceToman: 400000 },
      { name: 'پیلاتس خصوصی', category: 'تمرین', durationMin: 50, priceToman: 550000, autoConfirmSafe: true },
      { name: 'مشاوره تغذیه', category: 'تغذیه', durationMin: 30, priceToman: 450000 },
    ],
    week: [split('07:00', '12:00', '16:00', '23:00'), split('07:00', '12:00', '16:00', '23:00'), split('07:00', '12:00', '16:00', '23:00'), split('07:00', '12:00', '16:00', '23:00'), split('07:00', '12:00', '16:00', '23:00'), split('08:00', '12:00', '16:00', '21:00'), one('08:00', '12:00')],
    settings: { confirmationMode: 'auto', slotIntervalMin: 30, minNoticeMin: 60, cancellationWindowHours: 4 },
    texts: {
      tagline: 'هر روز، یک قدم قوی‌تر',
      description: 'مربیان مدرک‌دار، برنامه شخصی و فضای پرانرژی. اولین جلسه آزمایشی رایگان است.',
      bookingRulesText: 'لباس ورزشی و حوله شخصی همراه داشته باشید. لغو تا ۴ ساعت قبل.',
    },
  },
  {
    type: 'tutor',
    name: 'معلم خصوصی',
    presetId: presetForType('tutor').id,
    staffTitle: 'مدرس',
    artLabels: [],
    services: [
      { name: 'جلسه تعیین سطح', category: 'شروع', durationMin: 30, priceToman: 0, priceType: 'free' },
      { name: 'ریاضی متوسطه اول', category: 'ریاضی', durationMin: 60, priceToman: 450000, autoConfirmSafe: true },
      { name: 'ریاضی کنکور', category: 'ریاضی', durationMin: 90, priceToman: 900000, autoConfirmSafe: true },
      { name: 'فیزیک', category: 'فیزیک', durationMin: 90, priceToman: 850000, autoConfirmSafe: true },
      { name: 'رفع اشکال آنلاین', category: 'آنلاین', durationMin: 45, priceToman: 350000 },
    ],
    week: [one('15:00', '21:00'), one('15:00', '21:00'), one('15:00', '21:00'), one('15:00', '21:00'), one('15:00', '21:00'), one('10:00', '18:00'), one('09:00', '13:00')],
    settings: { confirmationMode: 'manual', minNoticeMin: 240, cancellationWindowHours: 12 },
    texts: {
      tagline: 'یاد گرفتن، قدم‌به‌قدم',
      description: 'آموزش مفهومی ریاضی و فیزیک برای متوسطه و کنکور، حضوری و آنلاین. برنامه درسی مخصوص هر دانش‌آموز.',
      bookingRulesText: 'برای جلسه اول، کتاب و جزوه‌های فعلی را همراه داشته باشید.',
    },
  },
];

export function templateFor(type: BusinessType): BusinessTemplate {
  return TEMPLATES.find((t) => t.type === type)!;
}
