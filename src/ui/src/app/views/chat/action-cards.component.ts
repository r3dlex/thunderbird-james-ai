import { Component, Input } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "corvus-action-cards",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-cards">
      <div *ngFor="let action of actions" class="action-card">
        <span class="action-icon">{{ getIcon(action.type) }}</span>
        <span class="action-label">{{ action.label }}</span>
      </div>
    </div>
  `,
  styles: [`
    .action-cards {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .action-card {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: var(--corvus-surface);
      border: 1px solid var(--corvus-border);
      border-radius: var(--corvus-radius-sm);
      font-size: var(--corvus-font-size-sm);
      color: var(--corvus-accent);
      cursor: pointer;
    }
    .action-card:hover {
      background: var(--corvus-surface-raised);
    }
    .action-icon {
      font-size: 14px;
    }
  `],
})
export class ActionCardsComponent {
  @Input() actions: Array<{ type: string; label: string; data?: unknown }> = []

  getIcon(type: string): string {
    switch (type) {
      case "draft": return "[Draft]"
      case "move": return "[Move]"
      case "search": return "[Search]"
      default: return "[Action]"
    }
  }
}
