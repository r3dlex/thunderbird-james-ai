# Security

## API Key Encryption

API keys are encrypted at rest using AES-GCM with PBKDF2-derived keys.

### Key Derivation

| Parameter | Value |
|-----------|-------|
| Algorithm | PBKDF2 |
| Hash | SHA-256 |
| Iterations | 100,000 |
| Salt length | 16 bytes (random, stored in `messenger.storage.local`) |
| Derived key | AES-GCM, 256-bit |

### Encryption

| Parameter | Value |
|-----------|-------|
| Algorithm | AES-GCM |
| IV length | 12 bytes (random per encryption) |
| Output format | Base64(IV + ciphertext) |

### Session Flow

1. On first use, the user sets a passphrase
2. A random salt is generated and stored in `messenger.storage.local` as `corvus_key_salt`
3. The passphrase + salt derive a `CryptoKey` via PBKDF2
4. A verification ciphertext is stored as `corvus_key_test` to validate future unlock attempts
5. The `CryptoKey` is held in memory (`sessionKey`) for the session lifetime
6. On extension restart, the user re-enters the passphrase to unlock
7. `lockSession()` clears the in-memory key

The passphrase is never written to storage. The `CryptoKey` is non-extractable (Web Crypto API enforced).

### Implementation

See `src/background/storage/crypto.ts` for the full implementation. Key functions:

- `deriveKey(passphrase, salt)` -- PBKDF2 derivation
- `unlockSession(passphrase)` -- Unlock or initialize
- `encrypt(plaintext)` -- AES-GCM encrypt
- `decrypt(encoded)` -- AES-GCM decrypt
- `isSessionUnlocked()` -- Check session state
- `lockSession()` -- Clear in-memory key

## Transport Security

- All AI provider requests use HTTPS exclusively
- No HTTP fallback
- Certificate validation is handled by the browser runtime (no custom CA pinning)

## Privacy

- **No telemetry**: The extension collects no usage data, analytics, or crash reports
- **No external backend**: All AI calls go directly from the extension to the configured provider API
- **First-run notice**: On first activation, the extension displays a privacy notice explaining:
  - Email content is sent to the configured AI provider for processing
  - API keys are stored encrypted locally
  - No data is shared with the extension developer or any third party
  - The user must acknowledge before the extension becomes functional

## Auto-Reply Safety

- Auto-reply functionality is only available through user-created rules
- No default or implicit auto-reply behavior
- Each auto-reply rule requires explicit user creation and activation
- Deduplication prevents sending multiple auto-replies to the same message (tracked by `headerMessageId`)
- Auto-reply actions are logged for user review

## Content Security

- No `eval()`, `Function()`, or dynamic code execution
- Angular runs in AOT mode only
- Markdown rendering uses DOMPurify to sanitize all AI-generated HTML
- No inline scripts in popup HTML

## Permissions

The extension requests only the permissions it needs (declared in `manifest.json`):

| Permission | Purpose |
|------------|---------|
| `messagesRead` | Read email content and headers |
| `messagesMove` | Move emails between folders |
| `messagesDelete` | Delete emails (trash) |
| `messagesTags` | Read and modify email tags |
| `accountsRead` | List accounts and identities |
| `accountsFolders` | List and manage folders |
| `compose` | Create and modify drafts |
| `compose.send` | Send auto-replies from rules |
| `storage` | Persist settings and encrypted keys |
| `notifications` | Notify user of rule actions |
| `alarms` | Schedule periodic rule evaluation |
| `menus` | Context menu integration |
