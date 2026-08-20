/**
 * Reversible (two-way) encryption for stored passwords.
 *
 * The club explicitly wants admins to be able to read member passwords the way
 * some school platforms let teachers see student passwords. Passwords are
 * therefore stored twice: as a bcrypt hash (used for verification) and as an
 * AES-256-GCM ciphertext that only the server can decrypt.
 *
 * The key is derived from SESSION_SECRET, read inside the functions so it is
 * evaluated in the request context. Nothing is ever hard-coded.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey() {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`tsh-password-key:${secret}`),
  );
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

/** Encrypts a password into an `iv.ciphertext` base64 string. */
export async function encryptSecret(plain: string) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plain));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

/** Decrypts a value produced by encryptSecret; returns null when unreadable. */
export async function decryptSecret(value: string | null | undefined) {
  if (!value) return null;
  const [ivPart, dataPart] = value.split(".");
  if (!ivPart || !dataPart) return null;
  try {
    const key = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivPart) },
      key,
      fromBase64(dataPart),
    );
    return decoder.decode(plain);
  } catch {
    return null;
  }
}
