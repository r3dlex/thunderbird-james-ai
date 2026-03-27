/**
 * AES-GCM encryption for API keys using PBKDF2 key derivation.
 * Passphrase is held in memory for the session, never written to storage.
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const KEY_LENGTH = 256

let sessionKey: CryptoKey | null = null

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function initializeSession(passphrase: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  sessionKey = await deriveKey(passphrase, salt)

  // Store the salt so we can re-derive the key next session
  await messenger.storage.local.set({ corvus_key_salt: Array.from(salt) })
}

export async function unlockSession(passphrase: string): Promise<boolean> {
  const stored = await messenger.storage.local.get("corvus_key_salt")
  const saltArray = stored.corvus_key_salt as number[] | undefined

  if (!saltArray) {
    // First time: initialize with this passphrase
    await initializeSession(passphrase)
    return true
  }

  const salt = new Uint8Array(saltArray)
  sessionKey = await deriveKey(passphrase, salt)

  // Verify by trying to decrypt a test value
  const testData = await messenger.storage.local.get("corvus_key_test")
  if (testData.corvus_key_test) {
    try {
      await decrypt(testData.corvus_key_test as string)
      return true
    } catch {
      sessionKey = null
      return false
    }
  }

  // No test value yet, store one
  const encrypted = await encrypt("corvus_verification")
  await messenger.storage.local.set({ corvus_key_test: encrypted })
  return true
}

export function isSessionUnlocked(): boolean {
  return sessionKey !== null
}

export function lockSession(): void {
  sessionKey = null
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!sessionKey) {
    throw new Error("Session not unlocked. Call unlockSession first.")
  }

  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const data = encoder.encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    data
  )

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), IV_LENGTH)

  return btoa(String.fromCharCode(...combined))
}

export async function decrypt(encoded: string): Promise<string> {
  if (!sessionKey) {
    throw new Error("Session not unlocked. Call unlockSession first.")
  }

  const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}
