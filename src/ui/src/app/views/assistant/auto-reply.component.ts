import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "corvus-auto-reply",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auto-reply-panel">
      <h3>Auto-Reply Configuration</h3>
      <p class="hint">Set up automatic replies using the chat. You can configure rules based on:</p>
      <ul class="examples">
        <li>Sender patterns ("auto-reply to all emails from support&#64;")</li>
        <li>Subject keywords ("auto-reply to emails about PTO requests")</li>
        <li>LLM classification ("auto-reply to emails classified as meeting requests")</li>
      </ul>
      <p class="hint">
        The AI agent can classify incoming emails and automatically generate
        contextual replies based on the classification. Configure this through
        the chat by describing what types of emails should receive auto-replies
        and what the reply should contain.
      </p>
      <p class="warning">
        Auto-replies are only sent for rules you explicitly create and enable.
        The extension never sends emails without a matching rule.
      </p>
    </div>
  `,
  styles: [`
    .auto-reply-panel h3 { font-size: 14px; margin-bottom: 8px; }
    .hint { font-size: var(--corvus-font-size-sm); color: var(--corvus-text-secondary); margin-bottom: 8px; }
    .examples {
      font-size: var(--corvus-font-size-sm);
      padding-left: 16px;
      margin-bottom: 8px;
    }
    .examples li { margin-bottom: 4px; color: var(--corvus-text); }
    .warning {
      font-size: var(--corvus-font-size-sm);
      color: var(--corvus-text-secondary);
      font-style: italic;
      border-left: 3px solid var(--corvus-accent);
      padding-left: 8px;
    }
  `],
})
export class AutoReplyComponent {}
