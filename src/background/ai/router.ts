/**
 * AI Router: provider selection, tool execution loop, error handling.
 */

import type {
  AIMessage,
  AIResponse,
  AIStreamChunk,
  AIToolDefinition,
  AIToolCall,
  AIProviderConfig,
  AIContentBlock,
} from "./types"
import { AIProvider } from "./types"
import { AnthropicProvider } from "./providers/anthropic"
import { OpenAIProvider } from "./providers/openai"
import { GeminiProvider } from "./providers/gemini"
import { MiniMaxProvider } from "./providers/minimax"
import { loadProviderConfig, getActiveProviderId } from "../storage/settings"
import { getAllTools, executeTool } from "./tools/registry"

const MAX_TOOL_ITERATIONS = 10

function createProvider(config: AIProviderConfig): AIProvider {
  switch (config.id) {
    case "anthropic":
      return new AnthropicProvider(config)
    case "openai":
      return new OpenAIProvider(config)
    case "gemini":
      return new GeminiProvider(config)
    case "minimax":
      return new MiniMaxProvider(config)
    default:
      throw new Error(`Unknown provider: ${config.id}`)
  }
}

export async function getActiveProvider(): Promise<AIProvider | null> {
  const activeId = await getActiveProviderId()
  if (!activeId) return null

  const config = await loadProviderConfig(activeId)
  if (!config) return null

  return createProvider(config)
}

/**
 * Run a chat with the active provider, handling tool execution loop.
 * Returns the final text response after all tool calls are resolved.
 */
export async function chat(
  messages: AIMessage[],
  tools?: AIToolDefinition[]
): Promise<AIResponse> {
  const provider = await getActiveProvider()
  if (!provider) {
    return { content: "No AI provider configured. Set one up in Settings.", stopReason: "error" }
  }

  const allTools = tools ?? getAllTools()
  const conversationMessages = [...messages]
  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    let response: AIResponse
    try {
      response = await provider.chat(conversationMessages, allTools)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      // Retry once after 2 seconds
      if (iterations === 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
          response = await provider.chat(conversationMessages, allTools)
        } catch {
          return {
            content: messenger.i18n.getMessage("errorNetwork"),
            stopReason: "error",
          }
        }
      } else {
        return { content: `Error: ${message}`, stopReason: "error" }
      }
    }

    // Log usage
    if (response.usage) {
      await logUsage(response.usage)
    }

    // No tool calls - return the text response
    if (!response.toolCalls?.length || response.stopReason !== "tool_use") {
      return response
    }

    // Execute tool calls and add results to conversation
    const assistantBlocks: AIContentBlock[] = []
    if (response.content) {
      assistantBlocks.push({ type: "text", text: response.content })
    }
    for (const tc of response.toolCalls) {
      assistantBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      })
    }
    conversationMessages.push({ role: "assistant", content: assistantBlocks })

    const toolResultBlocks: AIContentBlock[] = []
    for (const tc of response.toolCalls) {
      const result = await executeToolSafe(tc)
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: result.content,
        is_error: result.isError,
      })
    }
    conversationMessages.push({ role: "user", content: toolResultBlocks })
  }

  return {
    content: "Reached maximum tool execution iterations. Please try a simpler request.",
    stopReason: "error",
  }
}

/**
 * Stream a chat response. Yields text chunks. Handles tool calls internally
 * by collecting them, executing, and re-streaming.
 */
export async function* streamChat(
  messages: AIMessage[],
  tools?: AIToolDefinition[]
): AsyncGenerator<AIStreamChunk> {
  const provider = await getActiveProvider()
  if (!provider) {
    yield { type: "error", error: "No AI provider configured. Set one up in Settings." }
    return
  }

  const allTools = tools ?? getAllTools()
  const conversationMessages = [...messages]
  let iterations = 0

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    const pendingToolCalls: AIToolCall[] = []

    try {
      for await (const chunk of provider.stream(conversationMessages, allTools)) {
        if (chunk.type === "text") {
          yield chunk
        } else if (chunk.type === "tool_call" && chunk.toolCall) {
          pendingToolCalls.push(chunk.toolCall)
        } else if (chunk.type === "error") {
          yield chunk
          return
        } else if (chunk.type === "done") {
          if (pendingToolCalls.length === 0) {
            yield { type: "done" }
            return
          }
        }
      }
    } catch {
      yield { type: "error", error: messenger.i18n.getMessage("errorNetwork") }
      return
    }

    if (pendingToolCalls.length === 0) {
      yield { type: "done" }
      return
    }

    // Add assistant message with tool calls
    const assistantBlocks: AIContentBlock[] = []
    for (const tc of pendingToolCalls) {
      assistantBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      })
    }
    conversationMessages.push({ role: "assistant", content: assistantBlocks })

    // Execute tools and add results
    const toolResultBlocks: AIContentBlock[] = []
    for (const tc of pendingToolCalls) {
      const result = await executeToolSafe(tc)
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: result.content,
        is_error: result.isError,
      })
    }
    conversationMessages.push({ role: "user", content: toolResultBlocks })
  }

  yield { type: "error", error: "Reached maximum tool execution iterations." }
}

async function executeToolSafe(toolCall: AIToolCall): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await executeTool(toolCall.name, toolCall.arguments)
    return { content: JSON.stringify(result), isError: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed"
    return { content: message, isError: true }
  }
}

async function logUsage(usage: { inputTokens: number; outputTokens: number }): Promise<void> {
  try {
    const data = await messenger.storage.local.get("corvus_usage")
    const current = (data.corvus_usage as Record<string, number>) ?? {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
    }
    current.totalInputTokens = (current.totalInputTokens ?? 0) + usage.inputTokens
    current.totalOutputTokens = (current.totalOutputTokens ?? 0) + usage.outputTokens
    current.sessionInputTokens = (current.sessionInputTokens ?? 0) + usage.inputTokens
    current.sessionOutputTokens = (current.sessionOutputTokens ?? 0) + usage.outputTokens
    await messenger.storage.local.set({ corvus_usage: current })
  } catch {
    // Non-critical, ignore
  }
}
