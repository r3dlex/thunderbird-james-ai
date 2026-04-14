<script setup lang="ts">
import { onMounted, ref } from "vue"
import type { AIProviderConfig, CacheStats, ProviderId, UsageStats } from "../../lib/contracts.js"
import { createMessengerBridge } from "../../lib/bridge.js"
import SettingsProviderCard from "./components/SettingsProviderCard.vue"
import { mergeProviderConfigs, type ProviderFormState } from "./defaults"

const bridge = createMessengerBridge()

const providers = ref<ProviderFormState[]>(mergeProviderConfigs([]))
const activeProviderId = ref<ProviderId | "">("")
const cacheStats = ref<CacheStats>({ entries: 0, sizeEstimate: 0 })
const usage = ref<UsageStats>({ totalInputTokens: 0, totalOutputTokens: 0, sessionInputTokens: 0, sessionOutputTokens: 0 })
const pageMessage = ref("")
const loading = ref(false)
const busyProviderId = ref<ProviderId | null>(null)
const providerStatus = ref<Record<string, string>>({})

function cacheSizeKb(sizeEstimate: number): number {
  return Math.round(sizeEstimate / 1024)
}

function setProviderStatus(providerId: ProviderId, message: string): void {
  providerStatus.value = {
    ...providerStatus.value,
    [providerId]: message,
  }
}

function clearProviderStatus(providerId: ProviderId): void {
  const nextStatus = { ...providerStatus.value }
  delete nextStatus[providerId]
  providerStatus.value = nextStatus
}

async function loadState(): Promise<void> {
  loading.value = true
  pageMessage.value = ""

  const [activeResult, cacheResult, usageResult, providerResult] = await Promise.allSettled([
    bridge.send("getActiveProvider"),
    bridge.send("getCacheStats"),
    bridge.send("getUsage"),
    bridge.send("loadProviderConfigs"),
  ])

  if (activeResult.status === "fulfilled") {
    activeProviderId.value = activeResult.value.providerId ?? ""
  }

  if (cacheResult.status === "fulfilled") {
    cacheStats.value = cacheResult.value.stats
  }

  if (usageResult.status === "fulfilled") {
    usage.value = usageResult.value.usage
  }

  const configs: AIProviderConfig[] = providerResult.status === "fulfilled" ? providerResult.value.configs ?? [] : []
  providers.value = mergeProviderConfigs(configs)

  if (providerResult.status === "rejected") {
    pageMessage.value = providerResult.reason instanceof Error
      ? providerResult.reason.message
      : "Stored provider configs are unavailable until the encrypted session is unlocked"
  }

  loading.value = false
}

async function setActiveProvider(providerId: ProviderId): Promise<void> {
  try {
    await bridge.send("setActiveProvider", { id: providerId })
    activeProviderId.value = providerId
    setProviderStatus(providerId, "Active provider updated")
  } catch (error) {
    setProviderStatus(providerId, error instanceof Error ? error.message : "Unable to set active provider")
  }
}

async function saveProvider(provider: ProviderFormState): Promise<void> {
  busyProviderId.value = provider.id
  clearProviderStatus(provider.id)

  try {
    const { hasStoredConfig: _hasStoredConfig, ...config } = provider
    await bridge.send("saveProviderConfig", config)
    setProviderStatus(provider.id, "Provider saved")
    await loadState()
  } catch (error) {
    setProviderStatus(provider.id, error instanceof Error ? error.message : "Unable to save provider")
  } finally {
    busyProviderId.value = null
  }
}

async function testProvider(providerId: ProviderId): Promise<void> {
  busyProviderId.value = providerId
  clearProviderStatus(providerId)

  try {
    const result = await bridge.send("testProviderConnection", { providerId })
    setProviderStatus(providerId, result.success ? `Connection OK${result.response ? `: ${result.response}` : ""}` : result.error ?? "Connection failed")
  } catch (error) {
    setProviderStatus(providerId, error instanceof Error ? error.message : "Unable to test provider")
  } finally {
    busyProviderId.value = null
  }
}

async function removeProvider(providerId: ProviderId): Promise<void> {
  busyProviderId.value = providerId
  clearProviderStatus(providerId)

  try {
    await bridge.send("removeProviderConfig", { id: providerId })
    setProviderStatus(providerId, "Stored config removed")
    await loadState()
  } catch (error) {
    setProviderStatus(providerId, error instanceof Error ? error.message : "Unable to remove provider")
  } finally {
    busyProviderId.value = null
  }
}

async function clearCache(): Promise<void> {
  pageMessage.value = ""

  try {
    await bridge.send("clearCache")
    cacheStats.value = { entries: 0, sizeEstimate: 0 }
    pageMessage.value = "Cache cleared"
  } catch (error) {
    pageMessage.value = error instanceof Error ? error.message : "Unable to clear cache"
  }
}

onMounted(() => {
  void loadState()
})
</script>

<template>
  <section class="scroll-area flex h-full min-h-0 flex-col gap-4 rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/70 px-4 py-4">
    <header>
      <h2 class="text-sm font-semibold text-[var(--corvus-text)]">Settings</h2>
      <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
        Configure providers, review cache usage, and inspect current token counts without leaving the popup shell.
      </p>
    </header>

    <p v-if="pageMessage" class="rounded-lg border border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-2 text-xs text-[var(--corvus-text-secondary)]">
      {{ pageMessage }}
    </p>

    <section class="space-y-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-[var(--corvus-text)]">AI Providers</h3>
          <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
            Save encrypted API keys and choose the active provider for assistant actions.
          </p>
        </div>
        <button class="secondary text-xs" type="button" @click="loadState" :disabled="loading">Refresh</button>
      </div>

      <div class="space-y-3">
        <SettingsProviderCard
          v-for="provider in providers"
          :key="provider.id"
          :provider="provider"
          :is-active="activeProviderId === provider.id"
          :is-busy="busyProviderId === provider.id"
          :status-message="providerStatus[provider.id] ?? ''"
          @activate="setActiveProvider"
          @save="saveProvider"
          @test="testProvider"
          @remove="removeProvider"
        />
      </div>
    </section>

    <section class="rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-sm font-semibold text-[var(--corvus-text)]">Cache</h3>
          <p class="mt-1 text-xs text-[var(--corvus-text-secondary)]">
            Entries: {{ cacheStats.entries }} · Size: {{ cacheSizeKb(cacheStats.sizeEstimate) }} KB
          </p>
        </div>
        <button class="secondary text-xs" type="button" @click="clearCache">Clear Cache</button>
      </div>
    </section>

    <section class="rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-3">
      <h3 class="text-sm font-semibold text-[var(--corvus-text)]">Usage</h3>
      <div class="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p class="text-xs text-[var(--corvus-text-secondary)]">Session input</p>
          <p class="mt-1 font-medium text-[var(--corvus-text)]">{{ usage.sessionInputTokens }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--corvus-text-secondary)]">Session output</p>
          <p class="mt-1 font-medium text-[var(--corvus-text)]">{{ usage.sessionOutputTokens }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--corvus-text-secondary)]">Total input</p>
          <p class="mt-1 font-medium text-[var(--corvus-text)]">{{ usage.totalInputTokens }}</p>
        </div>
        <div>
          <p class="text-xs text-[var(--corvus-text-secondary)]">Total output</p>
          <p class="mt-1 font-medium text-[var(--corvus-text)]">{{ usage.totalOutputTokens }}</p>
        </div>
      </div>
    </section>
  </section>
</template>
