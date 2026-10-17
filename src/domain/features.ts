import type { BusinessType, FeatureKey, PlanId, Role, Tenant } from './types';
import { diffDays } from '@/lib/time';

export interface Plan {
  id: PlanId;
  name: string;
  features: FeatureKey[];
  limits: { maxStaff: number; maxServices: number; maxGalleryImages: number };
}

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: 'basic',
    name: 'پایه',
    features: ['exportData'],
    limits: { maxStaff: 1, maxServices: 20, maxGalleryImages: 0 },
  },
  pro: {
    id: 'pro',
    name: 'حرفه‌ای',
    features: ['multiStaff', 'gallery', 'sms', 'messengerBots', 'smartConfirm', 'advancedStats', 'exportData'],
    limits: { maxStaff: 20, maxServices: 100, maxGalleryImages: 12 },
  },
};

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  multiStaff: 'چند کارمند',
  gallery: 'گالری تصاویر',
  chatbot: 'دستیار هوشمند',
  sms: 'پیامک',
  messengerBots: 'ربات بله و تلگرام',
  customDomain: 'دامنه اختصاصی',
  smartConfirm: 'تایید هوشمند',
  advancedStats: 'آمار پیشرفته',
  exportData: 'خروجی اکسل',
};

export function getFeatures(t: Pick<Tenant, 'planId' | 'featureOverrides'>): Record<FeatureKey, boolean> {
  const base = PLANS[t.planId].features;
  const out = {} as Record<FeatureKey, boolean>;
  for (const key of Object.keys(FEATURE_LABEL) as FeatureKey[]) {
    out[key] = t.featureOverrides[key] ?? base.includes(key);
  }
  return out;
}

export type SubscriptionStatus = 'active' | 'expiring' | 'expired';

export function subscriptionStatus(t: Pick<Tenant, 'subscription'>, today: string): SubscriptionStatus {
  const left = diffDays(t.subscription.endDate, today);
  if (left < 0) return 'expired';
  if (left <= 14) return 'expiring';
  return 'active';
}

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  barbershop: 'آرایشگاه مردانه',
  beauty_salon: 'سالن زیبایی',
  psychology: 'مشاوره و روانشناسی',
  dental: 'دندانپزشکی',
  clinic: 'مطب و کلینیک',
  gym: 'باشگاه ورزشی',
  tutor: 'معلم خصوصی',
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'مدیر کل',
  owner: 'مدیر کسب‌وکار',
  secretary: 'منشی',
};

// ---------- Permissions (docs/ARCHITECTURE.md §1.4) ----------

export type Action =
  | 'bookings.manage'
  | 'availability.manage'
  | 'rules.edit'
  | 'services.edit'
  | 'staff.edit'
  | 'customers.manage'
  | 'branding.edit'
  | 'share.use'
  | 'stats.view'
  | 'chatbot.edit'
  | 'hub.access';

const MATRIX: Record<Action, Role[]> = {
  'bookings.manage': ['super_admin', 'owner', 'secretary'],
  'availability.manage': ['super_admin', 'owner', 'secretary'],
  'rules.edit': ['super_admin', 'owner'],
  'services.edit': ['super_admin', 'owner'],
  'staff.edit': ['super_admin', 'owner'],
  'customers.manage': ['super_admin', 'owner', 'secretary'],
  'branding.edit': ['super_admin', 'owner'],
  'share.use': ['super_admin', 'owner', 'secretary'],
  'stats.view': ['super_admin', 'owner', 'secretary'],
  'chatbot.edit': ['super_admin', 'owner'],
  'hub.access': ['super_admin'],
};

export function can(role: Role | undefined, action: Action): boolean {
  return !!role && MATRIX[action].includes(role);
}
