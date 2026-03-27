import { Component, OnInit, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { BridgeService } from "../../services/bridge.service"
import { ProviderCardComponent, type ProviderConfig } from "./provider-card.component"

@Component({
  selector: "corvus-settings",
  standalone: true,
  imports: [CommonModule, ProviderCardComponent],
  template: `
    <div class="settings-container scroll-area">
      <h2>Settings</h2>

      <div class="section">
        <h3>AI Providers</h3>
        <p class="hint">Configure your API keys. Select one as the active provider.</p>

        <corvus-provider-card
          *ngFor="let provider of providers"
          [provider]="provider"
          [isActive]="activeProviderId() === provider.id"
          (activate)="setActive(provider.id)"
          (save)="saveProvider($event)"
          (test)="testProvider(provider.id)"
          (remove)="removeProvider(provider.id)">
        </corvus-provider-card>
      </div>

      <div class="section">
        <h3>Cache</h3>
        <div class="stat">Entries: {{ cacheEntries() }} | Size: {{ cacheSizeKb() }}KB</div>
        <button class="secondary" (click)="clearCache()">Clear Cache</button>
      </div>

      <div class="section">
        <h3>Usage (this session)</h3>
        <div class="stat">Input tokens: {{ usage().sessionInputTokens }}</div>
        <div class="stat">Output tokens: {{ usage().sessionOutputTokens }}</div>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 12px;
      height: 100%;
    }
    h2 { font-size: 16px; margin-bottom: 12px; }
    h3 { font-size: 13px; margin-bottom: 6px; }
    .section { margin-bottom: 16px; }
    .hint { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-bottom: 8px; }
    .stat { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-bottom: 4px; }
  `],
})
export class SettingsComponent implements OnInit {
  providers: ProviderConfig[] = [
    { id: "anthropic", displayName: "Anthropic (Claude)", apiKey: "", model: "claude-sonnet-4-5-20250929", maxTokens: 4096, temperature: 0.7 },
    { id: "openai", displayName: "OpenAI", apiKey: "", model: "gpt-4o", maxTokens: 4096, temperature: 0.7 },
    { id: "gemini", displayName: "Google Gemini", apiKey: "", model: "gemini-2.5-flash", maxTokens: 4096, temperature: 0.7 },
    { id: "minimax", displayName: "MiniMax", apiKey: "", model: "MiniMax-M2.5", baseUrl: "https://api.minimax.io/anthropic", maxTokens: 4096, temperature: 0.5 },
  ]

  activeProviderId = signal("")
  cacheEntries = signal(0)
  cacheSizeKb = signal(0)
  usage = signal({ sessionInputTokens: 0, sessionOutputTokens: 0, totalInputTokens: 0, totalOutputTokens: 0 })

  constructor(private bridge: BridgeService) {}

  async ngOnInit(): Promise<void> {
    await this.loadState()
  }

  async loadState(): Promise<void> {
    const [providerResult, cacheResult, usageResult] = await Promise.all([
      this.bridge.send<{ providerId: string | null }>("getActiveProvider"),
      this.bridge.send<{ stats: { entries: number; sizeEstimate: number } }>("getCacheStats"),
      this.bridge.send<{ usage: Record<string, number> }>("getUsage"),
    ])

    this.activeProviderId.set(providerResult.providerId ?? "")
    this.cacheEntries.set(cacheResult.stats?.entries ?? 0)
    this.cacheSizeKb.set(Math.round((cacheResult.stats?.sizeEstimate ?? 0) / 1024))
    this.usage.set(usageResult.usage as ReturnType<typeof this.usage>)
  }

  async setActive(id: string): Promise<void> {
    await this.bridge.send("setActiveProvider", { id })
    this.activeProviderId.set(id)
  }

  async saveProvider(config: ProviderConfig): Promise<void> {
    await this.bridge.send("saveProviderConfig", config)
  }

  async testProvider(id: string): Promise<void> {
    await this.bridge.send<{ success: boolean; error?: string }>("testProviderConnection", { providerId: id })
  }

  async removeProvider(id: string): Promise<void> {
    await this.bridge.send("removeProviderConfig", { id })
  }

  async clearCache(): Promise<void> {
    await this.bridge.send("clearCache")
    this.cacheEntries.set(0)
    this.cacheSizeKb.set(0)
  }
}
