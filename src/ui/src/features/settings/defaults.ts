import type { AIProviderConfig, ProviderId } from "../../lib/contracts.js"

export interface ProviderFormState extends AIProviderConfig {
  hasStoredConfig: boolean
}

export const MODEL_OPTIONS: Record<ProviderId, string[]> = {
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  minimax: ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2"],
}

const DEFAULT_PROVIDER_CONFIGS: AIProviderConfig[] = [
  { id: "anthropic", displayName: "Anthropic (Claude)", apiKey: "", model: "claude-sonnet-4-5-20250929", maxTokens: 4096, temperature: 0.7 },
  { id: "openai", displayName: "OpenAI", apiKey: "", model: "gpt-4o", maxTokens: 4096, temperature: 0.7 },
  { id: "gemini", displayName: "Google Gemini", apiKey: "", model: "gemini-2.5-flash", maxTokens: 4096, temperature: 0.7 },
  { id: "minimax", displayName: "MiniMax", apiKey: "", model: "MiniMax-M2.5", baseUrl: "https://api.minimax.io/anthropic", maxTokens: 4096, temperature: 0.5 },
]

export function mergeProviderConfigs(configs: AIProviderConfig[]): ProviderFormState[] {
  const storedById = new Map(configs.map(config => [config.id, config]))

  return DEFAULT_PROVIDER_CONFIGS.map(defaultConfig => {
    const stored = storedById.get(defaultConfig.id)
    return {
      ...defaultConfig,
      ...stored,
      hasStoredConfig: Boolean(stored),
    }
  })
}
