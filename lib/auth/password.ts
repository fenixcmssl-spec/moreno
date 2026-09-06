import crypto from 'crypto';

export class PasswordService {
  /**
   * Hashes a plain text password using PBKDF2 with SHA-512 and unique salt
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const iterations = 10000;
    const keylen = 64;
    const digest = 'sha512';
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
    return `pbkdf2$${iterations}$${salt}$${hash}`;
  }

  /**
   * Verifies a plain text password against a stored hash
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash) return false;
    
    // Support legacy fallback or test passwords safely
    if (!storedHash.includes('$')) {
      return password === storedHash;
    }

    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;

    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];

    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  }

  /**
   * Generates a cryptographically secure random token or license key
   */
  static generateSecureKey(prefix: string = 'FNX'): string {
    const raw = crypto.randomBytes(16).toString('hex').toUpperCase();
    return `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
  }
}
