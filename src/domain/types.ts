// Entity types. See docs/ARCHITECTURE.md §3 for the full model and reasoning.
import type { CivilDate, HHmm, Instant } from '@/lib/time';

export type BusinessType =
  | 'barbershop'
  | 'beauty_salon'
  | 'psychology'
  | 'dental'
  | 'clinic'
  | 'gym'
  | 'tutor';

export type PlanId = 'basic' | 'pro';

export type FeatureKey =
  | 'multiStaff'
  | 'gallery'
  | 'chatbot'
  | 'sms'
  | 'messengerBots'
  | 'customDomain'
  | 'smartConfirm'
  | 'advancedStats'
  | 'exportData';

export type Role = 'super_admin' | 'owner' | 'secretary';

export interface FileRef {
  id: string;
  width?: number;
  height?: number;
}

export type MapProviderId = 'neshan' | 'balad' | 'google';

export interface TenantProfile {
  tagline: string;
  description: string;
  address: string;
  city: string;
  location: { lat?: number; lng?: number; mapLinks: Partial<Record<MapProviderId, string>> };
  phones: string[];
  socials: { instagram?: string; telegram?: string; whatsapp?: string; bale?: string; eitaa?: string; website?: string };
  bookingRulesText: string;
}

export type ConfirmationMode = 'manual' | 'auto' | 'smart';

export interface SmartRules {
  allowFirstVisit: boolean;
  maxNoShows: number;
  minHoursAhead: number;
  oneActivePerDay: boolean;
}

export interface BookingSettings {
  slotIntervalMin: number;
  defaultBufferMin: number;
  minNoticeMin: number;
  maxAdvanceDays: number;
  maxBookingsPerDay: number | null;
  confirmationMode: ConfirmationMode;
  smartRules: SmartRules;
  holdPendingSlots: boolean;
  pendingExpiryHours: number;
  cancellationWindowHours: number;
  allowStaffChoice: boolean;
}

export interface Subscription {
  startDate: CivilDate;
  endDate: CivilDate;
  note?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  businessType: BusinessType;
  status: 'active' | 'suspended' | 'trial';
  planId: PlanId;
  featureOverrides: Partial<Record<FeatureKey, boolean>>;
  subscription: Subscription;
  contact: { name: string; mobile: string };
  internalNotes: string;
  timezone: string;
  profile: TenantProfile;
  bookingSettings: BookingSettings;
  isDemo: boolean;
  createdAt: Instant;
  updatedAt: Instant;
}

export type ThemeMode = 'light' | 'dark';

export interface BrandingTheme {
  tenantId: string;
  presetId: string;
  accent?: string; // overrides the preset accent
  mode?: ThemeMode; // overrides the preset mode
  logo?: FileRef;
  cover?: FileRef;
  gallery: FileRef[];
}

export interface Staff {
  id: string;
  tenantId: string;
  name: string;
  title: string;
  color: string;
  photo?: FileRef;
  active: boolean;
  sortOrder: number;
}

export type PriceType = 'fixed' | 'from' | 'free' | 'hidden';

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;
  durationMin: number;
  bufferAfterMin: number | null; // null = tenant default
  priceToman: number;
  priceType: PriceType;
  staffIds: string[];
  active: boolean;
  autoConfirmSafe: boolean; // used by "smart" confirmation
  sortOrder: number;
}

export interface TimeRange {
  start: HHmm;
  end: HHmm;
}

export interface WorkingHours {
  id: string;
  tenantId: string;
  staffId: string | null; // null = business default
  weekday: number; // 0 = Saturday … 6 = Friday
  ranges: TimeRange[]; // gaps between ranges are breaks; empty = closed
}

export type TimeOffKind = 'holiday' | 'closure' | 'leave' | 'block';

export interface TimeOff {
  id: string;
  tenantId: string;
  staffId: string | null;
  kind: TimeOffKind;
  start: Instant;
  end: Instant;
  allDay: boolean;
  reason?: string;
  source: 'manual' | 'official_holiday';
  officialHolidayKey?: string;
  disabled: boolean; // owner override: "we're open that day"
}

export interface DateOverride {
  id: string;
  tenantId: string;
  staffId: string | null;
  date: CivilDate;
  ranges: TimeRange[];
  note?: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  mobile: string;
  notes: string;
  tags: string[];
  blocked: boolean;
  createdAt: Instant;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'proposed'
  | 'rejected'
  | 'cancelled'
  | 'expired'
  | 'completed'
  | 'no_show';

export type BookingSource = 'online' | 'phone' | 'walk_in' | 'chatbot' | 'admin';

export interface Booking {
  id: string;
  tenantId: string;
  code: string;
  serviceId: string;
  staffId: string;
  customerId: string;
  start: Instant;
  end: Instant;
  durationMin: number;
  bufferAfterMin: number;
  serviceName: string;
  priceToman: number;
  customerName: string;
  customerMobile: string;
  status: BookingStatus;
  source: BookingSource;
  customerNote: string;
  internalNote: string;
  statusReason?: string;
  cancelledBy?: 'customer' | 'business' | 'system';
  proposal?: { start: Instant; end: Instant; staffId: string; message?: string; expiresAt: Instant };
  holdExpiresAt?: Instant;
  autoDecision?: { decision: 'approve' | 'review'; reasons: string[] };
  createdAt: Instant;
  updatedAt: Instant;
  statusChangedAt: Instant;
}

export interface User {
  id: string;
  tenantId: string | null;
  role: Role;
  name: string;
  mobile: string;
  pinHash: string;
  active: boolean;
}

export interface NotificationRecord {
  id: string;
  tenantId: string;
  bookingId?: string;
  event: string;
  channel: 'in_app' | 'sms' | 'telegram' | 'bale' | 'manual_share';
  recipient: string;
  body: string;
  status: 'simulated' | 'queued' | 'sent' | 'failed';
  read: boolean;
  createdAt: Instant;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorName: string;
  actorRole: Role | 'customer' | 'system';
  impersonatorName?: string;
  action: string;
  entityId?: string;
  summary: string;
  at: Instant;
}

export interface ChatbotConfig {
  tenantId: string;
  greeting: string;
  faq: { q: string; a: string }[];
}

/** Public-safe projection of a booking (tracking page). */
export interface PublicBooking {
  code: string;
  status: BookingStatus;
  start: Instant;
  end: Instant;
  serviceName: string;
  staffName: string;
  priceToman: number;
  customerName: string;
  maskedMobile: string;
  statusReason?: string;
  proposal?: Booking['proposal'];
  createdAt: Instant;
  canCancel: boolean;
}
