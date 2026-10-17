// Confirmation policies. See docs/ARCHITECTURE.md §4.4.
// One place decides whether a new online request is confirmed straight away or goes to the inbox.
import type { Booking, Customer, Service, Tenant } from './types';
import { effectiveStatus } from './bookingMachine';
import { HOUR, civilDateOf } from '@/lib/time';

export interface ConfirmationInput {
  tenant: Tenant;
  service: Service;
  start: number;
  customer: Customer | null;
  history: Booking[]; // all bookings of this customer at this tenant
  now: number;
}

export interface ConfirmationDecision {
  decision: 'approve' | 'review';
  reasons: string[];
}

export interface ConfirmationPolicy {
  decide(input: ConfirmationInput): ConfirmationDecision;
}

export const manualPolicy: ConfirmationPolicy = {
  decide: () => ({ decision: 'review', reasons: ['تایید دستی فعال است'] }),
};

export const autoPolicy: ConfirmationPolicy = {
  decide: () => ({ decision: 'approve', reasons: ['تایید خودکار فعال است'] }),
};

/**
 * Smart mode, MVP version: deterministic rules. Approve only when every enabled rule passes;
 * otherwise send to the inbox *with the reasons*, so the secretary sees why.
 * Later an AI policy can replace this behind the same interface — it may approve or escalate, never reject.
 */
export const rulesPolicy: ConfirmationPolicy = {
  decide({ tenant, service, start, customer, history, now }) {
    const rules = tenant.bookingSettings.smartRules;
    const fails: string[] = [];
    const completed = history.filter((b) => effectiveStatus(b, now) === 'completed').length;
    const noShows = history.filter((b) => effectiveStatus(b, now) === 'no_show').length;

    if (customer?.blocked) fails.push('مشتری مسدود شده است');
    if (!rules.allowFirstVisit && completed === 0) fails.push('اولین مراجعه این مشتری است');
    if (noShows > rules.maxNoShows) fails.push(`سابقه ${noShows} غیبت`);
    if (start - now < rules.minHoursAhead * HOUR) fails.push('زمان نوبت خیلی نزدیک است');
    if (!service.autoConfirmSafe) fails.push('این خدمت نیاز به بررسی دارد');
    if (rules.oneActivePerDay) {
      const day = civilDateOf(start, tenant.timezone);
      const sameDay = history.some((b) => {
        const s = effectiveStatus(b, now);
        return (s === 'pending' || s === 'confirmed') && civilDateOf(Date.parse(b.start), tenant.timezone) === day;
      });
      if (sameDay) fails.push('نوبت دیگری در همین روز دارد');
    }

    if (fails.length) return { decision: 'review', reasons: fails };
    return {
      decision: 'approve',
      reasons: [completed > 0 ? `مشتری آشنا · ${completed} مراجعه موفق` : 'همه قوانین برقرار است'],
    };
  },
};

export function policyFor(tenant: Tenant, smartEnabled: boolean): ConfirmationPolicy {
  const mode = tenant.bookingSettings.confirmationMode;
  if (mode === 'auto') return autoPolicy;
  if (mode === 'smart' && smartEnabled) return rulesPolicy;
  return manualPolicy;
}
