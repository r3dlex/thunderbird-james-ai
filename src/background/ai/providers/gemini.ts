/**
 * Google Gemini provider adapter.
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 */

import {
  AIProvider,
  type AIMessage,
  type AIResponse,
  type AIStreamChunk,
  type AIToolDefinition,
  type AIToolCall,
} from "./base"

interface GeminiContent {
  role: "user" | "model" | "function"
  parts: GeminiPart[]
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } }

export class GeminiProvider extends AIProvider {
  private get baseUrl(): string {
    return this.config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta"
  }

  async chat(messages: AIMessage[], tools?: AIToolDefinition[]): Promise<AIResponse> {
    const { systemInstruction, contents } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    if (tools?.length) {
      body.tools = [{ functionDeclarations: this.convertTools(tools) }]
    }

    const url = `${this.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      return this.handleHttpError(response.status, await response.text())
    }

    const data = await response.json()
    return this.parseResponse(data)
  }

  async *stream(messages: AIMessage[], tools?: AIToolDefinition[]): AsyncGenerator<AIStreamChunk> {
    const { systemInstruction, contents } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      },
    }

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] }
    }

    if (tools?.length) {
      body.tools = [{ functionDeclarations: this.convertTools(tools) }]
    }

    const url = `${this.baseUrl}/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

          try {
            const event = JSON.parse(data)
            const candidate = event.candidates?.[0]
            if (!candidate?.content?.parts) continue

            for (const part of candidate.content.parts) {
              if ("text" in part) {
                yield { type: "text", text: part.text }
              } else if ("functionCall" in part) {
                yield {
                  type: "tool_call",
                  toolCall: {
                    id: `gemini_${Date.now()}_${part.functionCall.name}`,
                    name: part.functionCall.name,
                    arguments: part.functionCall.args ?? {},
                  },
                }
              }
            }

            if (candidate.finishReason) {
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

  private convertMessages(messages: AIMessage[]): {
    systemInstruction: string | null
    contents: GeminiContent[]
  } {
    let systemInstruction: string | null = null
    const contents: GeminiContent[] = []

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = typeof msg.content === "string" ? msg.content : ""
        continue
      }

      if (typeof msg.content === "string") {
        const role = msg.role === "assistant" ? "model" : "user"
        contents.push({ role, parts: [{ text: msg.content }] })
      } else {
        const parts: GeminiPart[] = []
        let role: GeminiContent["role"] = msg.role === "assistant" ? "model" : "user"

        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            parts.push({ text: block.text })
          } else if (block.type === "tool_use" && block.name) {
            parts.push({
              functionCall: {
                name: block.name,
                args: block.input ?? {},
              },
            })
          } else if (block.type === "tool_result") {
            role = "function"
            parts.push({
              functionResponse: {
                name: block.tool_use_id ?? "unknown",
                response: {
                  result: block.content,
                  error: block.is_error ? true : undefined,
                },
              },
            })
          }
        }

        if (parts.length > 0) {
          contents.push({ role, parts })
        }
      }
    }

    return { systemInstruction, contents }
  }

  private convertTools(tools: AIToolDefinition[]): Array<Record<string, unknown>> {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }))
  }

  private parseResponse(data: Record<string, unknown>): AIResponse {
    const candidates = data.candidates as Array<Record<string, unknown>> | undefined
    const candidate = candidates?.[0]
    const content = candidate?.content as Record<string, unknown> | undefined
    const parts = content?.parts as Array<Record<string, unknown>> | undefined

    let text = ""
    const toolCalls: AIToolCall[] = []

    for (const part of parts ?? []) {
      if ("text" in part) {
        text += part.text as string
      } else if ("functionCall" in part) {
        const fc = part.functionCall as Record<string, unknown>
        toolCalls.push({
          id: `gemini_${Date.now()}_${fc.name}`,
          name: fc.name as string,
          arguments: (fc.args as Record<string, unknown>) ?? {},
        })
      }
    }

    const usageMetadata = data.usageMetadata as Record<string, number> | undefined
    const finishReason = candidate?.finishReason as string | undefined

    return {
      content: text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: usageMetadata ? {
        inputTokens: usageMetadata.promptTokenCount ?? 0,
        outputTokens: usageMetadata.candidatesTokenCount ?? 0,
      } : undefined,
      stopReason: finishReason === "MAX_TOKENS" ? "max_tokens"
        : toolCalls.length > 0 ? "tool_use"
        : "end",
    }
  }
}
