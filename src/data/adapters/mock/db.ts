import Dexie, { type Table } from 'dexie';
import type {
  AuditLog,
  Booking,
  BrandingTheme,
  ChatbotConfig,
  Customer,
  DateOverride,
  NotificationRecord,
  Service,
  Staff,
  Tenant,
  TimeOff,
  User,
  WorkingHours,
} from '@/domain/types';

export interface StoredFile {
  id: string;
  blob: Blob;
  width?: number;
  height?: number;
}

/** IndexedDB schema for the mock adapter. Every tenant-owned table is indexed by tenantId. */
export class NuboDB extends Dexie {
  tenants!: Table<Tenant, string>;
  branding!: Table<BrandingTheme, string>;
  services!: Table<Service, string>;
  staff!: Table<Staff, string>;
  hours!: Table<WorkingHours, string>;
  overrides!: Table<DateOverride, string>;
  timeOff!: Table<TimeOff, string>;
  customers!: Table<Customer, string>;
  bookings!: Table<Booking, string>;
  users!: Table<User, string>;
  notifications!: Table<NotificationRecord, string>;
  audit!: Table<AuditLog, string>;
  chatbot!: Table<ChatbotConfig, string>;
  files!: Table<StoredFile, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('nubo');
    this.version(1).stores({
      tenants: 'id, &slug',
      branding: 'tenantId',
      services: 'id, tenantId',
      staff: 'id, tenantId',
      hours: 'id, tenantId',
      overrides: 'id, tenantId',
      timeOff: 'id, tenantId',
      customers: 'id, tenantId, [tenantId+mobile]',
      bookings: 'id, tenantId, [tenantId+code], customerId, start',
      users: 'id, tenantId',
      notifications: 'id, tenantId, createdAt',
      audit: 'id, tenantId, at',
      chatbot: 'tenantId',
      files: 'id',
      meta: 'key',
    });
  }
}

export const db = new NuboDB();

export const TENANT_TABLES = [
  'services',
  'staff',
  'hours',
  'overrides',
  'timeOff',
  'customers',
  'bookings',
  'users',
  'notifications',
  'audit',
] as const;
