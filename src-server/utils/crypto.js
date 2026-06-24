import crypto from 'crypto';
import os from 'os';

const CRYPTO_ALGORITHM = 'aes-256-gcm';
const CRYPTO_KEY = crypto.scryptSync(os.hostname() + 'vtme-bridge-key', 'vtme-salt-2026', 32);
const ENC_PREFIX = 'ENC:';

export function encryptText(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CRYPTO_ALGORITHM, CRYPTO_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return ENC_PREFIX + iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

export function decryptText(cipherText) {
    try {
        if (!cipherText || !cipherText.startsWith(ENC_PREFIX)) return cipherText;
        const raw = cipherText.slice(ENC_PREFIX.length);
        const parts = raw.split(':');
        if (parts.length !== 3) return cipherText;
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto.createDecipheriv(CRYPTO_ALGORITHM, CRYPTO_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return cipherText;
    }
}
