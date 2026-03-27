import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "corvus-batch-ops",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="batch-panel">
      <h3>Batch Operations</h3>
      <p class="hint">Use the chat to run batch operations on your emails. Examples:</p>
      <ul class="examples">
        <li>"Archive all read emails older than 30 days"</li>
        <li>"Move all newsletters to the Newsletters folder"</li>
        <li>"Tag all emails from project-x team as important"</li>
      </ul>
      <p class="hint">The assistant will confirm before executing any bulk operation.</p>
    </div>
  `,
  styles: [`
    .batch-panel h3 { font-size: 14px; margin-bottom: 8px; }
    .hint { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-bottom: 8px; }
    .examples {
      font-size: var(--corvus-font-size-sm);
      padding-left: 16px;
      margin-bottom: 8px;
    }
    .examples li {
      margin-bottom: 4px;
      color: var(--corvus-text);
    }
  `],
})
export class BatchOpsComponent {}
