<script setup lang="ts">
defineProps<{
  role: "user" | "assistant"
  content: string
}>()
</script>

<template>
  <article
    class="max-w-[95%] rounded-xl px-3 py-2"
    :class="role === 'user'
      ? 'self-end bg-[var(--corvus-user-bubble)] text-white'
      : 'self-start bg-[var(--corvus-ai-bubble)] text-[var(--corvus-text)]'"
  >
    <p
      class="mb-1 text-[11px] font-semibold"
      :class="role === 'user' ? 'text-white/80' : 'text-[var(--corvus-text-secondary)]'"
    >
      {{ role === "user" ? "You" : "Assistant" }}
    </p>
    <p class="whitespace-pre-wrap break-words leading-5">{{ content }}</p>
  </article>
</template>
