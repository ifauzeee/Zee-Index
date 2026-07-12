export function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const encodedA = encoder.encode(a);
  const encodedB = encoder.encode(b);

  if (encodedA.length !== encodedB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < encodedA.length; i += 1) {
    result |= encodedA[i] ^ encodedB[i];
  }

  return result === 0;
}
