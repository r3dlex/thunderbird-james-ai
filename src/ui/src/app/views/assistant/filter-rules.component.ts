import { Component, OnInit, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { BridgeService } from "../../services/bridge.service"

interface Rule {
  id: string
  name: string
  enabled: boolean
  priority: number
  triggerCount: number
  lastTriggeredAt?: string
}

@Component({
  selector: "corvus-filter-rules",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rules-panel">
      <h3>Filter Rules</h3>
      <p class="hint">Create rules using the chat: "Create a rule that moves emails from X to folder Y"</p>

      <div *ngIf="rules().length === 0" class="empty">No rules configured</div>

      <div *ngFor="let rule of rules()" class="rule-card">
        <div class="rule-header">
          <label class="toggle">
            <input type="checkbox"
              [checked]="rule.enabled"
              (change)="toggleRule(rule.id, !rule.enabled)">
            <span class="rule-name">{{ rule.name }}</span>
          </label>
          <button class="delete-btn" (click)="deleteRule(rule.id)">x</button>
        </div>
        <div class="rule-meta">
          Triggered {{ rule.triggerCount }} times
          <span *ngIf="rule.lastTriggeredAt"> - last {{ rule.lastTriggeredAt }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rules-panel h3 { font-size: 14px; margin-bottom: 8px; }
    .hint { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-bottom: 12px; }
    .empty { color: var(--corvus-text-secondary); font-style: italic; }
    .rule-card {
      padding: 8px;
      border: 1px solid var(--corvus-border);
      border-radius: var(--corvus-radius-sm);
      margin-bottom: 6px;
    }
    .rule-header { display: flex; justify-content: space-between; align-items: center; }
    .toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
    .rule-name { font-weight: 500; }
    .rule-meta { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-top: 4px; }
    .delete-btn { background: transparent; color: var(--corvus-error); padding: 2px 6px; font-size: 12px; }
  `],
})
export class FilterRulesComponent implements OnInit {
  rules = signal<Rule[]>([])

  constructor(private bridge: BridgeService) {}

  async ngOnInit(): Promise<void> {
    await this.loadRules()
  }

  async loadRules(): Promise<void> {
    const result = await this.bridge.send<{ rules: Rule[] }>("loadRules")
    this.rules.set(result.rules ?? [])
  }

  async toggleRule(id: string, enabled: boolean): Promise<void> {
    await this.bridge.send("toggleRule", { id, enabled })
    await this.loadRules()
  }

  async deleteRule(id: string): Promise<void> {
    await this.bridge.send("removeRule", { id })
    await this.loadRules()
  }
}
