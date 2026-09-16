import { timingSafeEqual } from "node:crypto";

export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const encodedA = encoder.encode(a);
  const encodedB = encoder.encode(b);

  if (encodedA.length !== encodedB.length) {
    const maxLen = Math.max(encodedA.length, encodedB.length);
    const paddedA = new Uint8Array(maxLen);
    const paddedB = new Uint8Array(maxLen);
    paddedA.set(encodedA);
    paddedB.set(encodedB);
    return timingSafeEqual(paddedA, paddedB);
  }

  return timingSafeEqual(encodedA, encodedB);
}
