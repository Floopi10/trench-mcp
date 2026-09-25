export const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Base58 length alone is insufficient: Solana public keys decode to exactly 32 bytes.
export function isSolanaAddress(value) {
  const input = String(value ?? '');
  if (!SOLANA_ADDRESS.test(input)) return false;
  const bytes = [0];
  for (const char of input) {
    let carry = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.indexOf(char);
    if (carry < 0) return false;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  let leadingZeroes = 0;
  while (leadingZeroes < input.length && input[leadingZeroes] === '1') leadingZeroes += 1;
  return bytes.length + leadingZeroes === 32;
}

export function assertSolanaAddress(value) {
  if (!isSolanaAddress(value)) throw new Error('Token must be a valid base58 Solana public key.');
}
