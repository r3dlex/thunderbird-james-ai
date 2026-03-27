# Corvus

AI-powered Thunderbird extension with multi-provider support. Brings contextual email chat, compose assistance, automated rules, and batch operations directly into the mail client.

## Features

- **Contextual Email Chat** -- Ask questions about the email you are viewing, draft replies, search for related messages
- **General Assistant** -- Run batch operations, manage filter rules, search across your mailbox
- **Compose Assistant** -- Quick actions (concise, formal, grammar, translate) and custom instructions while writing
- **Automated Rules** -- Create rules via natural language, including LLM-based email classification and auto-reply
- **Multi-Provider AI** -- Anthropic Claude, OpenAI, Google Gemini, MiniMax

## Requirements

- Thunderbird 128+ (latest stable)
- Node.js 22+
- Python 3.12+ with Poetry (for pipeline tooling)

## Quick Start

```bash
# Install Node dependencies
npm install

# Install Angular UI dependencies
cd src/ui && npm install && cd ../..

# Development build (watches for changes)
npm run dev

# Production build
npm run build

# Package as .xpi
npm run package
```

## Install in Thunderbird

1. Build the extension: `npm run package`
2. Open Thunderbird > Add-ons Manager > gear icon > "Install Add-on From File"
3. Select `corvus.xpi`
4. Open Settings via the Corvus toolbar icon > gear icon
5. Add your AI provider API key

## Pipeline Tooling

CI/CD pipelines are managed via Python:

```bash
cd tools/pipeline_runner
poetry install
poetry run pipeline-runner --list    # Show available pipelines
poetry run pipeline-runner lint      # Lint TypeScript + Python
poetry run pipeline-runner test      # Run all tests
poetry run pipeline-runner build     # Build extension
poetry run pipeline-runner package   # Create .xpi
poetry run pipeline-runner adr       # List ADRs
```

## Architecture

```
Background Script (persistent)
  |-- AI Router (provider selection, tool execution loop)
  |-- Provider Adapters (Anthropic, OpenAI, Gemini, MiniMax)
  |-- Mail Context Engine (messages, threads, attachments)
  |-- Rules Engine (matching, execution, scheduling, LLM classification)
  |-- Storage (encrypted API keys, rules, cache)
  |
  |-- runtime.sendMessage() / runtime.Port (streaming)
  |
Angular UI (popup panels)
  |-- Chat view (contextual email AI)
  |-- Assistant view (batch ops, rules, general chat)
  |-- Settings view (provider configuration)
  |-- Compose view (writing assistance)
```

## Project Structure

| Directory | Contents |
|-----------|----------|
| `src/background/` | Background script: AI providers, tools, rules, storage |
| `src/ui/` | Angular 19 UI: views, services, shared components |
| `src/types/` | Thunderbird MailExtension API type declarations |
| `tools/pipeline_runner/` | Python CI/CD pipeline orchestrator |
| `spec/` | Detailed specifications |
| `docs/adr/` | Architecture Decision Records |

## Documentation

- [CLAUDE.md](CLAUDE.md) -- Project overview and agent guidelines
- [AGENTS.md](AGENTS.md) -- Agent role definitions
- [spec/](spec/) -- Detailed specifications (architecture, AI providers, tools, features, UI, security, testing, build)
- [docs/adr/](docs/adr/) -- Architecture Decision Records

## Testing

```bash
# Background script tests (Jest)
npm test

# Angular UI tests
npm run test:ui

# Python pipeline tests
cd tools/pipeline_runner && poetry run pytest
```

### Coverage Targets

| Component | Target |
|-----------|--------|
| Background script | 80% lines |
| Angular UI | 70% lines |
| Rules engine | 90% lines |
| AI providers | 80% lines |
| Crypto module | 100% lines |

## Security

- API keys encrypted with AES-GCM, PBKDF2 key derivation (100k iterations, SHA-256)
- Passphrase prompted once per session, held in memory only
- All AI API calls over HTTPS
- No telemetry, no analytics
- Auto-replies only from user-created rules

## License

See [LICENSE](LICENSE).
