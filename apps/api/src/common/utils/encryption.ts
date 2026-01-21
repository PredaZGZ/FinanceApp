import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Lazy load key
let keyBuffer: Buffer | null = null;

const getKey = () => {
    if (keyBuffer) return keyBuffer;

    // Try process.env first
    let keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex) {
        throw new Error("ENCRYPTION_KEY is missing or invalid. Please run setup script.");
    }

    if (keyHex.length !== 64) {
        throw new Error("ENCRYPTION_KEY must be a 32-byte hex string (64 chars).");
    }

    keyBuffer = Buffer.from(keyHex, 'hex');
    return keyBuffer;
};

export const encrypt = (text: string) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();
    // Append authTag to ciphertext
    const combined = Buffer.concat([encrypted, authTag]);

    return {
        iv: iv.toString('hex'),
        encryptedData: combined.toString('hex')
    };
};

export const decrypt = (encryptedDataHex: string, ivHex: string) => {
    const iv = Buffer.from(ivHex, 'hex');
    const combined = Buffer.from(encryptedDataHex, 'hex');

    if (combined.length < AUTH_TAG_LENGTH) throw new Error("Invalid encrypted data length");

    // Extract auth tag
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encryptedText = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
};
