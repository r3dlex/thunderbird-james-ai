import { computed, ref } from "vue"
import type { AIMessage, CorvusStreamChunk } from "../../lib/contracts"

export const composeSystemPrompt =
  "You are Corvus, an email writing assistant. The user is composing an email. Apply the requested changes to improve the email. Return only the improved email body text, no explanations."

export interface ComposeStreamObserver {
  next(chunk: CorvusStreamChunk): void
  complete(): void
}

export interface ComposeAssistantDependencies {
  streamMessages(messages: AIMessage[], observer: ComposeStreamObserver): () => void
}

export function buildComposeMessages(instruction: string): AIMessage[] {
  return [
    {
      role: "system",
      content: composeSystemPrompt,
    },
    {
      role: "user",
      content: instruction,
    },
  ]
}

export function createComposeAssistantController(dependencies: ComposeAssistantDependencies) {
  const customInstruction = ref("")
  const isProcessing = ref(false)
  const lastResponse = ref("")
  const errorMessage = ref("")
  let stopActiveStream: (() => void) | null = null

  const clearPreview = (): void => {
    lastResponse.value = ""
    errorMessage.value = ""
  }

  const finishStreaming = (): void => {
    isProcessing.value = false
    stopActiveStream = null
  }

  const startInstruction = (instruction: string): boolean => {
    const trimmedInstruction = instruction.trim()
    if (!trimmedInstruction) return false

    stopActiveStream?.()
    clearPreview()
    isProcessing.value = true

    let responseText = ""
    stopActiveStream = dependencies.streamMessages(buildComposeMessages(trimmedInstruction), {
      next(chunk) {
        if (chunk.type === "text" && chunk.text) {
          responseText += chunk.text
          lastResponse.value = responseText
          return
        }

        if (chunk.type === "error") {
          errorMessage.value = chunk.error ?? "Compose preview failed"
        }
      },
      complete() {
        finishStreaming()
      },
    })

    return true
  }

  const applyQuickAction = (instruction: string): boolean => startInstruction(instruction)

  const applyCustomInstruction = (): boolean => {
    const nextInstruction = customInstruction.value.trim()
    if (!nextInstruction) return false

    customInstruction.value = ""
    return startInstruction(nextInstruction)
  }

  const stop = (): void => {
    stopActiveStream?.()
    finishStreaming()
  }

  return {
    customInstruction,
    errorMessage,
    hasPreview: computed(() => lastResponse.value.length > 0 || errorMessage.value.length > 0),
    isProcessing,
    lastResponse,
    applyCustomInstruction,
    applyQuickAction,
    stop,
  }
}
