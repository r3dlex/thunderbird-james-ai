<script setup lang="ts">
import type { ChatActionCard } from "../chatContracts.js"

defineProps<{
  actions: ChatActionCard[]
}>()
</script>

<template>
  <section class="space-y-2">
    <article
      v-for="action in actions"
      :key="action.id"
      class="rounded-2xl border border-dashed border-[var(--corvus-border)] bg-[var(--corvus-surface)]/70 px-3 py-2"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
        Tool call
      </p>
      <p class="mt-1 text-sm font-medium text-[var(--corvus-text)]">{{ action.label }}</p>
      <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">{{ action.summary }}</p>
    </article>
  </section>
</template>
