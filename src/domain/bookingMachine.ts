// Booking status state machine. See docs/ARCHITECTURE.md §4.1.
import type { Booking, BookingStatus, BookingSettings } from './types';

type Actor = 'customer' | 'business' | 'system';

interface Transition {
  from: BookingStatus;
  to: BookingStatus;
  actors: Actor[];
}

const TRANSITIONS: Transition[] = [
  { from: 'pending', to: 'confirmed', actors: ['business', 'system'] },
  { from: 'pending', to: 'rejected', actors: ['business'] },
  { from: 'pending', to: 'proposed', actors: ['business'] },
  { from: 'pending', to: 'cancelled', actors: ['customer', 'business'] },
  { from: 'pending', to: 'expired', actors: ['system'] },
  { from: 'proposed', to: 'confirmed', actors: ['customer', 'business'] },
  { from: 'proposed', to: 'cancelled', actors: ['customer', 'business'] },
  { from: 'proposed', to: 'expired', actors: ['system'] },
  { from: 'confirmed', to: 'cancelled', actors: ['customer', 'business'] },
  { from: 'confirmed', to: 'completed', actors: ['business'] },
  { from: 'confirmed', to: 'no_show', actors: ['business'] },
  { from: 'completed', to: 'no_show', actors: ['business'] },
  { from: 'no_show', to: 'completed', actors: ['business'] },
];

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.actors.includes(actor));
}

export function nextStatuses(from: BookingStatus, actor: Actor): BookingStatus[] {
  return TRANSITIONS.filter((t) => t.from === from && t.actors.includes(actor)).map((t) => t.to);
}

export class TransitionError extends Error {}

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: Actor) {
  if (!canTransition(from, to, actor)) throw new TransitionError(`${from} → ${to} not allowed for ${actor}`);
}

/**
 * Lazy expiry: the MVP has no background jobs, so a pending request past its hold
 * (or a proposal past its deadline) is treated as expired the moment anyone looks at it.
 */
export function effectiveStatus(b: Booking, now: number): BookingStatus {
  if (b.status === 'pending' && b.holdExpiresAt && Date.parse(b.holdExpiresAt) < now) return 'expired';
  if (b.status === 'proposed' && b.proposal && Date.parse(b.proposal.expiresAt) < now) return 'expired';
  return b.status;
}

/** The time interval a booking occupies in the slot engine, or null if it doesn't block. */
export function blockingInterval(
  b: Booking,
  settings: Pick<BookingSettings, 'holdPendingSlots'>,
  now: number,
): { start: number; end: number; staffId: string } | null {
  const status = effectiveStatus(b, now);
  if (status === 'confirmed') {
    return { start: Date.parse(b.start), end: Date.parse(b.end) + b.bufferAfterMin * 60_000, staffId: b.staffId };
  }
  if (status === 'pending' && settings.holdPendingSlots) {
    return { start: Date.parse(b.start), end: Date.parse(b.end) + b.bufferAfterMin * 60_000, staffId: b.staffId };
  }
  if (status === 'proposed' && b.proposal) {
    // A proposal holds the *proposed* time, not the original one.
    return {
      start: Date.parse(b.proposal.start),
      end: Date.parse(b.proposal.end) + b.bufferAfterMin * 60_000,
      staffId: b.proposal.staffId,
    };
  }
  return null;
}

export function isActive(status: BookingStatus) {
  return status === 'pending' || status === 'confirmed' || status === 'proposed';
}

export function canCustomerCancel(b: Booking, settings: BookingSettings, now: number): boolean {
  const status = effectiveStatus(b, now);
  if (status === 'pending' || status === 'proposed') return true;
  if (status !== 'confirmed') return false;
  return now <= Date.parse(b.start) - settings.cancellationWindowHours * 3_600_000;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'در انتظار تایید',
  confirmed: 'تایید شده',
  proposed: 'زمان پیشنهادی',
  rejected: 'رد شده',
  cancelled: 'لغو شده',
  expired: 'منقضی شده',
  completed: 'انجام شده',
  no_show: 'غیبت',
};

export const STATUS_COLOR: Record<BookingStatus, string> = {
  pending: '#E0A100',
  confirmed: '#2F9E6A',
  proposed: '#3A7BD5',
  rejected: '#9A968F',
  cancelled: '#9A968F',
  expired: '#9A968F',
  completed: 'var(--ink)',
  no_show: '#D64545',
};
