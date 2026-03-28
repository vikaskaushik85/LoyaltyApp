import * as Crypto from 'expo-crypto';

/**
 * Generates a dynamic QR code payload, signed with HMAC-SHA256.
 *
 * This runs entirely on-device — no network call needed.
 * The QR refreshes every ~5 seconds for smooth UX, but the server
 * accepts codes up to 30 seconds old.
 *
 * Payload format:
 *   { cafe_id, ts, nonce, sig }
 *
 * Where sig = HMAC-SHA256(cafe_id:ts:nonce, secret)
 */
export async function generateDynamicQR(
  cafeId: string,
  secret: string,
): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const nonce = Crypto.randomUUID();
  const message = `${cafeId}:${ts}:${nonce}`;

  // HMAC-SHA256 using expo-crypto
  const keyBytes = stringToUint8Array(secret);
  const msgBytes = stringToUint8Array(message);
  const sig = await hmacSHA256(msgBytes, keyBytes);

  const payload = {
    cafe_id: cafeId,
    ts,
    nonce,
    sig,
  };

  return JSON.stringify(payload);
}

/**
 * HMAC-SHA256 implementation using expo-crypto.
 * Returns hex-encoded string.
 */
async function hmacSHA256(message: Uint8Array, key: Uint8Array): Promise<string> {
  // expo-crypto doesn't have built-in HMAC, so we implement it per RFC 2104.
  const BLOCK_SIZE = 64; // SHA-256 block size in bytes

  let keyToUse = key;
  if (keyToUse.length > BLOCK_SIZE) {
    const hash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, keyToUse);
    keyToUse = new Uint8Array(hash);
  }

  // Pad key to block size
  const paddedKey = new Uint8Array(BLOCK_SIZE);
  paddedKey.set(keyToUse);

  // Inner and outer pads
  const ipad = new Uint8Array(BLOCK_SIZE);
  const opad = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  // Inner hash: SHA256(ipad || message)
  const innerData = new Uint8Array(ipad.length + message.length);
  innerData.set(ipad);
  innerData.set(message, ipad.length);
  const innerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, innerData);

  // Outer hash: SHA256(opad || innerHash)
  const innerHashBytes = new Uint8Array(innerHash);
  const outerData = new Uint8Array(opad.length + innerHashBytes.length);
  outerData.set(opad);
  outerData.set(innerHashBytes, opad.length);
  const outerHash = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, outerData);

  return bytesToHex(new Uint8Array(outerHash));
}

function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
