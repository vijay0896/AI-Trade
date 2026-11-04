/**
 * @file totp.utils.js
 * @description RFC 6238 Time-based One-Time Password (TOTP) generator using native Node.js crypto.
 */

const crypto = require('crypto');

/**
 * Decodes a base32 encoded string into a Buffer.
 *
 * @param {string} base32 - Base32 string (A-Z, 2-7)
 * @returns {Buffer} Decoded binary buffer
 */
const base32Decode = (base32) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output = [];

  const cleaned = base32.replace(/[\s=-]/g, '').toUpperCase();

  for (let i = 0; i < cleaned.length; i++) {
    const val = alphabet.indexOf(cleaned[i]);
    if (val === -1) continue;

    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

/**
 * Generates the current 6-digit TOTP code for a given Base32 secret.
 *
 * @param {string} secret - Base32 TOTP secret key
 * @param {number} [timeStep=30] - Time step in seconds (default: 30)
 * @returns {string} 6-digit numeric OTP string
 */
const generateTOTP = (secret, timeStep = 30) => {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;

  return code.toString().padStart(6, '0');
};

/**
 * Returns seconds remaining until the current TOTP cycle expires.
 *
 * @param {number} [timeStep=30]
 * @returns {number} Seconds remaining (0-30)
 */
const getTOTPSecondsRemaining = (timeStep = 30) => {
  const epoch = Math.floor(Date.now() / 1000);
  return timeStep - (epoch % timeStep);
};

module.exports = {
  base32Decode,
  generateTOTP,
  getTOTPSecondsRemaining
};

