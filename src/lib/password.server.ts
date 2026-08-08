import bcrypt from "bcryptjs";

/** Hash a password with bcrypt. Plain text is never persisted. */
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
