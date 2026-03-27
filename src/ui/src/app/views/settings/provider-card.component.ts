import { Component, Input, Output, EventEmitter, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

export interface ProviderConfig {
  id: string
  displayName: string
  apiKey: string
  model: string
  baseUrl?: string
  maxTokens: number
  temperature: number
}

const MODEL_OPTIONS: Record<string, string[]> = {
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3-mini"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  minimax: ["MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M2"],
}

@Component({
  selector: "corvus-provider-card",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="provider-card" [class.active]="isActive">
      <div class="card-header">
        <label class="radio-label">
          <input type="radio" name="activeProvider" [checked]="isActive" (change)="activate.emit()">
          <strong>{{ provider.displayName }}</strong>
        </label>
      </div>

      <div class="card-body">
        <div class="field">
          <label>Model</label>
          <select [(ngModel)]="provider.model">
            <option *ngFor="let m of models" [value]="m">{{ m }}</option>
          </select>
        </div>

        <div class="field">
          <label>API Key</label>
          <input type="password" [(ngModel)]="provider.apiKey" placeholder="Enter API key">
        </div>

        <div class="field-row">
          <div class="field">
            <label>Max Tokens</label>
            <input type="number" [(ngModel)]="provider.maxTokens" min="100" max="32000">
          </div>
          <div class="field">
            <label>Temperature</label>
            <input type="number" [(ngModel)]="provider.temperature" min="0" max="2" step="0.1">
          </div>
        </div>

        <div class="actions">
          <button (click)="save.emit(provider)" [disabled]="!provider.apiKey">Save</button>
          <button class="secondary" (click)="test.emit()" [disabled]="!provider.apiKey">Test</button>
          <button class="secondary" (click)="remove.emit()">Remove</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .provider-card {
      border: 1px solid var(--corvus-border);
      border-radius: var(--corvus-radius);
      padding: 10px;
      margin-bottom: 8px;
    }
    .provider-card.active {
      border-color: var(--corvus-accent);
    }
    .card-header {
      margin-bottom: 8px;
    }
    .radio-label {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .card-body { display: flex; flex-direction: column; gap: 6px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); }
    .field input, .field select { width: 100%; }
    .field-row { display: flex; gap: 8px; }
    .field-row .field { flex: 1; }
    .actions { display: flex; gap: 4px; margin-top: 4px; }
    .actions button { font-size: var(--corvus-font-size-sm); padding: 4px 8px; }
  `],
})
export class ProviderCardComponent {
  @Input() provider!: ProviderConfig
  @Input() isActive = false
  @Output() activate = new EventEmitter<void>()
  @Output() save = new EventEmitter<ProviderConfig>()
  @Output() test = new EventEmitter<void>()
  @Output() remove = new EventEmitter<void>()

  get models(): string[] {
    return MODEL_OPTIONS[this.provider.id] ?? []
  }
}
