<script setup lang="ts">
import { computed } from "vue"
import type { ProviderId } from "../../../lib/contracts.js"
import { MODEL_OPTIONS, type ProviderFormState } from "../defaults"

const props = defineProps<{
  provider: ProviderFormState
  isActive: boolean
  isBusy: boolean
  statusMessage: string
}>()

const emit = defineEmits<{
  activate: [providerId: ProviderId]
  save: [provider: ProviderFormState]
  test: [providerId: ProviderId]
  remove: [providerId: ProviderId]
}>()

const models = computed(() => MODEL_OPTIONS[props.provider.id] ?? [])
</script>

<template>
  <article
    class="rounded-xl border px-3 py-3"
    :class="isActive ? 'border-[var(--corvus-accent)] bg-[var(--corvus-surface)]' : 'border-[var(--corvus-border)] bg-[var(--corvus-bg)]'"
  >
    <div class="flex items-start justify-between gap-3">
      <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--corvus-text)]">
        <input
          type="radio"
          name="activeProvider"
          :checked="isActive"
          @change="emit('activate', provider.id)"
        >
        <span>{{ provider.displayName }}</span>
      </label>
      <span v-if="provider.hasStoredConfig" class="text-[11px] text-[var(--corvus-text-secondary)]">saved</span>
    </div>

    <div class="mt-3 grid gap-3">
      <label class="grid gap-1 text-xs text-[var(--corvus-text-secondary)]">
        <span>Model</span>
        <select v-model="provider.model">
          <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
        </select>
      </label>

      <label class="grid gap-1 text-xs text-[var(--corvus-text-secondary)]">
        <span>API Key</span>
        <input v-model="provider.apiKey" type="password" placeholder="Enter API key">
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="grid gap-1 text-xs text-[var(--corvus-text-secondary)]">
          <span>Max Tokens</span>
          <input v-model.number="provider.maxTokens" type="number" min="100" max="32000">
        </label>

        <label class="grid gap-1 text-xs text-[var(--corvus-text-secondary)]">
          <span>Temperature</span>
          <input v-model.number="provider.temperature" type="number" min="0" max="2" step="0.1">
        </label>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="button" :disabled="isBusy || !provider.apiKey.trim()" @click="emit('save', provider)">
          Save
        </button>
        <button class="secondary" type="button" :disabled="isBusy || !provider.apiKey.trim()" @click="emit('test', provider.id)">
          Test
        </button>
        <button class="secondary" type="button" :disabled="isBusy" @click="emit('remove', provider.id)">
          Remove
        </button>
      </div>

      <p v-if="statusMessage" class="text-xs text-[var(--corvus-text-secondary)]">{{ statusMessage }}</p>
    </div>
  </article>
</template>
