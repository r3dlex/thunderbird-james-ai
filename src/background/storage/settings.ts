/**
 * Provider configuration storage with encrypted API keys.
 */

import type { AIProviderConfig } from "../ai/types"
import { encrypt, decrypt, isSessionUnlocked } from "./crypto"

const SETTINGS_KEY = "corvus_settings"
const ACTIVE_PROVIDER_KEY = "corvus_active_provider"

interface StoredProviderConfig {
  id: AIProviderConfig["id"]
  displayName: string
  encryptedApiKey: string
  model: string
  baseUrl?: string
  maxTokens: number
  temperature: number
}

interface CorvusSettings {
  providers: StoredProviderConfig[]
  firstRunAcknowledged: boolean
}

function defaultSettings(): CorvusSettings {
  return {
    providers: [],
    firstRunAcknowledged: false,
  }
}

export async function loadSettings(): Promise<CorvusSettings> {
  const data = await messenger.storage.local.get(SETTINGS_KEY)
  return (data[SETTINGS_KEY] as CorvusSettings) ?? defaultSettings()
}

export async function saveSettings(settings: CorvusSettings): Promise<void> {
  await messenger.storage.local.set({ [SETTINGS_KEY]: settings })
}

export async function getActiveProviderId(): Promise<AIProviderConfig["id"] | null> {
  const data = await messenger.storage.local.get(ACTIVE_PROVIDER_KEY)
  return (data[ACTIVE_PROVIDER_KEY] as AIProviderConfig["id"]) ?? null
}

export async function setActiveProviderId(id: AIProviderConfig["id"]): Promise<void> {
  await messenger.storage.local.set({ [ACTIVE_PROVIDER_KEY]: id })
}

export async function saveProviderConfig(config: AIProviderConfig): Promise<void> {
  if (!isSessionUnlocked()) {
    throw new Error("Session not unlocked")
  }

  const settings = await loadSettings()
  const encryptedApiKey = await encrypt(config.apiKey)

  const stored: StoredProviderConfig = {
    id: config.id,
    displayName: config.displayName,
    encryptedApiKey,
    model: config.model,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  }

  const idx = settings.providers.findIndex(p => p.id === config.id)
  if (idx >= 0) {
    settings.providers[idx] = stored
  } else {
    settings.providers.push(stored)
  }

  await saveSettings(settings)
}

export async function loadProviderConfig(id: AIProviderConfig["id"]): Promise<AIProviderConfig | null> {
  if (!isSessionUnlocked()) {
    throw new Error("Session not unlocked")
  }

  const settings = await loadSettings()
  const stored = settings.providers.find(p => p.id === id)
  if (!stored) return null

  const apiKey = await decrypt(stored.encryptedApiKey)

  return {
    id: stored.id,
    displayName: stored.displayName,
    apiKey,
    model: stored.model,
    baseUrl: stored.baseUrl,
    maxTokens: stored.maxTokens,
    temperature: stored.temperature,
  }
}

export async function loadAllProviderConfigs(): Promise<AIProviderConfig[]> {
  if (!isSessionUnlocked()) {
    throw new Error("Session not unlocked")
  }

  const settings = await loadSettings()
  const configs: AIProviderConfig[] = []

  for (const stored of settings.providers) {
    const apiKey = await decrypt(stored.encryptedApiKey)
    configs.push({
      id: stored.id,
      displayName: stored.displayName,
      apiKey,
      model: stored.model,
      baseUrl: stored.baseUrl,
      maxTokens: stored.maxTokens,
      temperature: stored.temperature,
    })
  }

  return configs
}

export async function removeProviderConfig(id: AIProviderConfig["id"]): Promise<void> {
  const settings = await loadSettings()
  settings.providers = settings.providers.filter(p => p.id !== id)
  await saveSettings(settings)
}

export async function acknowledgeFirstRun(): Promise<void> {
  const settings = await loadSettings()
  settings.firstRunAcknowledged = true
  await saveSettings(settings)
}

export async function isFirstRunAcknowledged(): Promise<boolean> {
  const settings = await loadSettings()
  return settings.firstRunAcknowledged
}
