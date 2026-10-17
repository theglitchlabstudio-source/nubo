// Change events. Within a tab: a simple emitter. Across tabs: BroadcastChannel.
// This is what makes the "request in one tab → appears in the admin inbox in another" demo work.
// With PocketBase this is replaced by its realtime subscriptions.

export interface ChangeEvent {
  tenantId: string | null; // null = global (hub)
  collection: string;
  /** Set when a new online booking request arrives (drives toasts in the dashboard). */
  newBookingId?: string;
}

type Listener = (e: ChangeEvent) => void;
const listeners = new Set<Listener>();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('nubo-changes') : null;

channel?.addEventListener('message', (msg) => {
  for (const l of listeners) l(msg.data as ChangeEvent);
});

export function emitChange(e: ChangeEvent) {
  for (const l of listeners) l(e);
  channel?.postMessage(e);
}

export function onChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
