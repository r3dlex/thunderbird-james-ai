/**
 * Source-backed UI/runtime contract matrix.
 *
 * These types intentionally mirror the public message and streaming shapes
 * exposed by `src/background/index.ts` and the background modules it wires in.
 * They live in the UI package so Vue/Vite type-checking does not have to pull
 * background sources across the `src/ui` package boundary.
 */

export const CORVUS_RUNTIME_SOURCE = "src/background/index.ts" as const
export const CORVUS_STREAM_PORT_NAME = "corvus-stream" as const

/** Mirrors `src/background/ai/types.ts`. */
export type ProviderId = "anthropic" | "openai" | "gemini" | "minimax"

/** Mirrors `src/background/ai/types.ts`. */
export interface AIContentBlock {
  type: "text" | "tool_use" | "tool_result"
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
}

/** Mirrors `src/background/ai/types.ts`. */
export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string | AIContentBlock[]
}

/** Mirrors `src/background/ai/types.ts`. */
export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** Mirrors `src/background/ai/types.ts`. */
export interface AIResponse {
  content: string
  toolCalls?: AIToolCall[]
  usage?: { inputTokens: number; outputTokens: number }
  stopReason: "end" | "tool_use" | "max_tokens" | "error"
}

/** Mirrors `src/background/ai/types.ts`. */
export type CorvusStreamChunk =
  | { type: "text"; text?: string }
  | { type: "tool_call"; toolCall?: AIToolCall }
  | { type: "done" }
  | { type: "error"; error?: string }

/** Mirrors `src/background/ai/types.ts`. */
export interface AIProviderConfig {
  id: ProviderId
  displayName: string
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens: number
  temperature: number
}

/** Mirrors `src/background/context/attachment-reader.ts`. */
export interface AttachmentInfo {
  name: string
  contentType: string
  size: number
}

/** Mirrors `src/background/context/message-reader.ts`. */
export interface MessageContext {
  id: number
  subject: string
  from: string
  to: string[]
  cc: string[]
  date: string
  body: string
  headerMessageId: string
  references: string[]
}

/** Mirrors `src/background/rules/types.ts`. */
export interface LLMClassificationConfig {
  classificationPrompt: string
  matchLabels: string[]
}

/** Mirrors `src/background/rules/types.ts`. */
export interface RuleCondition {
  field: "from" | "to" | "cc" | "subject" | "body" | "hasAttachment" | "llmClassification"
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "matches" | "exists"
  value: string
  caseSensitive: boolean
}

/** Mirrors `src/background/rules/types.ts`. */
export interface RuleAction {
  type: "move" | "tag" | "flag" | "markRead" | "autoReply" | "forward" | "notify"
  params: Record<string, string>
}

/** Mirrors `src/background/rules/types.ts`. */
export interface CorvusRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditions: RuleCondition[]
  actions: RuleAction[]
  createdAt: string
  lastTriggeredAt?: string
  triggerCount: number
  llmClassification?: LLMClassificationConfig
}

export interface MessageThreadSummary {
  messages: MessageContext[]
  totalCount: number
  formatted: string
}

export interface CacheStats {
  entries: number
  sizeEstimate: number
}

export interface UsageStats {
  totalInputTokens: number
  totalOutputTokens: number
  sessionInputTokens: number
  sessionOutputTokens: number
}

export type GetMessageContextResponse =
  | {
      error: string
      message?: undefined
      thread?: undefined
      attachments?: undefined
    }
  | {
      error?: undefined
      message: MessageContext
      thread: MessageThreadSummary
      attachments: AttachmentInfo[]
    }

export interface CorvusMessageContracts {
  chat: {
    payload: { messages: AIMessage[] }
    response: { response: AIResponse }
  }
  getMessageContext: {
    payload: { tabId: number }
    response: GetMessageContextResponse
  }
  unlockSession: {
    payload: { passphrase: string }
    response: { success: boolean }
  }
  isSessionUnlocked: {
    payload: undefined
    response: { unlocked: boolean }
  }
  lockSession: {
    payload: undefined
    response: { ok: true }
  }
  getActiveProvider: {
    payload: undefined
    response: { providerId: ProviderId | null }
  }
  setActiveProvider: {
    payload: { id: ProviderId }
    response: { ok: true }
  }
  loadProviderConfigs: {
    payload: undefined
    response: { configs: AIProviderConfig[] }
  }
  saveProviderConfig: {
    payload: AIProviderConfig
    response: { ok: true }
  }
  removeProviderConfig: {
    payload: { id: ProviderId }
    response: { ok: true }
  }
  testProviderConnection: {
    payload: { providerId: ProviderId }
    response: { success: boolean; response?: string; error?: string }
  }
  loadRules: {
    payload: undefined
    response: { rules: CorvusRule[] }
  }
  addRule: {
    payload: CorvusRule
    response: { ok: true }
  }
  updateRule: {
    payload: CorvusRule
    response: { ok: true }
  }
  removeRule: {
    payload: { id: string }
    response: { ok: true }
  }
  toggleRule: {
    payload: { id: string; enabled: boolean }
    response: { ok: true }
  }
  isFirstRunAcknowledged: {
    payload: undefined
    response: { acknowledged: boolean }
  }
  acknowledgeFirstRun: {
    payload: undefined
    response: { ok: true }
  }
  getCacheStats: {
    payload: undefined
    response: { stats: CacheStats }
  }
  clearCache: {
    payload: undefined
    response: { ok: true }
  }
  getUsage: {
    payload: undefined
    response: { usage: UsageStats }
  }
}

export type CorvusMessageType = keyof CorvusMessageContracts
export type CorvusMessagePayload<T extends CorvusMessageType> = CorvusMessageContracts[T]["payload"]
export type CorvusMessageResponse<T extends CorvusMessageType> = CorvusMessageContracts[T]["response"]

export type CorvusMessageEnvelope<T extends CorvusMessageType = CorvusMessageType> = {
  [K in T]: [CorvusMessagePayload<K>] extends [undefined]
    ? { type: K; payload?: undefined }
    : { type: K; payload: CorvusMessagePayload<K> }
}[T]

export interface CorvusPortContracts {
  streamChat: {
    portName: typeof CORVUS_STREAM_PORT_NAME
    payload: { messages: AIMessage[] }
    chunk: CorvusStreamChunk
  }
}

export type CorvusPortMessageType = keyof CorvusPortContracts
export type CorvusPortPayload<T extends CorvusPortMessageType> = CorvusPortContracts[T]["payload"]
export type CorvusPortChunk<T extends CorvusPortMessageType> = CorvusPortContracts[T]["chunk"]

export type CorvusPortEnvelope<T extends CorvusPortMessageType = CorvusPortMessageType> = {
  [K in T]: { type: K; payload: CorvusPortPayload<K> }
}[T]

export const CORVUS_MESSAGE_TYPES = [
  "chat",
  "getMessageContext",
  "unlockSession",
  "isSessionUnlocked",
  "lockSession",
  "getActiveProvider",
  "setActiveProvider",
  "loadProviderConfigs",
  "saveProviderConfig",
  "removeProviderConfig",
  "testProviderConnection",
  "loadRules",
  "addRule",
  "updateRule",
  "removeRule",
  "toggleRule",
  "isFirstRunAcknowledged",
  "acknowledgeFirstRun",
  "getCacheStats",
  "clearCache",
  "getUsage",
] as const satisfies readonly CorvusMessageType[]

export const CORVUS_MESSAGE_MATRIX = {
  chat: { transport: "runtime.sendMessage", sourceCase: "chat" },
  getMessageContext: { transport: "runtime.sendMessage", sourceCase: "getMessageContext" },
  unlockSession: { transport: "runtime.sendMessage", sourceCase: "unlockSession" },
  isSessionUnlocked: { transport: "runtime.sendMessage", sourceCase: "isSessionUnlocked" },
  lockSession: { transport: "runtime.sendMessage", sourceCase: "lockSession" },
  getActiveProvider: { transport: "runtime.sendMessage", sourceCase: "getActiveProvider" },
  setActiveProvider: { transport: "runtime.sendMessage", sourceCase: "setActiveProvider" },
  loadProviderConfigs: { transport: "runtime.sendMessage", sourceCase: "loadProviderConfigs" },
  saveProviderConfig: { transport: "runtime.sendMessage", sourceCase: "saveProviderConfig" },
  removeProviderConfig: { transport: "runtime.sendMessage", sourceCase: "removeProviderConfig" },
  testProviderConnection: { transport: "runtime.sendMessage", sourceCase: "testProviderConnection" },
  loadRules: { transport: "runtime.sendMessage", sourceCase: "loadRules" },
  addRule: { transport: "runtime.sendMessage", sourceCase: "addRule" },
  updateRule: { transport: "runtime.sendMessage", sourceCase: "updateRule" },
  removeRule: { transport: "runtime.sendMessage", sourceCase: "removeRule" },
  toggleRule: { transport: "runtime.sendMessage", sourceCase: "toggleRule" },
  isFirstRunAcknowledged: { transport: "runtime.sendMessage", sourceCase: "isFirstRunAcknowledged" },
  acknowledgeFirstRun: { transport: "runtime.sendMessage", sourceCase: "acknowledgeFirstRun" },
  getCacheStats: { transport: "runtime.sendMessage", sourceCase: "getCacheStats" },
  clearCache: { transport: "runtime.sendMessage", sourceCase: "clearCache" },
  getUsage: { transport: "runtime.sendMessage", sourceCase: "getUsage" },
} as const satisfies { [K in CorvusMessageType]: { transport: "runtime.sendMessage"; sourceCase: K } }

export const CORVUS_STREAM_CHUNK_TYPES = ["text", "tool_call", "done", "error"] as const satisfies readonly CorvusStreamChunk["type"][]

export const CORVUS_STREAM_MATRIX = {
  streamChat: {
    transport: "runtime.connect",
    portName: CORVUS_STREAM_PORT_NAME,
    sourceCase: "streamChat",
    terminalChunks: ["done", "error"],
  },
} as const satisfies {
  streamChat: {
    transport: "runtime.connect"
    portName: typeof CORVUS_STREAM_PORT_NAME
    sourceCase: "streamChat"
    terminalChunks: readonly ["done", "error"]
  }
}

export function isTerminalStreamChunk(chunk: CorvusStreamChunk): boolean {
  return chunk.type === "done" || chunk.type === "error"
}
