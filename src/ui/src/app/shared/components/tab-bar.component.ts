import { Component, Input, Output, EventEmitter } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "corvus-tab-bar",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tab-bar">
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activePage === 'chat'"
          (click)="pageChange.emit('chat')">
          Chat
        </button>
        <button
          class="tab"
          [class.active]="activePage === 'assistant'"
          (click)="pageChange.emit('assistant')">
          Assistant
        </button>
      </div>
      <button class="settings-btn" (click)="pageChange.emit('settings')" title="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 10a2 2 0 100-4 2 2 0 000 4zm0 1a3 3 0 110-6 3 3 0 010 6z"/>
          <path d="M6.5 1h3l.5 2.1.9.4L12.8 2l2.1 2.1-1.5 1.9.4.9L16 7.5v3l-2.1.5-.4.9 1.5 1.9-2.1 2.1-1.9-1.5-.9.4L9.5 15h-3l-.5-2.1-.9-.4-1.9 1.5L1 11.9l1.5-1.9-.4-.9L0 8.5v-3l2.1-.5.4-.9L1 2.2 3.1.1l1.9 1.5.9-.4L6.5 1z"/>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .tab-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid var(--corvus-border);
      background: var(--corvus-surface);
    }
    .tabs {
      display: flex;
      gap: 2px;
    }
    .tab {
      padding: 6px 14px;
      background: transparent;
      color: var(--corvus-text-secondary);
      font-size: var(--corvus-font-size);
      font-weight: 500;
      border-radius: var(--corvus-radius-sm);
    }
    .tab:hover {
      background: var(--corvus-surface-raised);
      color: var(--corvus-text);
    }
    .tab.active {
      background: var(--corvus-bg);
      color: var(--corvus-accent);
    }
    .settings-btn {
      padding: 6px;
      background: transparent;
      color: var(--corvus-text-secondary);
      display: flex;
      align-items: center;
    }
    .settings-btn:hover {
      color: var(--corvus-text);
      background: var(--corvus-surface-raised);
    }
  `],
})
export class TabBarComponent {
  @Input() activePage = "chat"
  @Output() pageChange = new EventEmitter<string>()
}
