// utils/encryption.js - AES-256-GCM encryption for sensitive session data
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Get the encryption key from environment.
 * Must be a 64-char hex string (32 bytes).
 */
function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all hex-encoded).
 *
 * @param {string} plaintext - The text to encrypt
 * @returns {string} Encrypted string in format iv:authTag:ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext && plaintext !== '') return '';

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Combine iv + authTag + ciphertext separated by colons
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string that was encrypted with encrypt().
 *
 * @param {string} encryptedText - The encrypted string in format iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
function decrypt(encryptedText) {
  if (!encryptedText) return '';

  try {
    const key = getKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      console.warn('⚠️ Invalid encrypted text format, returning as-is');
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const ciphertext = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    // Return empty string rather than throwing — protects against corrupt data
    return '';
  }
}

module.exports = { encrypt, decrypt };
