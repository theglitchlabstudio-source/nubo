// Mock auth: name + 4-digit PIN. See docs/ARCHITECTURE.md §8.2.
// Sessions are kept per scope ('hub' or a tenantId) so you can be signed in to several demo dashboards at once.
// Phase 4 replaces this with PocketBase auth + SMS OTP behind the same functions.
import { useSyncExternalStore } from 'react';
import { data } from '@/data';
import type { Actor } from '@/data/ports';
import { DataError } from '@/data/errors';
import { hashPin } from '@/lib/crypto';
import { toEn } from '@/lib/digits';

const KEY = 'nubo.sessions';
type Sessions = Record<string, Actor>;

function read(): Sessions {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

let cache = read();
const listeners = new Set<() => void>();

function write(next: Sessions) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: session lives in memory only */
  }
  for (const l of listeners) l();
}

export function getSession(scope: string): Actor | null {
  return cache[scope] ?? null;
}

export function useSession(scope: string): Actor | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => cache[scope] ?? null,
  );
}

export async function signInWithPin(scope: string, tenantId: string | null, userId: string, pin: string): Promise<Actor> {
  const users = await data.users.listForTenant(tenantId);
  const user = users.find((u) => u.id === userId && u.active);
  if (!user || user.pinHash !== (await hashPin(user.id, toEn(pin)))) throw new DataError('FORBIDDEN', 'رمز درست نیست');
  const actor: Actor = { userId: user.id, name: user.name, role: user.role };
  write({ ...cache, [scope]: actor });
  return actor;
}

export function signOut(scope: string) {
  const next = { ...cache };
  delete next[scope];
  write(next);
}

/** Super admin opens a business dashboard ("open as"). Requires a hub session. */
export function impersonate(tenantId: string): Actor {
  const hub = cache.hub;
  if (!hub || hub.role !== 'super_admin') throw new DataError('FORBIDDEN');
  const actor: Actor = { ...hub, impersonatorName: hub.name };
  write({ ...cache, [tenantId]: actor });
  return actor;
}
