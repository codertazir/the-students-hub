# Fix SESSION_SECRET missing at runtime

## What SESSION_SECRET is
A long random string used by `src/lib/session.server.ts` to encrypt the session cookie. It is not a credential from a third party; the app itself generates and stores it.

## Why the error appears
`config()` in `src/lib/session.server.ts` reads `process.env["SESSION_SECRET"]`. If the variable is empty when the server function runs, it throws `SESSION_SECRET is not configured`.

## What the value should be
- At least 32 characters, preferably 64+ for stronger security.
- Cryptographically random (not a human-readable phrase).
- Hex or base64 encoding is fine.

## How to generate one locally
```bash
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Fix steps
1. Check whether `SESSION_SECRET` is currently stored in the project secrets.
2. If it is missing or invalid, generate a new random value (64 characters) using `generate_secret` and store it in the project environment.
3. Restart the dev server/preview so the new value is loaded into the server runtime.
4. Verify the login error is gone by attempting to sign in.
