// Demo data: 7 businesses (one per type), generated relative to "now" so the demo always looks alive.
import type {
  AuditLog,
  Booking,
  BookingStatus,
  BrandingTheme,
  BusinessType,
  ChatbotConfig,
  Customer,
  NotificationRecord,
  PlanId,
  Service,
  Staff,
  Tenant,
  TimeOff,
  User,
  WorkingHours,
} from '@/domain/types';
import { DEFAULT_SETTINGS, type BusinessTemplate, templateFor } from './templates';
import holidays from './holidays.json';
import { businessClosure, rangesFor, type SlotInputs } from '@/domain/slots';
import { generateBookingCode } from '@/domain/misc';
import { DEFAULT_TZ, HOUR, MINUTE, DAY, addDays, diffDays, todayIn, zonedToUtc } from '@/lib/time';
import { seededRandom } from '@/lib/cn';
import { hashPin } from '@/lib/crypto';
import { customerMessage } from '@/services/notifications';

export const STAFF_COLORS = ['#E8643C', '#7BA88E', '#86ACD8', '#D99AAE', '#E2B93B', '#A6A5DA', '#5E8C9A'];

export const DEMO_PINS = { owner: '1111', secretary: '2222', super_admin: '0000' };

export interface TenantData {
  tenant: Tenant;
  branding: BrandingTheme;
  services: Service[];
  staff: Staff[];
  hours: WorkingHours[];
  timeOff: TimeOff[];
  customers: Customer[];
  bookings: Booking[];
  users: User[];
  notifications: NotificationRecord[];
  audit: AuditLog[];
  chatbot: ChatbotConfig;
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Official holidays copied into a tenant as overridable TimeOff rows (ARCHITECTURE §3.2). */
export function holidayRows(tenantId: string, tz: string, fromDate: string): TimeOff[] {
  return (holidays as { key: string; date: string; title: string }[])
    .filter((h) => diffDays(h.date, fromDate) >= -7)
    .map((h) => ({
      id: `${tenantId}-${h.key}`,
      tenantId,
      staffId: null,
      kind: 'holiday' as const,
      start: iso(zonedToUtc(h.date, '00:00', tz)),
      end: iso(zonedToUtc(addDays(h.date, 1), '00:00', tz)),
      allDay: true,
      reason: h.title,
      source: 'official_holiday' as const,
      officialHolidayKey: h.key,
      disabled: false,
    }));
}

export interface BaseTenantInput {
  id: string;
  slug: string;
  name: string;
  type: BusinessType;
  planId: PlanId;
  presetId?: string;
  staff: { name: string; title?: string }[];
  /** category → staff indexes that perform it (default: everyone) */
  serviceStaff?: Record<string, number[]>;
  contact: { name: string; mobile: string };
  subscriptionDays: number;
  status?: Tenant['status'];
  isDemo: boolean;
  profile?: Partial<Tenant['profile']>;
  featureOverrides?: Tenant['featureOverrides'];
  now: number;
}

/** A tenant built from its template, without customers or bookings. Used by the Hub too. */
export function buildBaseTenant(input: BaseTenantInput): Omit<TenantData, 'users'> {
  const tpl: BusinessTemplate = templateFor(input.type);
  const tz = DEFAULT_TZ;
  const today = todayIn(tz, input.now);
  const created = iso(input.now - 40 * DAY);
  const id = input.id;

  const tenant: Tenant = {
    id,
    slug: input.slug,
    name: input.name,
    businessType: input.type,
    status: input.status ?? 'active',
    planId: input.planId,
    featureOverrides: input.featureOverrides ?? {},
    subscription: { startDate: addDays(today, -30), endDate: addDays(today, input.subscriptionDays) },
    contact: input.contact,
    internalNotes: '',
    timezone: tz,
    profile: {
      tagline: tpl.texts.tagline,
      description: tpl.texts.description,
      address: '',
      city: '',
      location: { mapLinks: {} },
      phones: [input.contact.mobile],
      socials: {},
      bookingRulesText: tpl.texts.bookingRulesText,
      ...input.profile,
    },
    bookingSettings: { ...DEFAULT_SETTINGS, ...tpl.settings },
    isDemo: input.isDemo,
    createdAt: created,
    updatedAt: created,
  };

  const staff: Staff[] = input.staff.map((s, i) => ({
    id: `${id}-st${i}`,
    tenantId: id,
    name: s.name,
    title: s.title ?? tpl.staffTitle,
    color: STAFF_COLORS[i % STAFF_COLORS.length],
    active: true,
    sortOrder: i,
  }));

  const services: Service[] = tpl.services.map((s, i) => {
    const idx = input.serviceStaff?.[s.category];
    return {
      id: `${id}-sv${i}`,
      tenantId: id,
      name: s.name,
      description: s.description ?? '',
      category: s.category,
      durationMin: s.durationMin,
      bufferAfterMin: s.bufferAfterMin ?? null,
      priceToman: s.priceToman,
      priceType: s.priceType ?? 'fixed',
      staffIds: (idx ?? staff.map((_, k) => k)).filter((k) => k < staff.length).map((k) => staff[k].id),
      active: true,
      autoConfirmSafe: !!s.autoConfirmSafe,
      sortOrder: i,
    };
  });

  const hours: WorkingHours[] = tpl.week.map((ranges, weekday) => ({
    id: `${id}-wh${weekday}`,
    tenantId: id,
    staffId: null,
    weekday,
    ranges,
  }));

  return {
    tenant,
    branding: { tenantId: id, presetId: input.presetId ?? tpl.presetId, gallery: [] },
    services,
    staff,
    hours,
    timeOff: holidayRows(id, tz, today),
    customers: [],
    bookings: [],
    notifications: [],
    audit: [],
    chatbot: {
      tenantId: id,
      greeting: `سلام! من دستیار ${input.name} هستم. چطور می‌توانم کمکتان کنم؟`,
      faq: [
        { q: 'ساعت کاری', a: 'ساعت کاری ما در همین صفحه آمده است.' },
        { q: 'لغو نوبت', a: tpl.texts.bookingRulesText },
      ],
    },
  };
}

export async function buildUsers(tenantId: string | null, people: { role: User['role']; name: string; mobile: string; pin: string }[]) {
  return Promise.all(
    people.map(async (p) => {
      const id = `${tenantId ?? 'global'}-${p.role}`;
      return { id, tenantId, role: p.role, name: p.name, mobile: p.mobile, pinHash: await hashPin(id, p.pin), active: true } as User;
    }),
  );
}

// ---------- People ----------

const FIRST = ['علی', 'محمد', 'رضا', 'حسین', 'امیر', 'مهدی', 'سارا', 'مریم', 'زهرا', 'فاطمه', 'نگین', 'پریا', 'آرمان', 'کیان', 'یاسمن', 'هستی', 'پویا', 'بهار', 'نیلوفر', 'سپیده', 'امید', 'شیما', 'فرهاد', 'لیلا', 'مانی', 'ترانه', 'بردیا', 'آیدا', 'کاوه', 'الناز'];
const LAST = ['محمدی', 'حسینی', 'رضایی', 'کریمی', 'احمدی', 'موسوی', 'جعفری', 'صادقی', 'رحیمی', 'نوری', 'کاظمی', 'قاسمی', 'شریفی', 'زارعی', 'اکبری', 'طاهری', 'فراهانی', 'یزدانی', 'مرادی', 'بهرامی'];
const PREFIX = ['912', '913', '919', '935', '936', '901', '902', '910', '921', '922', '937', '903'];
const NOTES = ['مشتری ثابت، چای بدون قند 🙂', 'به عطر حساسیت دارد', 'ترجیح: نوبت‌های عصر', 'پرداخت کارت‌به‌کارت', 'معرفی از اینستاگرام', ''];

function makeCustomers(tenantId: string, rnd: () => number, count: number, now: number): Customer[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    let mobile = '';
    do mobile = `0${PREFIX[Math.floor(rnd() * PREFIX.length)]}${String(Math.floor(rnd() * 1e7)).padStart(7, '0')}`;
    while (used.has(mobile));
    used.add(mobile);
    return {
      id: `${tenantId}-cu${i}`,
      tenantId,
      name: `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`,
      mobile,
      notes: rnd() < 0.25 ? NOTES[Math.floor(rnd() * NOTES.length)] : '',
      tags: rnd() < 0.2 ? ['VIP'] : [],
      blocked: false,
      createdAt: iso(now - (60 + Math.floor(rnd() * 200)) * DAY),
    };
  });
}

// ---------- Bookings ----------

function generateBookings(d: Omit<TenantData, 'users'>, rnd: () => number, now: number) {
  const { tenant, services, staff } = d;
  const tz = tenant.timezone;
  const s = tenant.bookingSettings;
  const today = todayIn(tz, now);
  const inputs: SlotInputs = {
    tz,
    settings: s,
    staff,
    workingHours: d.hours,
    dateOverrides: [],
    timeOff: d.timeOff,
    bookings: [],
  };
  const out: Booking[] = [];
  const customers = d.customers;
  // Regulars get more visits.
  const pickCustomer = () => customers[Math.floor(rnd() ** 1.7 * customers.length)];

  for (let off = -35; off <= 14; off += 1) {
    const date = addDays(today, off);
    if (businessClosure(inputs, date)) continue;
    const density = off < 0 ? 0.5 : off === 0 ? 0.62 : Math.max(0.12, 0.55 - off * 0.035);
    for (const st of staff) {
      const eligible = services.filter((sv) => sv.staffIds.includes(st.id) && sv.durationMin <= 120);
      if (!eligible.length) continue;
      for (const r of rangesFor(inputs, st.id, date).ranges) {
        let t = zonedToUtc(date, r.start, tz);
        const end = zonedToUtc(date, r.end, tz);
        while (t < end) {
          const sv = eligible[Math.floor(rnd() * eligible.length)];
          const buffer = sv.bufferAfterMin ?? s.defaultBufferMin;
          const len = (sv.durationMin + buffer) * MINUTE;
          if (t + len > end) break;
          if (rnd() < density) {
            const c = pickCustomer();
            const start = t;
            let status: BookingStatus = 'confirmed';
            if (start + sv.durationMin * MINUTE < now) {
              const x = rnd();
              status = x < 0.06 ? 'no_show' : x < 0.14 ? 'cancelled' : 'completed';
            } else if (rnd() < 0.05) status = 'cancelled';
            const createdAt = start - (1 + Math.floor(rnd() * 6)) * DAY - Math.floor(rnd() * 10) * HOUR;
            out.push({
              id: `${tenant.id}-bk${out.length}`,
              tenantId: tenant.id,
              code: generateBookingCode(),
              serviceId: sv.id,
              staffId: st.id,
              customerId: c.id,
              start: iso(start),
              end: iso(start + sv.durationMin * MINUTE),
              durationMin: sv.durationMin,
              bufferAfterMin: buffer,
              serviceName: sv.name,
              priceToman: sv.priceToman,
              customerName: c.name,
              customerMobile: c.mobile,
              status,
              source: rnd() < 0.7 ? 'online' : rnd() < 0.5 ? 'phone' : 'walk_in',
              customerNote: rnd() < 0.08 ? 'اگر امکان دارد کمی زودتر شروع کنیم.' : '',
              internalNote: '',
              cancelledBy: status === 'cancelled' ? (rnd() < 0.7 ? 'customer' : 'business') : undefined,
              createdAt: iso(Math.min(createdAt, now - HOUR)),
              updatedAt: iso(Math.min(createdAt, now - HOUR)),
              statusChangedAt: iso(Math.min(createdAt + HOUR, now - HOUR)),
            });
            // Round the next start up to the slot grid.
            const step = s.slotIntervalMin * MINUTE;
            t = start + Math.ceil(len / step) * step;
          } else {
            t += s.slotIntervalMin * MINUTE;
          }
        }
      }
    }
  }

  // Fresh requests for the inbox (manual / smart businesses only).
  if (s.confirmationMode !== 'auto') {
    const future = out.filter((b) => b.status === 'confirmed' && Date.parse(b.start) > now + 3 * HOUR && Date.parse(b.start) < now + 6 * DAY);
    const picks = future.filter((_, i) => i % Math.max(1, Math.floor(future.length / 5)) === 1).slice(0, 5);
    picks.forEach((b, i) => {
      const createdAt = now - (12 + i * 47) * MINUTE;
      b.status = 'pending';
      b.source = 'online';
      b.createdAt = iso(createdAt);
      b.updatedAt = iso(createdAt);
      b.statusChangedAt = iso(createdAt);
      b.holdExpiresAt = iso(createdAt + s.pendingExpiryHours * HOUR);
      if (s.confirmationMode === 'smart') b.autoDecision = { decision: 'review', reasons: [i % 2 ? 'اولین مراجعه این مشتری است' : 'این خدمت نیاز به بررسی دارد'] };
    });
  }
  return out;
}

// ---------- The seven demo businesses ----------

interface DemoSpec extends Omit<BaseTenantInput, 'now' | 'isDemo'> {
  customers: number;
  secretary: string;
}

const DEMOS: DemoSpec[] = [
  {
    id: 'demo-barber',
    slug: 'arash-barber',
    name: 'آرایشگاه آرش',
    type: 'barbershop',
    planId: 'pro',
    staff: [{ name: 'آرش رضایی', title: 'استاد آرایشگر' }, { name: 'میلاد کریمی' }, { name: 'سینا موسوی' }],
    serviceStaff: { رنگ: [0], پکیج: [0] },
    contact: { name: 'آرش رضایی', mobile: '09121234567' },
    subscriptionDays: 120,
    secretary: 'کیوان',
    customers: 40,
    profile: {
      address: 'تهران، ستارخان، خیابان باقرخان، پلاک ۴۲',
      city: 'تهران',
      location: { lat: 35.7129, lng: 51.3631, mapLinks: {} },
      socials: { instagram: 'arash.barber', telegram: 'arash_barber' },
    },
  },
  {
    id: 'demo-salon',
    slug: 'rose-salon',
    name: 'سالن زیبایی رُز',
    type: 'beauty_salon',
    planId: 'pro',
    staff: [{ name: 'نازنین فرهادی', title: 'متخصص رنگ و مو' }, { name: 'الهام شریفی', title: 'ناخن‌کار' }, { name: 'ساره امینی', title: 'متخصص پوست و میکاپ' }],
    serviceStaff: { مو: [0], رنگ: [0], ناخن: [1], پوست: [2], میکاپ: [2] },
    contact: { name: 'نازنین فرهادی', mobile: '09351234567' },
    subscriptionDays: 9,
    secretary: 'مهسا',
    customers: 34,
    profile: {
      address: 'تهران، پونک، بلوار عدل، مجتمع گلها، طبقه دوم',
      city: 'تهران',
      location: { lat: 35.7589, lng: 51.3337, mapLinks: {} },
      socials: { instagram: 'rose.salon.tehran', whatsapp: '09351234567' },
    },
  },
  {
    id: 'demo-psych',
    slug: 'aramesh',
    name: 'مرکز مشاوره آرامش',
    type: 'psychology',
    planId: 'pro',
    featureOverrides: { chatbot: true },
    staff: [{ name: 'دکتر مریم احمدی', title: 'روانشناس بالینی' }, { name: 'دکتر علی نوری', title: 'مشاور خانواده' }, { name: 'سارا کاظمی', title: 'روانشناس کودک' }],
    serviceStaff: { فردی: [0, 1], 'زوج و خانواده': [1], کودک: [2], آنلاین: [0, 1, 2] },
    contact: { name: 'مریم احمدی', mobile: '09131234567' },
    subscriptionDays: 210,
    secretary: 'فرشته',
    customers: 30,
    profile: {
      address: 'اصفهان، خیابان چهارباغ بالا، کوچه ۱۲، ساختمان پزشکان نور',
      city: 'اصفهان',
      location: { lat: 32.6411, lng: 51.6716, mapLinks: {} },
      socials: { instagram: 'aramesh.counseling', bale: 'aramesh_center' },
    },
  },
  {
    id: 'demo-dental',
    slug: 'labkhand',
    name: 'کلینیک دندانپزشکی لبخند',
    type: 'dental',
    planId: 'pro',
    staff: [{ name: 'دکتر نیما صادقی', title: 'دندانپزشک عمومی' }, { name: 'دکتر پریسا مرادی', title: 'متخصص ارتودنسی' }],
    serviceStaff: { عمومی: [0, 1], درمان: [0], زیبایی: [0], ارتودنسی: [1] },
    contact: { name: 'نیما صادقی', mobile: '09171234567' },
    subscriptionDays: 60,
    secretary: 'رویا',
    customers: 36,
    profile: {
      address: 'شیراز، خیابان ملاصدرا، روبروی بانک ملت، ساختمان سینا، واحد ۵',
      city: 'شیراز',
      location: { lat: 29.6261, lng: 52.5358, mapLinks: {} },
      socials: { instagram: 'labkhand.dental' },
    },
  },
  {
    id: 'demo-clinic',
    slug: 'dr-tavakoli',
    name: 'مطب دکتر سپهر توکلی',
    type: 'clinic',
    planId: 'basic',
    status: 'trial',
    staff: [{ name: 'دکتر سپهر توکلی', title: 'متخصص داخلی' }],
    contact: { name: 'سپهر توکلی', mobile: '09151234567' },
    subscriptionDays: 5,
    secretary: 'خانم صالحی',
    customers: 30,
    profile: {
      address: 'مشهد، بلوار احمدآباد، ساختمان پزشکان ابن‌سینا، طبقه سوم',
      city: 'مشهد',
      location: { lat: 36.2972, lng: 59.5735, mapLinks: {} },
      socials: {},
    },
  },
  {
    id: 'demo-gym',
    slug: 'volt-gym',
    name: 'باشگاه ولت',
    type: 'gym',
    planId: 'pro',
    staff: [{ name: 'کامران جعفری', title: 'مربی بدنسازی' }, { name: 'نگار حسینی', title: 'مربی پیلاتس' }, { name: 'امید رستمی', title: 'مربی TRX و تغذیه' }],
    serviceStaff: { تمرین: [0, 2], تغذیه: [2], شروع: [0, 1, 2] },
    contact: { name: 'کامران جعفری', mobile: '09191234567' },
    subscriptionDays: 300,
    secretary: 'پذیرش',
    customers: 38,
    profile: {
      address: 'کرج، عظیمیه، میدان مهران، ساختمان ولت',
      city: 'کرج',
      location: { lat: 35.8327, lng: 50.9915, mapLinks: {} },
      socials: { instagram: 'volt.gym', telegram: 'voltgym' },
    },
  },
  {
    id: 'demo-tutor',
    slug: 'mahdavi-math',
    name: 'کلاس ریاضی استاد مهدوی',
    type: 'tutor',
    planId: 'basic',
    staff: [{ name: 'رضا مهدوی', title: 'مدرس ریاضی و فیزیک' }],
    contact: { name: 'رضا مهدوی', mobile: '09141234567' },
    subscriptionDays: 30,
    secretary: 'دستیار',
    customers: 22,
    profile: {
      address: 'تبریز، خیابان ولیعصر، فلکه بارنج، کوچه یاس',
      city: 'تبریز',
      location: { lat: 38.0717, lng: 46.3207, mapLinks: {} },
      socials: { instagram: 'mahdavi.math', eitaa: 'mahdavi_math' },
    },
  },
];

export async function buildDemoData(now: number): Promise<{ tenants: TenantData[]; superAdmins: User[] }> {
  const tenants: TenantData[] = [];
  for (const spec of DEMOS) {
    const rnd = seededRandom(spec.slug);
    const base = buildBaseTenant({ ...spec, isDemo: true, now });
    base.customers = makeCustomers(spec.id, rnd, spec.customers, now);
    if (spec.type === 'psychology') base.tenant.profile.bookingRulesText += ' جلسه‌ها کاملاً محرمانه است.';
    base.bookings = generateBookings(base, rnd, now);
    const users = await buildUsers(spec.id, [
      { role: 'owner', name: spec.contact.name, mobile: spec.contact.mobile, pin: DEMO_PINS.owner },
      { role: 'secretary', name: spec.secretary, mobile: '09000000000', pin: DEMO_PINS.secretary },
    ]);
    const tpl = templateFor(spec.type);
    base.tenant.internalNotes = 'مشتری دمو — برای نمایش به مشتریان بالقوه';
    // Simulated outbox: requests + recent confirmations.
    const recent = base.bookings.filter((b) => Date.parse(b.statusChangedAt) > now - 3 * DAY && b.status !== 'completed').slice(-8);
    base.notifications = recent.map((b, i) => ({
      id: `${spec.id}-nt${i}`,
      tenantId: spec.id,
      bookingId: b.id,
      event: b.status === 'pending' ? 'booking.created' : 'booking.confirmed',
      channel: b.status === 'pending' ? 'in_app' : 'sms',
      recipient: b.status === 'pending' ? 'business' : b.customerMobile,
      body:
        b.status === 'pending'
          ? `درخواست جدید: ${b.customerName} · ${b.serviceName}`
          : customerMessage('booking.confirmed', b, spec.name, base.tenant.timezone),
      status: 'simulated',
      read: b.status !== 'pending',
      createdAt: b.statusChangedAt,
    }));
    base.audit = [
      { id: `${spec.id}-au0`, tenantId: spec.id, actorName: 'GlitchLab', actorRole: 'super_admin', action: 'tenant.create', summary: `ایجاد کسب‌وکار از قالب «${tpl.name}»`, at: base.tenant.createdAt },
    ];
    tenants.push({ ...base, users });
  }
  const superAdmins = await buildUsers(null, [{ role: 'super_admin', name: 'GlitchLab Studio', mobile: '09106117886', pin: DEMO_PINS.super_admin }]);
  return { tenants, superAdmins };
}
