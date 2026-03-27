import { Component, Input, Output, EventEmitter } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

export interface ProviderOption {
  id: string
  displayName: string
}

@Component({
  selector: "corvus-provider-selector",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <select
      class="provider-select"
      [ngModel]="selectedId"
      (ngModelChange)="selectionChange.emit($event)">
      <option *ngFor="let p of providers" [value]="p.id">{{ p.displayName }}</option>
    </select>
  `,
  styles: [`
    .provider-select {
      font-size: var(--corvus-font-size-sm);
      padding: 3px 6px;
      min-width: 120px;
    }
  `],
})
export class ProviderSelectorComponent {
  @Input() providers: ProviderOption[] = []
  @Input() selectedId = ""
  @Output() selectionChange = new EventEmitter<string>()
}
