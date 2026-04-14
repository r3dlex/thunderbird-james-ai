<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import Button from "primevue/button"
import Tag from "primevue/tag"
import type { CorvusPage } from "../../composables/usePage"
import ActionCards from "./components/ActionCards.vue"
import ContextCard from "./components/ContextCard.vue"
import MessageBubble from "./components/MessageBubble.vue"
import StreamingIndicator from "./components/StreamingIndicator.vue"
import { useChatSession } from "./useChatSession.js"

const props = defineProps<{
  page: Extract<CorvusPage, "chat" | "msgDisplay">
}>()

const {
  emailContext,
  messages,
  currentActions,
  inputText,
  isStreaming,
  errorMessage,
  hasConversation,
  canSend,
  sendMessage,
  setInputText,
} = useChatSession(props.page)

const messagesContainer = ref<HTMLElement | null>(null)

const title = computed(() => props.page === "msgDisplay" ? "Contextual email chat" : "Corvus assistant")
const subtitle = computed(() => props.page === "msgDisplay"
  ? "Ask about the displayed email, summarize the thread, or draft a reply."
  : "General chat stays on the popup shell while message-aware context loads when available.")

function scrollToBottom(): void {
  nextTick(() => {
    const element = messagesContainer.value
    if (!element) return
    element.scrollTop = element.scrollHeight
  })
}

function onSubmit(): void {
  sendMessage()
  scrollToBottom()
}

function onComposerKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey) return
  event.preventDefault()
  onSubmit()
}

watch(
  () => [messages.value.length, isStreaming.value, currentActions.value.length] as const,
  () => {
    scrollToBottom()
  },
)
</script>

<template>
  <section class="flex h-full flex-col">
    <header class="border-b border-[var(--corvus-border)] px-4 py-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--corvus-text-secondary)]">
            {{ page === "msgDisplay" ? "message display" : "popup chat" }}
          </p>
          <h1 class="mt-1 text-lg font-semibold text-[var(--corvus-text)]">{{ title }}</h1>
          <p class="mt-1 text-sm text-[var(--corvus-text-secondary)]">{{ subtitle }}</p>
        </div>
        <Tag :value="page" severity="secondary" />
      </div>
    </header>

    <div ref="messagesContainer" class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
      <ContextCard v-if="emailContext" :context="emailContext" :page="page" />

      <div
        v-if="!hasConversation"
        class="rounded-2xl border border-dashed border-[var(--corvus-border)] bg-[var(--corvus-surface)]/60 px-4 py-4 text-sm leading-6 text-[var(--corvus-text-secondary)]"
      >
        <p class="font-medium text-[var(--corvus-text)]">Start with a focused prompt</p>
        <p class="mt-2">
          Try “Summarize the thread”, “Draft a reply accepting the proposal”, or “What action items are in this email?”
        </p>
      </div>

      <MessageBubble
        v-for="message in messages"
        :key="message.id"
        :role="message.role"
        :content="message.content"
      />

      <ActionCards v-if="currentActions.length > 0" :actions="currentActions" />

      <StreamingIndicator v-if="isStreaming" />

      <div
        v-if="errorMessage"
        class="rounded-2xl border border-[var(--corvus-error)]/25 bg-[var(--corvus-error)]/10 px-3 py-2 text-sm text-[var(--corvus-text)]"
      >
        {{ errorMessage }}
      </div>
    </div>

    <footer class="border-t border-[var(--corvus-border)] px-4 py-3">
      <div class="rounded-2xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)] px-3 py-3">
        <label class="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]" for="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          class="min-h-24 w-full resize-none rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-2 text-sm text-[var(--corvus-text)] outline-none transition focus:border-[var(--corvus-accent)]"
          :disabled="isStreaming"
          :value="inputText"
          placeholder="Type a message…"
          @input="setInputText(($event.target as HTMLTextAreaElement).value)"
          @keydown="onComposerKeydown"
        />

        <div class="mt-3 flex items-center justify-between gap-3">
          <p class="text-xs text-[var(--corvus-text-secondary)]">
            Enter sends. Shift+Enter adds a newline.
          </p>
          <Button
            label="Send"
            icon="pi pi-send"
            size="small"
            :disabled="!canSend"
            @click="onSubmit"
          />
        </div>
      </div>
    </footer>
  </section>
</template>
