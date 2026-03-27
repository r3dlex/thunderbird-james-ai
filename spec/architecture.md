# Architecture

## Overview

Corvus is a Thunderbird WebExtension (Manifest V3) with two isolated runtime contexts:

1. **Background script** -- long-lived service worker handling AI, storage, rules, and mail API access
2. **Angular UI** -- popup panels rendered via `action`, `message_display_action`, and `compose_action`

Communication between the two is exclusively via `messenger.runtime.sendMessage()` for request/response and `messenger.runtime.Port` for streaming.

## System Diagram

```
+---------------------------------------------------------------+
|                     Background Script                          |
|                                                                |
|  +-------------+  +------------------+  +------------------+  |
|  |  AI Router  |  | Mail Context     |  | Provider Adapters|  |
|  | (tool loop) |  | Engine           |  | (Anthropic,      |  |
|  |             |  | (messages,       |  |  OpenAI, Gemini, |  |
|  |             |  |  threads,        |  |  MiniMax)        |  |
|  |             |  |  folders)        |  |                  |  |
|  +------+------+  +--------+---------+  +--------+---------+  |
|         |                  |                      |            |
|  +------+------+  +-------+--------+                          |
|  | Rule Engine |  | Storage Layer  |                          |
|  | (matching,  |  | (crypto, cache,|                          |
|  |  scheduling)|  |  settings)     |                          |
|  +-------------+  +----------------+                          |
|                                                                |
+-------------------+-------------------------------------------+
                    |
        runtime.sendMessage() / runtime.Port
                    |
+-------------------v-------------------------------------------+
|                      Angular UI                                |
|                                                                |
|  +----------+  +-----------+  +---------+  +----------+      |
|  | Chat View|  | Assistant |  | Compose |  | Settings |      |
|  | (msg     |  | (general  |  | (draft  |  | (keys,   |      |
|  |  display)|  |  actions) |  |  assist)|  |  models) |      |
|  +----------+  +-----------+  +---------+  +----------+      |
|                                                                |
|  +-------------------+  +------------------+                  |
|  | Bridge Service    |  | Theme Service    |                  |
|  | (sendMessage,     |  | (dark/light,     |                  |
|  |  Port management) |  |  TB CSS props)   |                  |
|  +-------------------+  +------------------+                  |
+---------------------------------------------------------------+
```

## Directory Structure

```
src/
  background/
    index.ts              # Entry point, message listener registration
    ai/
      router.ts           # Provider selection, tool execution loop
      providers/
        anthropic.ts      # Anthropic adapter
        openai.ts         # OpenAI adapter
        gemini.ts         # Gemini adapter
        minimax.ts        # MiniMax adapter (Anthropic-compatible)
        base.ts           # AIProvider abstract class
      tools/
        definitions.ts    # Tool schemas for function calling
        executor.ts       # Tool dispatch to messenger.* APIs
    context/
      mail-context.ts     # Read displayed message, build thread context
      thread-builder.ts   # Chronological thread assembly
    rules/
      engine.ts           # Rule evaluation and execution
      matcher.ts          # Condition matching logic
      scheduler.ts        # Alarm-based periodic evaluation
      types.ts            # CorvusRule, CorvusCondition, CorvusAction
    batch/
      processor.ts        # Batch operation queue and confirmation
    storage/
      crypto.ts           # AES-GCM encryption, PBKDF2 key derivation
      settings.ts         # Provider configs, model selection
      cache.ts            # Conversation and usage caching
  ui/
    src/
      app/
        services/         # Bridge, theme, streaming services
        views/
          chat/           # Contextual email chat (message_display_action)
          assistant/      # General assistant (action popup)
          compose/        # Compose assistant (compose_action)
          settings/       # Provider configuration
        shared/
          components/     # Tab bar, provider selector, loading indicator
          pipes/          # Markdown rendering pipe
      styles/             # Global styles, Thunderbird theme variables
  types/
    thunderbird.d.ts      # messenger.* API type declarations
```

## Message Passing Protocol

All UI-to-background communication uses a typed message envelope:

```typescript
interface CorvusMessage {
  type: string        // e.g. "chat", "getSettings", "toolResult"
  payload: unknown    // type-specific data
}
```

**Request/Response** (`runtime.sendMessage`): Used for settings reads/writes, tool invocations, rule CRUD, and non-streaming AI requests.

**Streaming** (`runtime.Port`): The UI opens a named port (`corvus-stream`). The background script sends incremental `content_delta` messages as AI tokens arrive, followed by a `stream_end` message. The port is disconnected by the UI when the popup closes.

## Key Invariants

- No external backend -- all AI calls are direct HTTPS from the background script
- No localStorage/sessionStorage -- all persistence via `messenger.storage.local`
- No JIT, eval(), or Function() -- Angular runs in AOT mode
- Background script is the sole consumer of `messenger.*` APIs
- UI never calls `messenger.messages.*` directly; it delegates via bridge service
