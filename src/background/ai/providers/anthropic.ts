/**
 * Anthropic (Claude) provider adapter.
 * POST https://api.anthropic.com/v1/messages
 */

import {
  AIProvider,
  type AIMessage,
  type AIResponse,
  type AIStreamChunk,
  type AIToolDefinition,
  type AIToolCall,
} from "./base"

interface AnthropicMessage {
  role: "user" | "assistant"
  content: string | AnthropicContentBlock[]
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result"
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string
  is_error?: boolean
}

interface AnthropicTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

export class AnthropicProvider extends AIProvider {
  protected get baseUrl(): string {
    return this.config.baseUrl ?? "https://api.anthropic.com"
  }

  protected get headers(): Record<string, string> {
    return {
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    }
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    const { systemPrompt, anthropicMessages } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: anthropicMessages,
    }

    if (systemPrompt) {
      body.system = systemPrompt
    }

    if (tools?.length) {
      body.tools = this.convertTools(tools)
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return this.handleHttpError(response.status, errorBody)
    }

    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(messages: AIMessage[], tools?: AIToolDefinition[]): AsyncGenerator<AIStreamChunk> {
    const { systemPrompt, anthropicMessages } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: anthropicMessages,
      stream: true,
    }

    if (systemPrompt) {
      body.system = systemPrompt
    }

    if (tools?.length) {
      body.tools = this.convertTools(tools)
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      yield { type: "error", error: this.handleHttpError(response.status, errorBody).content }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: "error", error: "No response body" }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""
    let currentToolCall: Partial<AIToolCall> | null = null
    let toolCallJson = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") {
            yield { type: "done" }
            return
          }

          try {
            const event = JSON.parse(data)

            if (event.type === "content_block_start") {
              if (event.content_block?.type === "tool_use") {
                currentToolCall = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                }
                toolCallJson = ""
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta?.type === "text_delta" && event.delta.text) {
                yield { type: "text", text: event.delta.text }
              } else if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
                toolCallJson += event.delta.partial_json
              }
            } else if (event.type === "content_block_stop") {
              if (currentToolCall?.id && currentToolCall?.name) {
                try {
                  const args = toolCallJson ? JSON.parse(toolCallJson) : {}
                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: currentToolCall.id,
                      name: currentToolCall.name,
                      arguments: args,
                    },
                  }
                } catch {
                  yield { type: "error", error: "Failed to parse tool call arguments" }
                }
                currentToolCall = null
                toolCallJson = ""
              }
            } else if (event.type === "message_stop") {
              yield { type: "done" }
              return
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: "done" }
  }

  protected convertMessages(messages: AIMessage[]): {
    systemPrompt: string | null
    anthropicMessages: AnthropicMessage[]
  } {
    let systemPrompt: string | null = null
    const anthropicMessages: AnthropicMessage[] = []

    for (const msg of messages) {
      if (msg.role === "system") {
        systemPrompt = typeof msg.content === "string" ? msg.content : ""
        continue
      }

      if (typeof msg.content === "string") {
        anthropicMessages.push({ role: msg.role, content: msg.content })
      } else {
        const blocks: AnthropicContentBlock[] = msg.content.map(block => {
          if (block.type === "tool_result") {
            return {
              type: "tool_result" as const,
              tool_use_id: block.tool_use_id,
              content: block.content,
              is_error: block.is_error,
            }
          }
          if (block.type === "tool_use") {
            return {
              type: "tool_use" as const,
              id: block.id,
              name: block.name,
              input: block.input,
            }
          }
          return { type: "text" as const, text: block.text }
        })
        anthropicMessages.push({ role: msg.role, content: blocks })
      }
    }

    return { systemPrompt, anthropicMessages }
  }

  private convertTools(tools: AIToolDefinition[]): AnthropicTool[] {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))
  }

  private parseResponse(data: Record<string, unknown>): AIResponse {
    const content = data.content as Array<Record<string, unknown>>
    let text = ""
    const toolCalls: AIToolCall[] = []

    for (const block of content ?? []) {
      if (block.type === "text") {
        text += block.text as string
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id as string,
          name: block.name as string,
          arguments: block.input as Record<string, unknown>,
        })
      }
    }

    const usage = data.usage as Record<string, number> | undefined
    const stopReason = data.stop_reason as string

    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: usage ? {
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
      } : undefined,
      stopReason: stopReason === "tool_use" ? "tool_use"
        : stopReason === "max_tokens" ? "max_tokens"
        : "end",
    }
  }
}
