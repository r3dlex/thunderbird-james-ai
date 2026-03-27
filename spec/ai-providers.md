# AI Providers

## Provider Abstraction

All providers implement the `AIProvider` abstract class:

```typescript
abstract class AIProvider {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly models: ModelInfo[]

  abstract chat(request: ChatRequest): Promise<ChatResponse>
  abstract stream(request: ChatRequest, onDelta: (delta: string) => void): Promise<ChatResponse>

  protected abstract buildHeaders(apiKey: string): Record<string, string>
  protected abstract buildBody(request: ChatRequest): unknown
  protected abstract parseResponse(raw: unknown): ChatResponse
}

interface ChatRequest {
  model: string
  messages: ChatMessage[]
  systemPrompt?: string
  tools?: ToolDefinition[]
  temperature?: number
  maxTokens?: number
}

interface ChatResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: { inputTokens: number; outputTokens: number }
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "error"
}

interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}
```

All provider communication uses raw `fetch()` -- no SDK dependencies.

---

## Anthropic

| Field | Value |
|-------|-------|
| Endpoint | `POST https://api.anthropic.com/v1/messages` |
| Auth header | `x-api-key: <key>` |
| Version header | `anthropic-version: 2023-06-01` |
| System prompt | Top-level `system` field (not in messages array) |
| Tool results | User-role message with `tool_result` content blocks |

**Models**:

| Model ID | Context | Max Output |
|----------|---------|------------|
| claude-opus-4-6 | 200K | 32K |
| claude-sonnet-4-5-20250929 | 200K | 16K |
| claude-haiku-4-5-20251001 | 200K | 8K |

**Streaming**: SSE with the following event sequence:

```
event: message_start       # Contains message metadata, usage.input_tokens
event: content_block_start # type: "text" or "tool_use"
event: content_block_delta # delta.text or delta.partial_json
event: content_block_stop
event: message_delta       # stop_reason, usage.output_tokens
event: message_stop
```

**Request body shape**:

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 4096,
  "system": "You are a mail assistant.",
  "messages": [
    { "role": "user", "content": "Summarize this email." }
  ],
  "tools": [ ... ],
  "stream": true
}
```

**Tool result message**:

```json
{
  "role": "user",
  "content": [
    {
      "type": "tool_result",
      "tool_use_id": "toolu_abc123",
      "content": "{ \"id\": 42, \"subject\": \"Re: meeting\" }"
    }
  ]
}
```

---

## OpenAI

| Field | Value |
|-------|-------|
| Endpoint | `POST https://api.openai.com/v1/chat/completions` |
| Auth header | `Authorization: Bearer <key>` |
| System prompt | Message with `role: "system"` in messages array |
| Tool results | Message with `role: "tool"` and `tool_call_id` field |

**Models**:

| Model ID | Context | Max Output |
|----------|---------|------------|
| gpt-4o | 128K | 16K |
| gpt-4o-mini | 128K | 16K |
| gpt-4.1 | 1M | 32K |
| o3-mini | 200K | 100K |

**Streaming**: SSE with `data:` prefixed JSON lines. Each chunk contains `choices[0].delta` with incremental `content` or `tool_calls`. Stream terminates with `data: [DONE]`.

**Request body shape**:

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a mail assistant." },
    { "role": "user", "content": "Summarize this email." }
  ],
  "tools": [ ... ],
  "stream": true
}
```

**Tool result message**:

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{ \"id\": 42, \"subject\": \"Re: meeting\" }"
}
```

---

## Gemini

| Field | Value |
|-------|-------|
| Endpoint | `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| Auth header | `x-goog-api-key: <key>` |
| System prompt | `systemInstruction` top-level field with `parts` array |
| Tool results | Message with `role: "function"` containing `functionResponse` parts |
| Tool definitions | `functionDeclarations` array under `tools` |

**Models**:

| Model ID | Context | Max Output |
|----------|---------|------------|
| gemini-2.5-pro | 1M | 65K |
| gemini-2.5-flash | 1M | 65K |
| gemini-2.5-flash-lite | 1M | 65K |

**Request body shape**:

```json
{
  "systemInstruction": {
    "parts": [{ "text": "You are a mail assistant." }]
  },
  "contents": [
    {
      "role": "user",
      "parts": [{ "text": "Summarize this email." }]
    }
  ],
  "tools": [{
    "functionDeclarations": [ ... ]
  }]
}
```

**Tool result message**:

```json
{
  "role": "function",
  "parts": [{
    "functionResponse": {
      "name": "search_emails",
      "response": { "id": 42, "subject": "Re: meeting" }
    }
  }]
}
```

Content is structured as `parts` arrays containing objects with `text` fields. Multi-turn conversations alternate `user` and `model` roles.

---

## MiniMax

| Field | Value |
|-------|-------|
| Endpoint | `POST https://api.minimax.io/anthropic/v1/messages` |
| Auth header | `x-api-key: <key>` |
| Compatibility | Anthropic-compatible API |
| Temperature | Range `(0.0, 1.0]` -- zero is not allowed |

**Models**:

| Model ID | Context | Max Output |
|----------|---------|------------|
| MiniMax-M2.7 | 1M | 128K |
| MiniMax-M2.5 | 1M | 128K |
| MiniMax-M2 | 1M | 128K |

The MiniMax adapter extends the Anthropic adapter with a `baseUrl` override pointing to `https://api.minimax.io/anthropic`. Request/response format, streaming events, and tool calling follow the Anthropic protocol exactly. The only behavioral difference is the temperature constraint: values of `0.0` must be clamped to `0.01`.

---

## AI Router

The router (`src/background/ai/router.ts`) orchestrates provider interaction:

1. **Provider selection**: Reads the active provider and model from settings. Falls back to a default if the configured provider is unreachable.

2. **Tool execution loop**: After each AI response, checks for `tool_use` stop reason. If present:
   - Extracts tool calls from the response
   - Dispatches each tool to the executor (`src/background/ai/tools/executor.ts`)
   - Appends tool results to the conversation
   - Re-sends to the AI provider
   - Repeats until the AI returns `end_turn` or the iteration cap is hit

3. **Iteration cap**: Maximum 10 tool-call round-trips per user message. If exceeded, the router returns the last AI response with an appended warning.

4. **Error handling**: Provider errors (network, auth, rate limit) are caught and returned as structured error responses. The UI displays these with appropriate messaging. HTTP 429 responses trigger exponential backoff (1s, 2s, 4s).

5. **Token usage logging**: Each response's `usage` field is accumulated per session and persisted to storage for display in the settings view.
