// The contract between the UI and any backend. See docs/ARCHITECTURE.md §6.3.
// The mock adapter (IndexedDB) implements it now; a PocketBase adapter will implement it later.
import type {
  AuditLog,
  Booking,
  BookingSource,
  BookingStatus,
  BrandingTheme,
  BusinessType,
  ChatbotConfig,
  Customer,
  DateOverride,
  FileRef,
  NotificationRecord,
  PlanId,
  PublicBooking,
  Role,
  Service,
  Staff,
  Tenant,
  TimeOff,
  User,
  WorkingHours,
} from '@/domain/types';
import type { SlotInputs } from '@/domain/slots';

export interface Actor {
  userId: string;
  name: string;
  role: Role;
  impersonatorName?: string;
}

export interface TenantContext {
  tenantId: string;
  actor: Actor;
}

export type PublicTenant = Omit<Tenant, 'internalNotes' | 'contact'>;

export interface TenantBundle {
  tenant: PublicTenant;
  branding: BrandingTheme;
  services: Service[];
  staff: Staff[];
}

export interface BookingRequestInput {
  serviceId: string;
  staffId: string | 'any';
  start: number;
  name: string;
  mobile: string;
  note: string;
  source?: BookingSource;
}

export interface ManualBookingInput {
  serviceId: string;
  staffId: string;
  start: number;
  customerId?: string;
  name: string;
  mobile: string;
  note: string;
  source: BookingSource;
}

export interface TransitionPayload {
  reason?: string;
  proposal?: { start: number; staffId: string; message?: string };
}

export interface NewTenantInput {
  name: string;
  slug: string;
  businessType: BusinessType;
  planId: PlanId;
  contact: { name: string; mobile: string };
  subscriptionDays: number;
  presetId: string;
  ownerName: string;
  ownerPin: string;
}

export interface HubOverview {
  tenants: number;
  active: number;
  suspended: number;
  expiring: number;
  expired: number;
  bookingsToday: number;
  bookingsWeek: number;
  pendingTotal: number;
}

export interface Backup {
  version: 1;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export interface DataAdapter {
  tenants: {
    getBundleBySlug(slug: string): Promise<TenantBundle | null>;
    list(): Promise<Tenant[]>;
    get(id: string): Promise<Tenant>;
    create(input: NewTenantInput): Promise<Tenant>;
    update(ctx: TenantContext, patch: Partial<Tenant>): Promise<Tenant>;
    isSlugAvailable(slug: string, exceptId?: string): Promise<boolean>;
    overview(): Promise<HubOverview>;
  };
  branding: {
    update(ctx: TenantContext, patch: Partial<BrandingTheme>): Promise<BrandingTheme>;
  };
  services: {
    save(ctx: TenantContext, s: Service): Promise<Service>;
    remove(ctx: TenantContext, id: string): Promise<void>;
  };
  staff: {
    save(ctx: TenantContext, s: Staff): Promise<Staff>;
    remove(ctx: TenantContext, id: string): Promise<void>;
  };
  availability: {
    /** Everything the slot engine needs for a tenant. */
    getSlotInputs(tenantId: string): Promise<SlotInputs & { holidays: TimeOff[] }>;
    saveWeek(ctx: TenantContext, staffId: string | null, rows: WorkingHours[]): Promise<void>;
    saveTimeOff(ctx: TenantContext, t: TimeOff): Promise<void>;
    removeTimeOff(ctx: TenantContext, id: string): Promise<void>;
    saveOverride(ctx: TenantContext, o: DateOverride): Promise<void>;
    removeOverride(ctx: TenantContext, id: string): Promise<void>;
  };
  customers: {
    list(ctx: TenantContext): Promise<Customer[]>;
    get(ctx: TenantContext, id: string): Promise<Customer>;
    save(ctx: TenantContext, c: Customer): Promise<Customer>;
  };
  bookings: {
    listRange(ctx: TenantContext, from: number, to: number): Promise<Booking[]>;
    listAll(ctx: TenantContext): Promise<Booking[]>;
    get(ctx: TenantContext, id: string): Promise<Booking>;
    getByCode(slug: string, code: string): Promise<PublicBooking | null>;
    createRequest(slug: string, input: BookingRequestInput): Promise<{ code: string; status: BookingStatus }>;
    createManual(ctx: TenantContext, input: ManualBookingInput): Promise<Booking>;
    transition(ctx: TenantContext, id: string, to: BookingStatus, payload?: TransitionPayload): Promise<Booking>;
    reschedule(ctx: TenantContext, id: string, start: number, staffId: string): Promise<Booking>;
    update(ctx: TenantContext, id: string, patch: Pick<Partial<Booking>, 'internalNote'>): Promise<Booking>;
    customerAction(slug: string, code: string, action: 'cancel' | 'acceptProposal' | 'declineProposal', mobileLast4: string): Promise<PublicBooking>;
  };
  notifications: {
    list(ctx: TenantContext): Promise<NotificationRecord[]>;
    markAllRead(ctx: TenantContext): Promise<void>;
  };
  audit: {
    list(tenantId: string | null): Promise<AuditLog[]>;
  };
  users: {
    listForTenant(tenantId: string | null): Promise<User[]>;
    save(ctx: TenantContext, u: User, pin?: string): Promise<User>;
  };
  chatbot: {
    get(tenantId: string): Promise<ChatbotConfig>;
    save(ctx: TenantContext, c: ChatbotConfig): Promise<void>;
  };
  files: {
    put(blob: Blob, meta?: { width?: number; height?: number }): Promise<FileRef>;
    get(id: string): Promise<Blob | null>;
  };
  admin: {
    ensureSeeded(): Promise<void>;
    resetDemo(): Promise<void>;
    exportAll(): Promise<Backup>;
    importAll(b: Backup): Promise<void>;
  };
}
