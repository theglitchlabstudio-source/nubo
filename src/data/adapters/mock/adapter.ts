// Mock adapter: the whole backend, running in the browser on IndexedDB.
// Every method enforces tenant isolation, so bugs show up in the demo, not in production.
import { db, TENANT_TABLES } from './db';
import type {
  Backup,
  BookingRequestInput,
  DataAdapter,
  ManualBookingInput,
  NewTenantInput,
  TenantContext,
  TransitionPayload,
} from '@/data/ports';
import { DataError } from '@/data/errors';
import type { AuditLog, Booking, BookingStatus, Customer, NotificationRecord, PublicBooking, Tenant } from '@/domain/types';
import { assignStaff, getSlots, isSlotFree, findOverlaps, type SlotInputs } from '@/domain/slots';
import { assertTransition, canCustomerCancel, effectiveStatus } from '@/domain/bookingMachine';
import { policyFor } from '@/domain/confirmation';
import { getFeatures, subscriptionStatus } from '@/domain/features';
import { generateBookingCode } from '@/domain/misc';
import { DAY, HOUR, MINUTE, civilDateOf, dayRange, todayIn } from '@/lib/time';
import { isValidMobile, normalizeFa, normalizeMobile } from '@/lib/text';
import { toEn } from '@/lib/digits';
import { uid } from '@/lib/cn';
import { hashPin } from '@/lib/crypto';
import { emitChange } from '@/services/events';
import { customerMessage, type NotifyEvent } from '@/services/notifications';
import { buildBaseTenant, buildDemoData, buildUsers, type TenantData } from '@/seed/demo';

const iso = (ms: number) => new Date(ms).toISOString();
const now = () => Date.now();

/** Tenant isolation: a context may only touch its own tenant's records (super admins act via impersonation). */
function assertOwn(ctx: TenantContext, tenantId: string | null | undefined) {
  if (ctx.tenantId !== tenantId) throw new DataError('FORBIDDEN');
}

async function tenantOrThrow(id: string): Promise<Tenant> {
  const t = await db.tenants.get(id);
  if (!t) throw new DataError('NOT_FOUND');
  return t;
}

async function tenantBySlug(slug: string): Promise<Tenant> {
  const t = await db.tenants.where('slug').equals(slug).first();
  if (!t) throw new DataError('NOT_FOUND');
  return t;
}

async function audit(tenantId: string | null, actor: { name: string; role: AuditLog['actorRole']; impersonatorName?: string }, action: string, summary: string, entityId?: string) {
  await db.audit.add({
    id: uid('au'),
    tenantId,
    actorName: actor.name,
    actorRole: actor.role,
    impersonatorName: actor.impersonatorName,
    action,
    entityId,
    summary,
    at: iso(now()),
  });
}

function trackUrl(slug: string, code: string) {
  return `${location.origin}${import.meta.env.BASE_URL}b/${slug}/booking/${code}`;
}

/** Writes simulated messages to the outbox (and an in-app note for the business on new requests). */
async function notify(tenant: Tenant, b: Booking, event: NotifyEvent) {
  const rows: NotificationRecord[] = [];
  const at = iso(now());
  if (event === 'booking.created') {
    rows.push({
      id: uid('nt'),
      tenantId: tenant.id,
      bookingId: b.id,
      event,
      channel: 'in_app',
      recipient: 'business',
      body: `${b.status === 'confirmed' ? 'نوبت جدید (تایید خودکار)' : 'درخواست جدید'}: ${b.customerName} · ${b.serviceName}`,
      status: 'simulated',
      read: false,
      createdAt: at,
    });
  }
  const customerEvent: NotifyEvent = event === 'booking.created' && b.status === 'confirmed' ? 'booking.confirmed' : event;
  rows.push({
    id: uid('nt'),
    tenantId: tenant.id,
    bookingId: b.id,
    event: customerEvent,
    channel: 'sms',
    recipient: b.customerMobile,
    body: customerMessage(customerEvent, b, tenant.name, tenant.timezone, trackUrl(tenant.slug, b.code)),
    status: 'simulated',
    read: true,
    createdAt: at,
  });
  await db.notifications.bulkAdd(rows);
}

async function slotInputs(tenantId: string): Promise<SlotInputs & { holidays: import('@/domain/types').TimeOff[] }> {
  const t = await tenantOrThrow(tenantId);
  const [staff, workingHours, dateOverrides, timeOff, bookings] = await Promise.all([
    db.staff.where('tenantId').equals(tenantId).toArray(),
    db.hours.where('tenantId').equals(tenantId).toArray(),
    db.overrides.where('tenantId').equals(tenantId).toArray(),
    db.timeOff.where('tenantId').equals(tenantId).toArray(),
    db.bookings.where('tenantId').equals(tenantId).toArray(),
  ]);
  return {
    tz: t.timezone,
    settings: t.bookingSettings,
    staff,
    workingHours,
    dateOverrides,
    timeOff,
    bookings,
    holidays: timeOff.filter((x) => x.source === 'official_holiday'),
  };
}

async function upsertCustomer(tenantId: string, name: string, mobile: string, customerId?: string): Promise<Customer> {
  if (customerId) {
    const c = await db.customers.get(customerId);
    if (c && c.tenantId === tenantId) return c;
  }
  const existing = await db.customers.where('[tenantId+mobile]').equals([tenantId, mobile]).first();
  if (existing) {
    if (name && existing.name !== name) {
      // Keep the business's spelling if they edited it; only fill when empty.
      if (!existing.name) await db.customers.update(existing.id, { name });
    }
    return existing;
  }
  const c: Customer = { id: uid('cu'), tenantId, name, mobile, notes: '', tags: [], blocked: false, createdAt: iso(now()) };
  await db.customers.add(c);
  return c;
}

async function toPublic(b: Booking, tenant: Tenant): Promise<PublicBooking> {
  const staff = await db.staff.get(b.staffId);
  const n = now();
  return {
    code: b.code,
    status: effectiveStatus(b, n),
    start: b.start,
    end: b.end,
    serviceName: b.serviceName,
    staffName: staff?.name ?? '',
    priceToman: b.priceToman,
    customerName: b.customerName,
    maskedMobile: `${b.customerMobile.slice(0, 4)}•••${b.customerMobile.slice(-4)}`,
    statusReason: b.statusReason,
    proposal: b.proposal,
    createdAt: b.createdAt,
    canCancel: canCustomerCancel(b, tenant.bookingSettings, n),
  };
}

/** Persist lazily-expired statuses the first time we notice them. */
async function settleExpiry(b: Booking): Promise<Booking> {
  const eff = effectiveStatus(b, now());
  if (eff !== b.status) {
    const next = { ...b, status: eff, statusChangedAt: iso(now()), cancelledBy: 'system' as const };
    await db.bookings.put(next);
    return next;
  }
  return b;
}

async function writeTenantData(d: TenantData) {
  await db.transaction('rw', [db.tenants, db.branding, db.services, db.staff, db.hours, db.timeOff, db.customers, db.bookings, db.users, db.notifications, db.audit, db.chatbot], async () => {
    await db.tenants.put(d.tenant);
    await db.branding.put(d.branding);
    await db.services.bulkPut(d.services);
    await db.staff.bulkPut(d.staff);
    await db.hours.bulkPut(d.hours);
    await db.timeOff.bulkPut(d.timeOff);
    await db.customers.bulkPut(d.customers);
    await db.bookings.bulkPut(d.bookings);
    await db.users.bulkPut(d.users);
    await db.notifications.bulkPut(d.notifications);
    await db.audit.bulkPut(d.audit);
    await db.chatbot.put(d.chatbot);
  });
}

async function deleteTenantRows(tenantId: string) {
  await db.transaction('rw', [db.tenants, db.branding, db.chatbot, ...TENANT_TABLES.map((t) => db[t])], async () => {
    await db.tenants.delete(tenantId);
    await db.branding.delete(tenantId);
    await db.chatbot.delete(tenantId);
    for (const t of TENANT_TABLES) await db[t].where('tenantId').equals(tenantId).delete();
  });
}

async function seedDemo() {
  const { tenants, superAdmins } = await buildDemoData(now());
  for (const t of tenants) await writeTenantData(t);
  await db.users.bulkPut(superAdmins);
  await db.meta.put({ key: 'seededAt', value: iso(now()) });
}

let seeding: Promise<void> | null = null;

export const mockAdapter: DataAdapter = {
  tenants: {
    async getBundleBySlug(slug) {
      const t = await db.tenants.where('slug').equals(slug).first();
      if (!t) return null;
      const [branding, services, staff] = await Promise.all([
        db.branding.get(t.id),
        db.services.where('tenantId').equals(t.id).toArray(),
        db.staff.where('tenantId').equals(t.id).toArray(),
      ]);
      const { internalNotes: _n, contact: _c, ...pub } = t;
      return {
        tenant: pub,
        branding: branding ?? { tenantId: t.id, presetId: 'signal', gallery: [] },
        services: services.sort((a, b) => a.sortOrder - b.sortOrder),
        staff: staff.sort((a, b) => a.sortOrder - b.sortOrder),
      };
    },
    async list() {
      return (await db.tenants.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    get: tenantOrThrow,
    async create(input: NewTenantInput) {
      if (!(await mockAdapter.tenants.isSlugAvailable(input.slug))) throw new DataError('CONFLICT', 'این آدرس قبلاً استفاده شده است');
      const id = uid('t');
      const base = buildBaseTenant({
        id,
        slug: input.slug,
        name: input.name,
        type: input.businessType,
        planId: input.planId,
        presetId: input.presetId,
        staff: [{ name: input.ownerName }],
        contact: input.contact,
        subscriptionDays: input.subscriptionDays,
        isDemo: false,
        now: now(),
      });
      base.tenant.createdAt = iso(now());
      base.tenant.updatedAt = base.tenant.createdAt;
      const users = await buildUsers(id, [{ role: 'owner', name: input.ownerName, mobile: input.contact.mobile, pin: input.ownerPin }]);
      base.audit = [{ id: uid('au'), tenantId: id, actorName: 'GlitchLab Studio', actorRole: 'super_admin', action: 'tenant.create', summary: 'ایجاد کسب‌وکار', at: iso(now()) }];
      await writeTenantData({ ...base, users });
      emitChange({ tenantId: null, collection: 'tenants' });
      return base.tenant;
    },
    async update(ctx, patch) {
      assertOwn(ctx, ctx.tenantId);
      const t = await tenantOrThrow(ctx.tenantId);
      if (patch.slug && patch.slug !== t.slug && !(await mockAdapter.tenants.isSlugAvailable(patch.slug, t.id))) {
        throw new DataError('CONFLICT', 'این آدرس قبلاً استفاده شده است');
      }
      const next = { ...t, ...patch, id: t.id, updatedAt: iso(now()) };
      await db.tenants.put(next);
      const keys = Object.keys(patch);
      const summary = keys.includes('status')
        ? patch.status === 'suspended' ? 'تعلیق کسب‌وکار' : 'فعال‌سازی کسب‌وکار'
        : keys.includes('bookingSettings') ? 'تغییر قوانین نوبت‌دهی' : 'ویرایش اطلاعات کسب‌وکار';
      await audit(t.id, ctx.actor, 'tenant.update', summary);
      emitChange({ tenantId: t.id, collection: 'tenant' });
      emitChange({ tenantId: null, collection: 'tenants' });
      return next;
    },
    async isSlugAvailable(slug, exceptId) {
      const t = await db.tenants.where('slug').equals(slug).first();
      return !t || t.id === exceptId;
    },
    async overview() {
      const tenants = await db.tenants.toArray();
      const today = todayIn('Asia/Tehran');
      const { from, to } = dayRange(today, 'Asia/Tehran');
      const weekTo = from + 7 * DAY;
      const n = now();
      let bookingsToday = 0;
      let bookingsWeek = 0;
      let pendingTotal = 0;
      await db.bookings.each((b) => {
        const s = Date.parse(b.start);
        const st = effectiveStatus(b, n);
        if (st === 'pending') pendingTotal += 1;
        if (st === 'cancelled' || st === 'rejected' || st === 'expired') return;
        if (s >= from && s < to) bookingsToday += 1;
        if (s >= from && s < weekTo) bookingsWeek += 1;
      });
      const subs = tenants.map((t) => subscriptionStatus(t, today));
      return {
        tenants: tenants.length,
        active: tenants.filter((t) => t.status !== 'suspended').length,
        suspended: tenants.filter((t) => t.status === 'suspended').length,
        expiring: subs.filter((s) => s === 'expiring').length,
        expired: subs.filter((s) => s === 'expired').length,
        bookingsToday,
        bookingsWeek,
        pendingTotal,
      };
    },
  },

  branding: {
    async update(ctx, patch) {
      assertOwn(ctx, ctx.tenantId);
      const cur = (await db.branding.get(ctx.tenantId)) ?? { tenantId: ctx.tenantId, presetId: 'signal', gallery: [] };
      const next = { ...cur, ...patch, tenantId: ctx.tenantId };
      await db.branding.put(next);
      await audit(ctx.tenantId, ctx.actor, 'branding.update', 'تغییر ظاهر و برند');
      emitChange({ tenantId: ctx.tenantId, collection: 'branding' });
      return next;
    },
  },

  services: {
    async save(ctx, s) {
      assertOwn(ctx, s.tenantId);
      await db.services.put(s);
      emitChange({ tenantId: ctx.tenantId, collection: 'services' });
      return s;
    },
    async remove(ctx, id) {
      const s = await db.services.get(id);
      assertOwn(ctx, s?.tenantId);
      await db.services.delete(id);
      emitChange({ tenantId: ctx.tenantId, collection: 'services' });
    },
  },

  staff: {
    async save(ctx, s) {
      assertOwn(ctx, s.tenantId);
      await db.staff.put(s);
      emitChange({ tenantId: ctx.tenantId, collection: 'staff' });
      return s;
    },
    async remove(ctx, id) {
      const s = await db.staff.get(id);
      assertOwn(ctx, s?.tenantId);
      await db.staff.delete(id);
      // Remove from services too.
      const services = await db.services.where('tenantId').equals(ctx.tenantId).toArray();
      await db.services.bulkPut(services.map((sv) => ({ ...sv, staffIds: sv.staffIds.filter((x) => x !== id) })));
      emitChange({ tenantId: ctx.tenantId, collection: 'staff' });
    },
  },

  availability: {
    getSlotInputs: slotInputs,
    async saveWeek(ctx, staffId, rows) {
      assertOwn(ctx, ctx.tenantId);
      await db.transaction('rw', db.hours, async () => {
        const old = await db.hours.where('tenantId').equals(ctx.tenantId).filter((h) => h.staffId === staffId).toArray();
        await db.hours.bulkDelete(old.map((h) => h.id));
        await db.hours.bulkPut(rows.map((r) => ({ ...r, tenantId: ctx.tenantId, staffId })));
      });
      await audit(ctx.tenantId, ctx.actor, 'hours.update', 'تغییر ساعت کاری');
      emitChange({ tenantId: ctx.tenantId, collection: 'availability' });
    },
    async saveTimeOff(ctx, t) {
      assertOwn(ctx, t.tenantId);
      await db.timeOff.put(t);
      emitChange({ tenantId: ctx.tenantId, collection: 'availability' });
    },
    async removeTimeOff(ctx, id) {
      const t = await db.timeOff.get(id);
      assertOwn(ctx, t?.tenantId);
      await db.timeOff.delete(id);
      emitChange({ tenantId: ctx.tenantId, collection: 'availability' });
    },
    async saveOverride(ctx, o) {
      assertOwn(ctx, o.tenantId);
      await db.overrides.put(o);
      emitChange({ tenantId: ctx.tenantId, collection: 'availability' });
    },
    async removeOverride(ctx, id) {
      const o = await db.overrides.get(id);
      assertOwn(ctx, o?.tenantId);
      await db.overrides.delete(id);
      emitChange({ tenantId: ctx.tenantId, collection: 'availability' });
    },
  },

  customers: {
    async list(ctx) {
      return db.customers.where('tenantId').equals(ctx.tenantId).toArray();
    },
    async get(ctx, id) {
      const c = await db.customers.get(id);
      if (!c) throw new DataError('NOT_FOUND');
      assertOwn(ctx, c.tenantId);
      return c;
    },
    async save(ctx, c) {
      assertOwn(ctx, c.tenantId);
      const mobile = normalizeMobile(c.mobile);
      const dup = await db.customers.where('[tenantId+mobile]').equals([ctx.tenantId, mobile]).first();
      if (dup && dup.id !== c.id) throw new DataError('CONFLICT', 'مشتری دیگری با این شماره وجود دارد');
      const next = { ...c, name: normalizeFa(c.name), mobile };
      await db.customers.put(next);
      emitChange({ tenantId: ctx.tenantId, collection: 'customers' });
      return next;
    },
  },

  bookings: {
    async listRange(ctx, from, to) {
      const all = await db.bookings.where('start').between(iso(from), iso(to), true, false).toArray();
      return all.filter((b) => b.tenantId === ctx.tenantId);
    },
    async listAll(ctx) {
      return db.bookings.where('tenantId').equals(ctx.tenantId).toArray();
    },
    async get(ctx, id) {
      const b = await db.bookings.get(id);
      if (!b) throw new DataError('NOT_FOUND');
      assertOwn(ctx, b.tenantId);
      return settleExpiry(b);
    },
    async getByCode(slug, code) {
      const t = await db.tenants.where('slug').equals(slug).first();
      if (!t) return null;
      const b = await db.bookings.where('[tenantId+code]').equals([t.id, code.toUpperCase()]).first();
      if (!b) return null;
      return toPublic(await settleExpiry(b), t);
    },

    async createRequest(slug, input: BookingRequestInput) {
      const tenant = await tenantBySlug(slug);
      if (tenant.status === 'suspended') throw new DataError('SUSPENDED');
      const name = normalizeFa(input.name);
      const mobile = normalizeMobile(input.mobile);
      if (name.length < 2 || !isValidMobile(mobile)) throw new DataError('VALIDATION');
      const service = await db.services.get(input.serviceId);
      if (!service || service.tenantId !== tenant.id || !service.active) throw new DataError('NOT_FOUND');
      const features = getFeatures(tenant);

      let created!: Booking;
      // The availability re-check and the write happen in ONE transaction,
      // so two customers can't take the same slot (ARCHITECTURE §4.2, race condition).
      await db.transaction('rw', [db.tenants, db.staff, db.hours, db.overrides, db.timeOff, db.bookings, db.customers, db.notifications, db.audit], async () => {
        const inputs = await slotInputs(tenant.id);
        const n = now();
        const date = civilDateOf(input.start, tenant.timezone);
        let staffId = input.staffId;
        if (staffId === 'any') {
          const slot = getSlots(inputs, { date, service, staffId: 'any', now: n }).find((s) => s.start === input.start);
          if (!slot) throw new DataError('SLOT_TAKEN');
          staffId = assignStaff(inputs, slot, date, n);
        } else if (!isSlotFree(inputs, { date, service, staffId, start: input.start, now: n })) {
          throw new DataError('SLOT_TAKEN');
        }
        const customer = await upsertCustomer(tenant.id, name, mobile);
        const history = inputs.bookings.filter((b) => b.customerId === customer.id);
        const decision = policyFor(tenant, features.smartConfirm).decide({ tenant, service, start: input.start, customer, history, now: n });
        const status: BookingStatus = decision.decision === 'approve' ? 'confirmed' : 'pending';
        const buffer = service.bufferAfterMin ?? tenant.bookingSettings.defaultBufferMin;
        let code = generateBookingCode();
        while (await db.bookings.where('[tenantId+code]').equals([tenant.id, code]).first()) code = generateBookingCode();
        created = {
          id: uid('bk'),
          tenantId: tenant.id,
          code,
          serviceId: service.id,
          staffId,
          customerId: customer.id,
          start: iso(input.start),
          end: iso(input.start + service.durationMin * MINUTE),
          durationMin: service.durationMin,
          bufferAfterMin: buffer,
          serviceName: service.name,
          priceToman: service.priceToman,
          customerName: name,
          customerMobile: mobile,
          status,
          source: input.source ?? 'online',
          customerNote: input.note.trim(),
          internalNote: '',
          holdExpiresAt: status === 'pending' ? iso(n + tenant.bookingSettings.pendingExpiryHours * HOUR) : undefined,
          autoDecision: tenant.bookingSettings.confirmationMode === 'smart' ? decision : undefined,
          createdAt: iso(n),
          updatedAt: iso(n),
          statusChangedAt: iso(n),
        };
        await db.bookings.add(created);
        await notify(tenant, created, 'booking.created');
        await audit(tenant.id, { name, role: 'customer' }, 'booking.request', `درخواست نوبت «${service.name}»${status === 'confirmed' ? ' (تایید خودکار)' : ''}`, created.id);
      });
      emitChange({ tenantId: tenant.id, collection: 'bookings', newBookingId: created.id });
      return { code: created.code, status: created.status };
    },

    async createManual(ctx, input: ManualBookingInput) {
      assertOwn(ctx, ctx.tenantId);
      const tenant = await tenantOrThrow(ctx.tenantId);
      const service = await db.services.get(input.serviceId);
      if (!service || service.tenantId !== tenant.id) throw new DataError('NOT_FOUND');
      const mobile = normalizeMobile(input.mobile);
      if (!isValidMobile(mobile) || normalizeFa(input.name).length < 2) throw new DataError('VALIDATION');
      const customer = await upsertCustomer(tenant.id, normalizeFa(input.name), mobile, input.customerId);
      const n = now();
      const b: Booking = {
        id: uid('bk'),
        tenantId: tenant.id,
        code: generateBookingCode(),
        serviceId: service.id,
        staffId: input.staffId,
        customerId: customer.id,
        start: iso(input.start),
        end: iso(input.start + service.durationMin * MINUTE),
        durationMin: service.durationMin,
        bufferAfterMin: service.bufferAfterMin ?? tenant.bookingSettings.defaultBufferMin,
        serviceName: service.name,
        priceToman: service.priceToman,
        customerName: customer.name,
        customerMobile: customer.mobile,
        status: 'confirmed',
        source: input.source,
        customerNote: '',
        internalNote: input.note,
        createdAt: iso(n),
        updatedAt: iso(n),
        statusChangedAt: iso(n),
      };
      await db.bookings.add(b);
      await notify(tenant, b, 'booking.confirmed');
      await audit(tenant.id, ctx.actor, 'booking.create', `ثبت نوبت دستی برای ${customer.name}`, b.id);
      emitChange({ tenantId: tenant.id, collection: 'bookings' });
      return b;
    },

    async transition(ctx, id, to, payload: TransitionPayload = {}) {
      const tenant = await tenantOrThrow(ctx.tenantId);
      let b = await mockAdapter.bookings.get(ctx, id);
      assertTransition(b.status, to, 'business');
      const n = now();
      const patch: Partial<Booking> = { status: to, statusChangedAt: iso(n), updatedAt: iso(n) };
      if (to === 'rejected' || to === 'cancelled') patch.statusReason = payload.reason?.trim() || undefined;
      if (to === 'cancelled') patch.cancelledBy = 'business';
      if (to === 'proposed') {
        if (!payload.proposal) throw new DataError('VALIDATION');
        const p = payload.proposal;
        const inputs = await slotInputs(tenant.id);
        const end = p.start + b.durationMin * MINUTE;
        if (findOverlaps(inputs, p.staffId, p.start, end + b.bufferAfterMin * MINUTE, n, b.id).length) throw new DataError('SLOT_TAKEN');
        patch.proposal = {
          start: iso(p.start),
          end: iso(end),
          staffId: p.staffId,
          message: p.message,
          expiresAt: iso(Math.min(p.start, n + tenant.bookingSettings.pendingExpiryHours * HOUR)),
        };
      }
      if (to === 'confirmed' && b.status === 'proposed' && b.proposal) {
        Object.assign(patch, { start: b.proposal.start, end: b.proposal.end, staffId: b.proposal.staffId, proposal: undefined });
      }
      b = { ...b, ...patch };
      await db.bookings.put(b);
      const event: Partial<Record<BookingStatus, NotifyEvent>> = {
        confirmed: 'booking.confirmed',
        rejected: 'booking.rejected',
        proposed: 'booking.proposed',
        cancelled: 'booking.cancelled',
      };
      if (event[to]) await notify(tenant, b, event[to]!);
      const LABEL: Partial<Record<BookingStatus, string>> = {
        confirmed: 'تایید نوبت',
        rejected: 'رد درخواست',
        proposed: 'پیشنهاد زمان دیگر',
        cancelled: 'لغو نوبت',
        completed: 'ثبت انجام نوبت',
        no_show: 'ثبت غیبت',
      };
      await audit(tenant.id, ctx.actor, `booking.${to}`, `${LABEL[to] ?? to} · ${b.customerName}`, b.id);
      emitChange({ tenantId: tenant.id, collection: 'bookings' });
      return b;
    },

    async reschedule(ctx, id, start, staffId) {
      const tenant = await tenantOrThrow(ctx.tenantId);
      const b = await mockAdapter.bookings.get(ctx, id);
      if (!['pending', 'confirmed'].includes(b.status)) throw new DataError('VALIDATION');
      const inputs = await slotInputs(tenant.id);
      const end = start + b.durationMin * MINUTE;
      if (findOverlaps(inputs, staffId, start, end + b.bufferAfterMin * MINUTE, now(), b.id).length) throw new DataError('SLOT_TAKEN');
      const next: Booking = { ...b, start: iso(start), end: iso(end), staffId, updatedAt: iso(now()) };
      await db.bookings.put(next);
      await notify(tenant, next, 'booking.rescheduled');
      await audit(tenant.id, ctx.actor, 'booking.reschedule', `جابه‌جایی نوبت ${b.customerName}`, b.id);
      emitChange({ tenantId: tenant.id, collection: 'bookings' });
      return next;
    },

    async update(ctx, id, patch) {
      const b = await mockAdapter.bookings.get(ctx, id);
      const next = { ...b, ...patch, updatedAt: iso(now()) };
      await db.bookings.put(next);
      emitChange({ tenantId: ctx.tenantId, collection: 'bookings' });
      return next;
    },

    async customerAction(slug, code, action, mobileLast4) {
      const tenant = await tenantBySlug(slug);
      const found = await db.bookings.where('[tenantId+code]').equals([tenant.id, code.toUpperCase()]).first();
      if (!found) throw new DataError('NOT_FOUND');
      let b = await settleExpiry(found);
      if (toEn(mobileLast4).trim() !== b.customerMobile.slice(-4)) throw new DataError('FORBIDDEN', '۴ رقم آخر موبایل درست نیست');
      const n = now();
      if (action === 'cancel') {
        if (!canCustomerCancel(b, tenant.bookingSettings, n)) throw new DataError('FORBIDDEN', 'مهلت لغو آنلاین تمام شده است. لطفاً تماس بگیرید.');
        b = { ...b, status: 'cancelled', cancelledBy: 'customer', statusChangedAt: iso(n), updatedAt: iso(n) };
      } else if (action === 'acceptProposal') {
        if (b.status !== 'proposed' || !b.proposal) throw new DataError('VALIDATION');
        b = { ...b, status: 'confirmed', start: b.proposal.start, end: b.proposal.end, staffId: b.proposal.staffId, proposal: undefined, statusChangedAt: iso(n), updatedAt: iso(n) };
      } else {
        if (b.status !== 'proposed') throw new DataError('VALIDATION');
        b = { ...b, status: 'cancelled', cancelledBy: 'customer', statusReason: 'زمان پیشنهادی رد شد', statusChangedAt: iso(n), updatedAt: iso(n) };
      }
      await db.bookings.put(b);
      await db.notifications.add({
        id: uid('nt'),
        tenantId: tenant.id,
        bookingId: b.id,
        event: `customer.${action}`,
        channel: 'in_app',
        recipient: 'business',
        body: `${b.customerName}: ${action === 'cancel' ? 'نوبت را لغو کرد' : action === 'acceptProposal' ? 'زمان پیشنهادی را پذیرفت' : 'زمان پیشنهادی را رد کرد'}`,
        status: 'simulated',
        read: false,
        createdAt: iso(n),
      });
      await audit(tenant.id, { name: b.customerName, role: 'customer' }, `booking.customer.${action}`, action === 'cancel' ? 'لغو توسط مشتری' : action === 'acceptProposal' ? 'پذیرش زمان پیشنهادی' : 'رد زمان پیشنهادی', b.id);
      emitChange({ tenantId: tenant.id, collection: 'bookings' });
      return toPublic(b, tenant);
    },
  },

  notifications: {
    async list(ctx) {
      const rows = await db.notifications.where('tenantId').equals(ctx.tenantId).toArray();
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async markAllRead(ctx) {
      await db.notifications.where('tenantId').equals(ctx.tenantId).modify({ read: true });
      emitChange({ tenantId: ctx.tenantId, collection: 'notifications' });
    },
  },

  audit: {
    async list(tenantId) {
      const rows = tenantId ? await db.audit.where('tenantId').equals(tenantId).toArray() : await db.audit.toArray();
      return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);
    },
  },

  users: {
    async listForTenant(tenantId) {
      if (tenantId === null) return db.users.filter((u) => u.tenantId === null).toArray();
      return db.users.where('tenantId').equals(tenantId).toArray();
    },
    async save(ctx, u, pin) {
      assertOwn(ctx, u.tenantId ?? undefined);
      const next = { ...u, pinHash: pin ? await hashPin(u.id, pin) : u.pinHash };
      await db.users.put(next);
      emitChange({ tenantId: ctx.tenantId, collection: 'users' });
      return next;
    },
  },

  chatbot: {
    async get(tenantId) {
      return (await db.chatbot.get(tenantId)) ?? { tenantId, greeting: 'سلام! چطور می‌توانم کمک کنم؟', faq: [] };
    },
    async save(ctx, c) {
      assertOwn(ctx, c.tenantId);
      await db.chatbot.put(c);
      emitChange({ tenantId: ctx.tenantId, collection: 'chatbot' });
    },
  },

  files: {
    async put(blob, meta) {
      const id = uid('f');
      await db.files.put({ id, blob, ...meta });
      return { id, ...meta };
    },
    async get(id) {
      return (await db.files.get(id))?.blob ?? null;
    },
  },

  admin: {
    async ensureSeeded() {
      if (seeding) return seeding;
      seeding = (async () => {
        const seeded = await db.meta.get('seededAt');
        if (!seeded) await seedDemo();
      })();
      return seeding;
    },
    async resetDemo() {
      const demoIds = (await db.tenants.toArray()).filter((t) => t.isDemo).map((t) => t.id);
      for (const id of demoIds) await deleteTenantRows(id);
      await seedDemo();
      emitChange({ tenantId: null, collection: '*' });
    },
    async exportAll(): Promise<Backup> {
      const tables: Record<string, unknown[]> = {};
      for (const t of db.tables) {
        if (t.name === 'files') continue; // images are not included in the JSON backup
        tables[t.name] = await t.toArray();
      }
      return { version: 1, exportedAt: iso(now()), tables };
    },
    async importAll(b) {
      if (b.version !== 1 || !b.tables) throw new DataError('VALIDATION', 'فایل پشتیبان معتبر نیست');
      await db.transaction('rw', db.tables.filter((t) => t.name !== 'files'), async () => {
        for (const t of db.tables) {
          if (t.name === 'files' || !b.tables[t.name]) continue;
          await t.clear();
          await t.bulkPut(b.tables[t.name] as never[]);
        }
      });
      emitChange({ tenantId: null, collection: '*' });
    },
  },
};
