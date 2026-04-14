import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from "vue"
import { createMessengerBridge } from "../../lib/bridge.js"
import { streamChatMessages } from "../../lib/streaming.js"
import type { CorvusPage } from "../../composables/usePage"
import type { CorvusStreamChunk } from "../../lib/contracts.js"
import {
  buildChatPrompt,
  mapToolCallToActionCard,
  parseEmailContext,
  type ChatActionCard,
  type ChatMessage,
  type EmailContextSummary,
} from "./chatContracts.js"

export interface ChatSessionState {
  emailContext: Ref<EmailContextSummary | null>
  messages: Ref<ChatMessage[]>
  currentActions: Ref<ChatActionCard[]>
  inputText: Ref<string>
  isStreaming: Ref<boolean>
  errorMessage: Ref<string>
  hasConversation: ComputedRef<boolean>
  canSend: ComputedRef<boolean>
  sendMessage(): void
  setInputText(value: string): void
}

const bridge = createMessengerBridge()

const emailContext = ref<EmailContextSummary | null>(null)
const threadContext = ref("")
const messages = ref<ChatMessage[]>([])
const currentActions = ref<ChatActionCard[]>([])
const inputText = ref("")
const isStreaming = ref(false)
const errorMessage = ref("")

let messageCounter = 0
let stopStreaming: (() => void) | null = null

function nextMessageId(prefix: string): string {
  messageCounter += 1
  return `${prefix}-${messageCounter}`
}

function replaceLastAssistantMessage(content: string): void {
  const lastMessage = messages.value.at(-1)
  if (!lastMessage || lastMessage.role !== "assistant") return

  messages.value = [
    ...messages.value.slice(0, -1),
    {
      ...lastMessage,
      content,
    },
  ]
}

function finishStreaming(): void {
  isStreaming.value = false
  stopStreaming = null
}

async function loadEmailContext(): Promise<void> {
  try {
    const response = await bridge.send("getMessageContext", { tabId: 0 })
    const parsed = parseEmailContext(response)
    emailContext.value = parsed.emailContext
    threadContext.value = parsed.threadContext
  } catch {
    emailContext.value = null
    threadContext.value = ""
  }
}

function consumeChunk(chunk: CorvusStreamChunk): void {
  if (chunk.type === "text" && chunk.text) {
    replaceLastAssistantMessage(`${messages.value.at(-1)?.content ?? ""}${chunk.text}`)
    return
  }

  if (chunk.type === "tool_call" && chunk.toolCall) {
    const nextAction = mapToolCallToActionCard(chunk.toolCall)
    currentActions.value = [...currentActions.value.filter(action => action.id !== nextAction.id), nextAction]
    return
  }

  if (chunk.type === "error") {
    errorMessage.value = chunk.error ?? "The assistant could not finish this response."
    if ((messages.value.at(-1)?.content ?? "").trim().length === 0) {
      replaceLastAssistantMessage(errorMessage.value)
    }
  }
}

function sendMessage(): void {
  const text = inputText.value.trim()
  if (!text || isStreaming.value) return

  errorMessage.value = ""
  currentActions.value = []
  inputText.value = ""

  const nextMessages = [
    ...messages.value,
    {
      id: nextMessageId("user"),
      role: "user" as const,
      content: text,
    },
    {
      id: nextMessageId("assistant"),
      role: "assistant" as const,
      content: "",
    },
  ]

  messages.value = nextMessages
  isStreaming.value = true

  stopStreaming?.()
  stopStreaming = streamChatMessages(
    bridge,
    buildChatPrompt(nextMessages.slice(0, -1), emailContext.value, threadContext.value),
    {
      next: consumeChunk,
      complete: finishStreaming,
    },
  )
}

function setInputText(value: string): void {
  inputText.value = value
}

export function useChatSession(page: CorvusPage): ChatSessionState {
  onMounted(() => {
    if (page === "chat" || page === "msgDisplay") {
      void loadEmailContext()
    }
  })

  onUnmounted(() => {
    stopStreaming?.()
    stopStreaming = null
  })

  return {
    emailContext,
    messages,
    currentActions,
    inputText,
    isStreaming,
    errorMessage,
    hasConversation: computed(() => messages.value.length > 0),
    canSend: computed(() => inputText.value.trim().length > 0 && !isStreaming.value),
    sendMessage,
    setInputText,
  }
}
