<script setup lang="ts">
import { onBeforeUnmount } from "vue"
import Button from "primevue/button"
import InputText from "primevue/inputtext"
import ProgressSpinner from "primevue/progressspinner"
import { composeQuickActions } from "./composeQuickActions"
import { useComposeAssistant } from "./useComposeAssistant"

const composeAssistant = useComposeAssistant()

const {
  customInstruction,
  errorMessage,
  hasPreview,
  isProcessing,
  lastResponse,
} = composeAssistant

onBeforeUnmount(() => {
  composeAssistant.stop()
})
</script>

<template>
  <section class="flex h-full flex-col gap-3 text-sm">
    <header class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
        Compose actions
      </p>
      <p class="text-[var(--corvus-text-secondary)]">
        Preserve the runtime.sendMessage and corvus-stream contracts while previewing rewritten copy.
      </p>
    </header>

    <div class="grid grid-cols-2 gap-2">
      <Button
        v-for="action in composeQuickActions"
        :key="action.label"
        :label="action.label"
        severity="secondary"
        outlined
        size="small"
        class="justify-start"
        :disabled="isProcessing"
        @click="composeAssistant.applyQuickAction(action.instruction)"
      />
    </div>

    <div class="min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/80">
      <div v-if="hasPreview" class="flex h-full flex-col">
        <div class="border-b border-[var(--corvus-border)] px-3 py-2 text-xs font-medium text-[var(--corvus-text-secondary)]">
          Streaming preview
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <p v-if="errorMessage" class="mb-3 rounded-lg border border-[var(--corvus-error)]/30 bg-[var(--corvus-error)]/10 px-3 py-2 text-[var(--corvus-error)]">
            {{ errorMessage }}
          </p>
          <pre
            v-if="lastResponse"
            class="whitespace-pre-wrap break-words font-sans leading-6 text-[var(--corvus-text)]"
          >{{ lastResponse }}</pre>
        </div>
      </div>

      <div
        v-else
        class="flex h-full items-center justify-center px-4 text-center text-[var(--corvus-text-secondary)]"
      >
        Choose a quick action or apply a custom instruction to preview the rewritten draft.
      </div>
    </div>

    <div class="flex items-center gap-2">
      <InputText
        v-model="customInstruction"
        fluid
        size="small"
        class="flex-1"
        placeholder="Custom instruction..."
        :disabled="isProcessing"
        @keydown.enter="composeAssistant.applyCustomInstruction()"
      />

      <Button
        label="Apply"
        size="small"
        :disabled="!customInstruction.trim() || isProcessing"
        @click="composeAssistant.applyCustomInstruction()"
      />
    </div>

    <div
      v-if="isProcessing"
      class="flex items-center gap-2 text-xs text-[var(--corvus-text-secondary)]"
    >
      <ProgressSpinner
        class="h-4 w-4"
        strokeWidth="6"
        fill="transparent"
        animationDuration=".8s"
      />
      <span>Streaming compose preview...</span>
    </div>
  </section>
</template>
