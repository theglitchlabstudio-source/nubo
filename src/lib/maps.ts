// Map providers are links, not embedded maps (no API keys, nothing blocked). See docs/ARCHITECTURE.md §7.6.
import type { MapProviderId, TenantProfile } from '@/domain/types';

export interface MapProvider {
  id: MapProviderId;
  label: string;
  linkFor(lat: number, lng: number): string;
}

export const MAP_PROVIDERS: MapProvider[] = [
  { id: 'neshan', label: 'نشان', linkFor: (lat, lng) => `https://neshan.org/maps/@${lat},${lng},16z,0p` },
  { id: 'balad', label: 'بلد', linkFor: (lat, lng) => `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=16` },
  { id: 'google', label: 'گوگل مپ', linkFor: (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` },
];

/** Pasted links win; otherwise links are built from the pin. */
export function mapLinks(loc: TenantProfile['location']): { id: MapProviderId; label: string; href: string }[] {
  return MAP_PROVIDERS.flatMap((p) => {
    const pasted = loc.mapLinks[p.id];
    if (pasted) return [{ id: p.id, label: p.label, href: pasted }];
    if (loc.lat != null && loc.lng != null) return [{ id: p.id, label: p.label, href: p.linkFor(loc.lat, loc.lng) }];
    return [];
  });
}

/** `geo:` lets Android customers pick any installed map app. */
export function geoLink(loc: TenantProfile['location']): string | null {
  return loc.lat != null && loc.lng != null ? `geo:${loc.lat},${loc.lng}?q=${loc.lat},${loc.lng}` : null;
}
