import { Component, Input, Output, EventEmitter } from "@angular/core"

@Component({
  selector: "corvus-suggestion-card",
  standalone: true,
  template: `
    <button class="suggestion" (click)="action.emit()">{{ label }}</button>
  `,
  styles: [`
    .suggestion {
      font-size: var(--corvus-font-size-sm);
      padding: 4px 10px;
      background: var(--corvus-surface);
      color: var(--corvus-text);
      border: 1px solid var(--corvus-border);
      border-radius: 12px;
      white-space: nowrap;
    }
    .suggestion:hover {
      background: var(--corvus-surface-raised);
      border-color: var(--corvus-accent);
      color: var(--corvus-accent);
    }
  `],
})
export class SuggestionCardComponent {
  @Input() label = ""
  @Output() action = new EventEmitter<void>()
}
