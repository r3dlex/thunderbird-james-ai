<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue"
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import AssistantAutoReplyPanel from "./components/AssistantAutoReplyPanel.vue"
import AssistantBatchOpsPanel from "./components/AssistantBatchOpsPanel.vue"
import AssistantFilterRulesPanel from "./components/AssistantFilterRulesPanel.vue"
import AssistantMessageBubble from "./components/AssistantMessageBubble.vue"
import { createMessengerBridge } from "../../lib/bridge.js"
import { streamChatMessages } from "../../lib/streaming.js"
import type { AIMessage, CorvusStreamChunk } from "../../lib/contracts.js"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

type AssistantPanel = "rules" | "batch" | "autoReply" | null

const SYSTEM_PROMPT = "You are Corvus, a general email assistant. You have tools to search, move, draft, tag, and organize emails. Confirm before any destructive or bulk operation (>10 emails)."

const bridge = createMessengerBridge()
const messages = ref<ChatMessage[]>([])
const inputText = ref("")
const activePanel = ref<AssistantPanel>(null)
const isStreaming = ref(false)
const statusMessage = ref("")
const messagesContainer = ref<HTMLElement | null>(null)

let stopStream: (() => void) | null = null

function openPanel(panel: Exclude<AssistantPanel, null>): void {
  statusMessage.value = ""
  activePanel.value = panel
}

function closePanel(): void {
  activePanel.value = null
}

function ensureAssistantDraft(): void {
  const lastMessage = messages.value.at(-1)

  if (!lastMessage || lastMessage.role !== "assistant") {
    messages.value = [...messages.value, { role: "assistant", content: "" }]
  }
}

function updateAssistantDraft(content: string): void {
  const updated = [...messages.value]
  updated[updated.length - 1] = { role: "assistant", content }
  messages.value = updated
}

async function scrollMessagesToBottom(): Promise<void> {
  await nextTick()

  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function handleStreamChunk(chunk: CorvusStreamChunk): void {
  if (chunk.type === "text") {
    const lastAssistantMessage = messages.value.at(-1)
    const currentText = lastAssistantMessage?.role === "assistant" ? lastAssistantMessage.content : ""
    updateAssistantDraft(`${currentText}${chunk.text ?? ""}`)
    void scrollMessagesToBottom()
    return
  }

  if (chunk.type === "tool_call" && chunk.toolCall?.name) {
    statusMessage.value = `Using tool: ${chunk.toolCall.name}`
    return
  }

  if (chunk.type === "error") {
    const errorText = chunk.error ?? "Assistant response failed"
    updateAssistantDraft(errorText)
    statusMessage.value = errorText
  }
}

async function sendMessage(): Promise<void> {
  const trimmed = inputText.value.trim()
  if (!trimmed || isStreaming.value) return

  closePanel()
  statusMessage.value = ""

  const nextConversation: ChatMessage[] = [...messages.value, { role: "user", content: trimmed }]
  messages.value = nextConversation
  inputText.value = ""
  ensureAssistantDraft()
  isStreaming.value = true
  await scrollMessagesToBottom()

  const aiMessages: AIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...nextConversation.map(message => ({ role: message.role, content: message.content })),
  ]

  stopStream?.()
  stopStream = streamChatMessages(bridge, aiMessages, {
    next: chunk => {
      handleStreamChunk(chunk)
    },
    complete: () => {
      isStreaming.value = false
      statusMessage.value = ""
    },
  })
}

onBeforeUnmount(() => {
  stopStream?.()
})
</script>

<template>
  <section class="flex h-full min-h-0 flex-col gap-3">
    <header class="rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/80 px-4 py-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-[var(--corvus-text)]">Assistant</h2>
          <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
            Search, organize, and automate email workflows without leaving the popup shell.
          </p>
        </div>
        <button v-if="activePanel" class="secondary text-xs" type="button" @click="closePanel">
          Back to chat
        </button>
      </div>

      <div class="mt-3 flex flex-wrap gap-2">
        <Button label="Filter Rules" size="small" :severity="activePanel === 'rules' ? 'primary' : 'secondary'" @click="openPanel('rules')" />
        <Button label="Batch Ops" size="small" :severity="activePanel === 'batch' ? 'primary' : 'secondary'" @click="openPanel('batch')" />
        <Button label="Auto-Reply" size="small" :severity="activePanel === 'autoReply' ? 'primary' : 'secondary'" @click="openPanel('autoReply')" />
      </div>
    </header>

    <AssistantFilterRulesPanel v-if="activePanel === 'rules'" />
    <AssistantBatchOpsPanel v-else-if="activePanel === 'batch'" />
    <AssistantAutoReplyPanel v-else-if="activePanel === 'autoReply'" />

    <template v-else>
      <div
        ref="messagesContainer"
        class="scroll-area flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/60 px-3 py-3"
      >
        <p v-if="messages.length === 0" class="rounded-xl border border-dashed border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-3 text-sm leading-6 text-[var(--corvus-text-secondary)]">
          Ask anything about your email. The assistant keeps rules, batch operations, and auto-reply guidance in the same internal state.
        </p>

        <AssistantMessageBubble
          v-for="(message, index) in messages"
          :key="`${message.role}-${index}`"
          :role="message.role"
          :content="message.content"
        />
      </div>

      <p v-if="statusMessage" class="text-xs text-[var(--corvus-text-secondary)]">{{ statusMessage }}</p>

      <form class="flex items-center gap-2" @submit.prevent="sendMessage">
        <InputText
          v-model="inputText"
          class="flex-1"
          :disabled="isStreaming"
          placeholder="Ask anything about your email…"
        />
        <Button type="submit" icon="pi pi-send" :disabled="!inputText.trim() || isStreaming" :loading="isStreaming" aria-label="Send assistant message" />
      </form>
    </template>
  </section>
</template>
