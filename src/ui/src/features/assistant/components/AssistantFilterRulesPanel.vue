<script setup lang="ts">
import { onMounted, ref } from "vue"
import type { CorvusRule } from "../../../lib/contracts.js"
import { createMessengerBridge } from "../../../lib/bridge.js"

const bridge = createMessengerBridge()

const rules = ref<CorvusRule[]>([])
const loading = ref(false)
const errorMessage = ref("")

async function loadRules(): Promise<void> {
  loading.value = true
  errorMessage.value = ""

  try {
    const result = await bridge.send("loadRules")
    rules.value = result.rules ?? []
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to load rules"
  } finally {
    loading.value = false
  }
}

async function toggleRule(rule: CorvusRule): Promise<void> {
  try {
    await bridge.send("toggleRule", { id: rule.id, enabled: !rule.enabled })
    await loadRules()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to update rule"
  }
}

async function deleteRule(ruleId: string): Promise<void> {
  try {
    await bridge.send("removeRule", { id: ruleId })
    await loadRules()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "Unable to remove rule"
  }
}

onMounted(() => {
  void loadRules()
})
</script>

<template>
  <section class="space-y-3 rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/80 p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-sm font-semibold text-[var(--corvus-text)]">Filter Rules</h3>
        <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
          Create rules in chat, then toggle or remove them here.
        </p>
      </div>
      <button class="secondary" type="button" @click="loadRules" :disabled="loading">
        Refresh
      </button>
    </div>

    <p v-if="errorMessage" class="rounded-lg border border-[var(--corvus-error)]/30 bg-[var(--corvus-error)]/8 px-3 py-2 text-xs text-[var(--corvus-error)]">
      {{ errorMessage }}
    </p>

    <p v-if="loading" class="text-xs text-[var(--corvus-text-secondary)]">Loading rules…</p>
    <p v-else-if="rules.length === 0" class="text-sm italic text-[var(--corvus-text-secondary)]">No rules configured</p>

    <div v-else class="space-y-2">
      <article
        v-for="rule in rules"
        :key="rule.id"
        class="rounded-lg border border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-3"
      >
        <div class="flex items-start justify-between gap-3">
          <label class="flex flex-1 cursor-pointer items-start gap-2">
            <input
              :checked="rule.enabled"
              type="checkbox"
              class="mt-0.5"
              @change="toggleRule(rule)"
            >
            <span>
              <span class="block text-sm font-medium text-[var(--corvus-text)]">{{ rule.name }}</span>
              <span class="mt-1 block text-xs text-[var(--corvus-text-secondary)]">
                Triggered {{ rule.triggerCount }} times
                <template v-if="rule.lastTriggeredAt">
                  · last {{ rule.lastTriggeredAt }}
                </template>
              </span>
            </span>
          </label>

          <button class="secondary !px-2 !py-1 text-xs" type="button" @click="deleteRule(rule.id)">
            Delete
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
