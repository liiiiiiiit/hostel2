// Local demo authentication only. Production needs a trusted server and sessions.
export interface PasswordCredential { salt: string; hash: string }

async function derive(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256',
  }, key, 256);
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createPasswordCredential(password: string): Promise<PasswordCredential> {
  const salt = crypto.randomUUID();
  return { salt, hash: await derive(password, salt) };
}

export async function verifyPassword(password: string, credential: PasswordCredential): Promise<boolean> {
  return (await derive(password, credential.salt)) === credential.hash;
}
