<script setup lang="ts">
import { computed } from "vue"
import Tag from "primevue/tag"
import type { CorvusPage } from "../../../composables/usePage"
import type { EmailContextSummary } from "../chatContracts.js"

const props = defineProps<{
  context: EmailContextSummary
  page: CorvusPage
}>()

const attachmentLabel = computed(() => {
  const count = props.context.attachments.length
  return count === 1 ? "1 attachment" : `${count} attachments`
})
</script>

<template>
  <section class="rounded-2xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)] px-3 py-3">
    <div class="mb-2 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
          {{ page === "msgDisplay" ? "Displayed message" : "Current context" }}
        </p>
        <h2 class="mt-1 truncate text-sm font-semibold text-[var(--corvus-text)]">
          {{ context.subject }}
        </h2>
      </div>
      <Tag :value="page === 'msgDisplay' ? 'message display' : 'chat'" severity="secondary" />
    </div>

    <div class="space-y-1 text-xs text-[var(--corvus-text-secondary)]">
      <p><span class="font-medium text-[var(--corvus-text)]">From:</span> {{ context.from }}</p>
      <p v-if="context.threadCount > 1">
        <span class="font-medium text-[var(--corvus-text)]">Thread:</span>
        {{ context.threadCount }} messages
      </p>
      <p v-if="context.attachments.length > 0">
        <span class="font-medium text-[var(--corvus-text)]">Attachments:</span>
        {{ attachmentLabel }}
      </p>
    </div>
  </section>
</template>
