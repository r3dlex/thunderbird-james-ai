/**
 * MiniMax provider adapter.
 * Uses Anthropic-compatible endpoint at api.minimax.io.
 * Extends AnthropicProvider with only baseUrl override.
 */

import { AnthropicProvider } from "./anthropic"
import type { AIProviderConfig } from "./base"

export class MiniMaxProvider extends AnthropicProvider {
  constructor(config: AIProviderConfig) {
    super(config)
  }

  protected get baseUrl(): string {
    return this.config.baseUrl ?? "https://api.minimax.io/anthropic"
  }
}
