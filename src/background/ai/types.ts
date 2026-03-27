/**
 * Shared AI types used across all providers.
 */

export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string | AIContentBlock[]
}

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

export interface AIToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AIToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AIResponse {
  content: string
  toolCalls?: AIToolCall[]
  usage?: { inputTokens: number; outputTokens: number }
  stopReason: "end" | "tool_use" | "max_tokens" | "error"
}

export interface AIStreamChunk {
  type: "text" | "tool_call" | "done" | "error"
  text?: string
  toolCall?: AIToolCall
  error?: string
}

export type ProviderId = "anthropic" | "openai" | "gemini" | "minimax"

export interface AIProviderConfig {
  id: ProviderId
  displayName: string
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens: number
  temperature: number
}

export abstract class AIProvider {
  constructor(protected config: AIProviderConfig) {}

  abstract chat(
    messages: AIMessage[],
    tools?: AIToolDefinition[]
  ): Promise<AIResponse>

  abstract stream(
    messages: AIMessage[],
    tools?: AIToolDefinition[]
  ): AsyncGenerator<AIStreamChunk>

  protected handleHttpError(status: number, body: string): AIResponse {
    if (status === 401 || status === 403) {
      return {
        content: messenger.i18n.getMessage("errorAuth"),
        stopReason: "error",
      }
    }
    if (status === 429) {
      const retryAfter = this.parseRetryAfter(body)
      return {
        content: messenger.i18n.getMessage("errorRateLimit", [String(retryAfter)]),
        stopReason: "error",
      }
    }
    return {
      content: `Provider error (${status}): ${this.extractErrorMessage(body)}`,
      stopReason: "error",
    }
  }

  protected parseRetryAfter(body: string): number {
    try {
      const parsed = JSON.parse(body)
      return parsed?.error?.retry_after ?? parsed?.retry_after ?? 30
    } catch {
      return 30
    }
  }

  protected extractErrorMessage(body: string): string {
    try {
      const parsed = JSON.parse(body)
      return parsed?.error?.message ?? parsed?.message ?? body.slice(0, 200)
    } catch {
      return body.slice(0, 200)
    }
  }
}
