/** SHA-256 hex. Used to store demo PINs hashed (mock only — real auth comes in Phase 4). */
export async function sha256(text: string): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for insecure contexts (e.g. opening the dev server over LAN http): not cryptographic, mock only.
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `weak-${h >>> 0}`;
}

export function hashPin(userId: string, pin: string) {
  return sha256(`${userId}:${pin}`);
}
