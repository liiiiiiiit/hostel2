import { randomBytes, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(derive);
export interface PasswordCredential { salt: string; hash: string }
export async function createPasswordCredential(password: string): Promise<PasswordCredential> {
  const salt = randomBytes(24).toString('hex');
  const hash = (await scrypt(password, salt, 32)) as Buffer;
  return { salt, hash: hash.toString('hex') };
}
export async function verifyPassword(password: string, credential: PasswordCredential): Promise<boolean> {
  const hash = (await scrypt(password, credential.salt, 32)) as Buffer;
  const expected = Buffer.from(credential.hash, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}
