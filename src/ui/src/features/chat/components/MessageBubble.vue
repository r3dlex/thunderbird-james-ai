<script setup lang="ts">
import { computed } from "vue"
import { renderMarkdownToHtml } from "../chatContracts.js"

const props = defineProps<{
  role: "user" | "assistant"
  content: string
}>()

const renderedContent = computed(() => renderMarkdownToHtml(props.content))
</script>

<template>
  <article
    class="max-w-[94%] rounded-2xl px-3 py-2 shadow-sm"
    :class="role === 'user'
      ? 'ml-auto bg-[var(--corvus-user-bubble)] text-[var(--corvus-user-text,var(--corvus-bg))]'
      : 'mr-auto border border-[var(--corvus-border)] bg-[var(--corvus-ai-bubble)] text-[var(--corvus-text)]'"
  >
    <p
      class="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
      :class="role === 'user' ? 'text-[color-mix(in_srgb,var(--corvus-bg)_80%,transparent)]' : 'text-[var(--corvus-text-secondary)]'"
    >
      {{ role === "user" ? "You" : "Assistant" }}
    </p>
    <div class="corvus-markdown text-sm leading-6" v-html="renderedContent" />
  </article>
</template>

<style scoped>
.corvus-markdown :deep(*) {
  word-break: break-word;
}

.corvus-markdown :deep(:first-child) {
  margin-top: 0;
}

.corvus-markdown :deep(:last-child) {
  margin-bottom: 0;
}

.corvus-markdown :deep(code) {
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--corvus-surface-raised) 84%, transparent);
  padding: 0.12rem 0.35rem;
  font-family: var(--corvus-font-mono);
  font-size: 0.9em;
}

.corvus-markdown :deep(pre) {
  overflow-x: auto;
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--corvus-surface-raised) 88%, transparent);
  padding: 0.75rem;
}
</style>
