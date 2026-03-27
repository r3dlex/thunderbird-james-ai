# Testing

## Coverage Targets

| Module | Target | Metric |
|--------|--------|--------|
| Background (overall) | 80% | Lines |
| UI (Angular) | 70% | Lines |
| Rules engine | 90% | Lines |
| AI providers | 80% | Lines |
| Crypto (`storage/crypto.ts`) | 100% | Lines |

## Test Frameworks

| Context | Framework | Config |
|---------|-----------|--------|
| Background | Jest + ts-jest | `jest.config.ts` |
| UI | Angular CLI (Karma/Jasmine) | `src/ui/angular.json` |

Run commands:

```
npm test              # Jest for background (with coverage)
npm run test:watch    # Jest watch mode
npm run test:ui       # Angular tests (single run, with coverage)
```

## Unit Tests

### AI Providers

- Mock `fetch()` globally for all provider tests
- Test request body construction for each provider (correct headers, body shape, system prompt placement)
- Test response parsing (content extraction, tool call extraction, usage stats)
- Test streaming: feed mock SSE chunks, verify `onDelta` callbacks fire correctly
- Test error handling: 401 (auth), 429 (rate limit), 500 (server error), network failure
- Test MiniMax temperature clamping (0.0 -> 0.01)

### AI Router

- Mock provider `chat()` and `stream()` methods
- Test tool execution loop: provider returns tool_use, executor runs, result appended, re-sent
- Test iteration cap: verify loop stops after 10 iterations
- Test stop reasons: `end_turn` exits loop, `max_tokens` exits loop
- Test error propagation from provider and tool executor

### Tools

- Mock all `messenger.*` APIs (messages, folders, accounts, compose)
- Test each tool function independently:
  - `search_emails`: verify query mapping, pagination, snippet truncation
  - `move_emails`: verify folder resolution, move call, error counting
  - `create_draft`: verify dispatch to correct compose method per type
  - `list_folders`: verify recursive folder traversal
  - `tag_emails`: verify tag merge logic
  - `get_email_content`: verify MIME parsing, attachment extraction
  - `get_thread`: verify reference chain following, chronological sort
- Test `is_error` responses for invalid inputs

### Rules Engine

- Test condition matching for each operator: `contains`, `equals`, `startsWith`, `matches`
- Test `conditionLogic`: `all` requires every condition, `any` requires at least one
- Test action dispatch for each action type
- Test auto-reply deduplication: same `headerMessageId` should not trigger twice
- Test AI classification condition: mock AI response, verify match
- Test rule CRUD: create, update, delete, enable/disable
- Test scheduled evaluation: verify alarm callback triggers evaluation

### Crypto

- Test `deriveKey()`: same passphrase + salt produces same key
- Test `encrypt()` / `decrypt()` round-trip
- Test `unlockSession()`: correct passphrase succeeds, wrong passphrase fails
- Test `initializeSession()`: salt stored, test value stored
- Test `isSessionUnlocked()` / `lockSession()` state transitions
- Test error on encrypt/decrypt when session is locked

## Integration Tests

### Extension Loading

- Use `web-ext run` with a Thunderbird profile
- Verify background script loads without errors
- Verify popup opens for each action type (action, message_display_action, compose_action)

### Popup Verification

- Verify tab switching between Chat and Assistant
- Verify settings view opens and closes
- Verify provider card renders for each configured provider
- Verify theme matches Thunderbird's current theme (light/dark)

### Streaming Rendering

- Send a mock streaming response via test provider
- Verify tokens appear incrementally in the chat view
- Verify Markdown renders correctly after stream completes
- Verify loading indicator shows during stream and hides after

## Manual Test Checklist

- [ ] Install XPI in Thunderbird, extension appears in add-ons
- [ ] First-run privacy notice displays and requires acknowledgment
- [ ] Passphrase prompt appears on first settings access
- [ ] API key encrypts on save, decrypts on load after unlock
- [ ] Wrong passphrase shows error, does not unlock
- [ ] Chat panel shows context card for displayed email
- [ ] AI response streams token-by-token in chat
- [ ] Tool calls execute (search, move, tag) and results display
- [ ] Compose assistant quick actions modify draft text
- [ ] Compose assistant never sends the email
- [ ] Rules engine evaluates on new mail arrival
- [ ] Auto-reply rule sends exactly one reply per thread
- [ ] Dark mode renders correctly
- [ ] Popup dimensions are 380x500px
- [ ] No console errors in background or popup
