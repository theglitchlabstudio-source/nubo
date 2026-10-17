// TanStack Query hooks: the only way screens read and write data.
import { useEffect, useState } from 'react';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { data } from './index';
import type { TenantContext } from './ports';
import type { FileRef } from '@/domain/types';
import { onChange } from '@/services/events';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

/** Any data change (this tab or another) refreshes what's on screen. The mock is fast, so we keep it simple. */
export function useLiveInvalidation() {
  const qc = useQueryClient();
  useEffect(() => onChange(() => qc.invalidateQueries()), [qc]);
}

/** Current time, ticking every 30s, so "pending" holds expire on screen. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useSeed() {
  return useQuery({ queryKey: ['seed'], queryFn: async () => (await data.admin.ensureSeeded(), true), staleTime: Infinity });
}

export function useBundle(slug: string | undefined) {
  return useQuery({ queryKey: ['bundle', slug], queryFn: () => data.tenants.getBundleBySlug(slug!), enabled: !!slug });
}

export function useSlotInputs(tenantId: string | undefined) {
  return useQuery({ queryKey: ['slotInputs', tenantId], queryFn: () => data.availability.getSlotInputs(tenantId!), enabled: !!tenantId });
}

export function useBookingsAll(ctx: TenantContext | null) {
  return useQuery({ queryKey: ['bookingsAll', ctx?.tenantId], queryFn: () => data.bookings.listAll(ctx!), enabled: !!ctx });
}

export function useBooking(ctx: TenantContext | null, id: string | undefined) {
  return useQuery({ queryKey: ['booking', ctx?.tenantId, id], queryFn: () => data.bookings.get(ctx!, id!), enabled: !!ctx && !!id });
}

export function usePublicBooking(slug: string | undefined, code: string | undefined) {
  return useQuery({ queryKey: ['publicBooking', slug, code], queryFn: () => data.bookings.getByCode(slug!, code!), enabled: !!slug && !!code });
}

export function useCustomers(ctx: TenantContext | null) {
  return useQuery({ queryKey: ['customers', ctx?.tenantId], queryFn: () => data.customers.list(ctx!), enabled: !!ctx });
}

export function useNotifications(ctx: TenantContext | null) {
  return useQuery({ queryKey: ['notifications', ctx?.tenantId], queryFn: () => data.notifications.list(ctx!), enabled: !!ctx });
}

export function useAudit(tenantId: string | null) {
  return useQuery({ queryKey: ['audit', tenantId], queryFn: () => data.audit.list(tenantId) });
}

export function useTenants() {
  return useQuery({ queryKey: ['tenants'], queryFn: () => data.tenants.list() });
}

export function useTenant(id: string | undefined) {
  return useQuery({ queryKey: ['tenant', id], queryFn: () => data.tenants.get(id!), enabled: !!id });
}

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: () => data.tenants.overview() });
}

export function useUsers(tenantId: string | null | undefined) {
  return useQuery({ queryKey: ['users', tenantId], queryFn: () => data.users.listForTenant(tenantId ?? null), enabled: tenantId !== undefined });
}

export function useChatbot(tenantId: string | undefined) {
  return useQuery({ queryKey: ['chatbot', tenantId], queryFn: () => data.chatbot.get(tenantId!), enabled: !!tenantId });
}

const urlCache = new Map<string, string>();

/** Object URL for a stored image (mock: Blob in IndexedDB). */
export function useFileUrl(ref: FileRef | undefined) {
  const q = useQuery({
    queryKey: ['file', ref?.id],
    enabled: !!ref,
    staleTime: Infinity,
    queryFn: async () => {
      const cached = urlCache.get(ref!.id);
      if (cached) return cached;
      const blob = await data.files.get(ref!.id);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(ref!.id, url);
      return url;
    },
  });
  return q.data ?? null;
}

/** A mutation that reports errors through the caller and refreshes everything on success. */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}
