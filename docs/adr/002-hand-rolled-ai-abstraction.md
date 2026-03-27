# ADR 002: Hand-Rolled AI Provider Abstraction

## Status

Accepted

## Context

Corvus supports multiple AI providers (Anthropic, OpenAI, Gemini, MiniMax). Options for abstracting provider differences:

1. Vercel AI SDK (adds runtime dependency, large bundle, may not work in extension context)
2. LangChain (heavy, opinionated, unnecessary abstraction layers)
3. Hand-rolled abstraction using raw fetch() calls

## Decision

Implement a minimal, hand-rolled provider abstraction layer. Each provider implements a common interface (`AIProvider`) with `chat()` and `stream()` methods. No external AI SDK dependencies.

## Consequences

- Zero runtime dependencies for AI communication
- Full control over request/response formatting per provider
- Must manually handle streaming SSE parsing for each provider
- Must maintain provider-specific code as APIs evolve
- Smaller bundle size, no dependency supply chain risk
- Tool/function calling format differences handled per-provider in adapters
