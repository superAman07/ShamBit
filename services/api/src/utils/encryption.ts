import crypto from 'crypto';
import { getConfig } from '@shambit/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment or generate one
 */
const getEncryptionKey = (): Buffer => {
  const config = getConfig();
  const key = config.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required for data encryption');
  }
  
  // Derive a 32-byte key from the provided key using PBKDF2
  return crypto.pbkdf2Sync(key, 'shambit-salt', 100000, 32, 'sha256');
};

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param plaintext - Data to encrypt
 * @returns Encrypted data in format: iv:authTag:encryptedData (all base64 encoded)
 */
export const encrypt = (plaintext: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt data encrypted with encrypt()
 * @param encryptedData - Data in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
};

/**
 * Hash sensitive data using SHA-256
 * @param data - Data to hash
 * @returns Hex-encoded hash
 */
export const hash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate a cryptographically secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Constant-time string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Encrypt sensitive fields in an object
 * @param obj - Object with sensitive fields
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export const encryptFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T => {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string) as any;
    }
  }
  
  return result;
};

/**
 * Decrypt sensitive fields in an object
 * @param obj - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export const decryptFields = <T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T => {
  const result = { ...obj };
  
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string) as any;
      } catch (error) {
        // If decryption fails, leave the field as is
        // This handles cases where data might not be encrypted
      }
    }
  }
  
  return result;
};
