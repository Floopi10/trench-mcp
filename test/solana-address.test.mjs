import test from 'node:test';
import assert from 'node:assert/strict';
import { isSolanaAddress, assertSolanaAddress } from '../src/solana-address.mjs';
const valid = 'So11111111111111111111111111111111111111112';
test('validates a 32-byte base58 Solana public key', () => { assert.equal(isSolanaAddress(valid), true); assert.equal(isSolanaAddress('0x'+'a'.repeat(40)), false); assert.equal(isSolanaAddress('not-a-key'), false); assert.throws(() => assertSolanaAddress('not-a-key')); });
