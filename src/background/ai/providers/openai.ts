/**
 * OpenAI provider adapter.
 * POST https://api.openai.com/v1/chat/completions
 */

import {
  AIProvider,
  type AIMessage,
  type AIResponse,
  type AIStreamChunk,
  type AIToolDefinition,
  type AIToolCall,
} from "./base"

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool"
  content?: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

interface OpenAITool {
  type: "function"
  function: { name: string; description: string; parameters: Record<string, unknown> }
}

export class OpenAIProvider extends AIProvider {
  private get baseUrl(): string {
    return this.config.baseUrl ?? "https://api.openai.com"
  }

  private get headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    }
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    const openaiMessages = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: openaiMessages,
    }

    if (tools?.length) {
      body.tools = this.convertTools(tools)
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return this.handleHttpError(response.status, await response.text())
    }

    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(messages: AIMessage[], tools?: AIToolDefinition[]): AsyncGenerator<AIStreamChunk> {
    const openaiMessages = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: openaiMessages,
      stream: true,
    }

    if (tools?.length) {
      body.tools = this.convertTools(tools)
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      yield { type: "error", error: this.handleHttpError(response.status, await response.text()).content }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: "error", error: "No response body" }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ""
    const toolCallBuffers: Map<number, { id: string; name: string; args: string }> = new Map()

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
            // Flush any pending tool calls
            for (const [, tc] of toolCallBuffers) {
              try {
                yield {
                  type: "tool_call",
                  toolCall: { id: tc.id, name: tc.name, arguments: JSON.parse(tc.args || "{}") },
                }
              } catch {
                yield { type: "error", error: "Failed to parse tool call arguments" }
              }
            }
            yield { type: "done" }
            return
          }

          try {
            const chunk = JSON.parse(data)
            const choice = chunk.choices?.[0]
            if (!choice) continue

            const delta = choice.delta
            if (delta?.content) {
              yield { type: "text", text: delta.content }
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0
                if (!toolCallBuffers.has(idx)) {
                  toolCallBuffers.set(idx, { id: tc.id ?? "", name: tc.function?.name ?? "", args: "" })
                }
                const buf = toolCallBuffers.get(idx)!
                if (tc.id) buf.id = tc.id
                if (tc.function?.name) buf.name = tc.function.name
                if (tc.function?.arguments) buf.args += tc.function.arguments
              }
            }

            if (choice.finish_reason === "stop" || choice.finish_reason === "tool_calls") {
              for (const [, tc] of toolCallBuffers) {
                try {
                  yield {
                    type: "tool_call",
                    toolCall: { id: tc.id, name: tc.name, arguments: JSON.parse(tc.args || "{}") },
                  }
                } catch {
                  yield { type: "error", error: "Failed to parse tool call arguments" }
                }
              }
              yield { type: "done" }
              return
            }
          } catch {
            // Skip unparseable
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: "done" }
  }

  private convertMessages(messages: AIMessage[]): OpenAIMessage[] {
    const result: OpenAIMessage[] = []

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        result.push({ role: msg.role as OpenAIMessage["role"], content: msg.content })
      } else {
        // Handle content blocks (tool results, tool calls)
        for (const block of msg.content) {
          if (block.type === "tool_result") {
            result.push({
              role: "tool",
              content: block.is_error ? `Error: ${block.content}` : block.content ?? "",
              tool_call_id: block.tool_use_id,
            })
          } else if (block.type === "tool_use") {
            // Assistant message with tool calls
            const existing = result[result.length - 1]
            if (existing?.role === "assistant") {
              existing.tool_calls = existing.tool_calls ?? []
              existing.tool_calls.push({
                id: block.id!,
                type: "function",
                function: { name: block.name!, arguments: JSON.stringify(block.input) },
              })
            } else {
              result.push({
                role: "assistant",
                content: null,
                tool_calls: [{
                  id: block.id!,
                  type: "function",
                  function: { name: block.name!, arguments: JSON.stringify(block.input) },
                }],
              })
            }
          } else if (block.type === "text" && block.text) {
            result.push({ role: msg.role as OpenAIMessage["role"], content: block.text })
          }
        }
      }
    }

    return result
  }

  private convertTools(tools: AIToolDefinition[]): OpenAITool[] {
    return tools.map(t => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
  }

  private parseResponse(data: Record<string, unknown>): AIResponse {
    const choices = data.choices as Array<Record<string, unknown>>
    const choice = choices?.[0]
    const message = choice?.message as Record<string, unknown>

    const text = (message?.content as string) ?? ""
    const toolCalls: AIToolCall[] = []

    const rawToolCalls = message?.tool_calls as Array<Record<string, unknown>> | undefined
    if (rawToolCalls) {
      for (const tc of rawToolCalls) {
        const fn = tc.function as Record<string, string>
        toolCalls.push({
          id: tc.id as string,
          name: fn.name,
          arguments: JSON.parse(fn.arguments || "{}"),
        })
      }
    }

    const usage = data.usage as Record<string, number> | undefined
    const finishReason = choice?.finish_reason as string

    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: usage ? {
        inputTokens: usage.prompt_tokens ?? 0,
        outputTokens: usage.completion_tokens ?? 0,
      } : undefined,
      stopReason: finishReason === "tool_calls" ? "tool_use"
        : finishReason === "length" ? "max_tokens"
        : "end",
    }
  }
}
