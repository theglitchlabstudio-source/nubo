import { createContext, useContext } from 'react';
import type { Actor, TenantBundle, TenantContext } from '@/data/ports';
import type { FeatureKey, Tenant } from '@/domain/types';
import { type Action } from '@/domain/features';

export interface DashState {
  tenant: Tenant;
  bundle: TenantBundle;
  ctx: TenantContext;
  actor: Actor;
  features: Record<FeatureKey, boolean>;
  can: (a: Action) => boolean;
  base: string; // "/b/slug/admin"
}

export const DashContext = createContext<DashState | null>(null);

export function useDash(): DashState {
  const v = useContext(DashContext);
  if (!v) throw new Error('useDash outside dashboard');
  return v;
}
