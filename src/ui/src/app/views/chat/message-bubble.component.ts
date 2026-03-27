import { Component, Input } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MarkdownPipe } from "../../shared/pipes/markdown.pipe"

@Component({
  selector: "corvus-message-bubble",
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  template: `
    <div class="bubble" [class.user]="role === 'user'" [class.assistant]="role === 'assistant'">
      <div class="bubble-label">{{ role === 'user' ? 'You' : 'Assistant' }}</div>
      <div class="bubble-content" [innerHTML]="content | markdown"></div>
    </div>
  `,
  styles: [`
    .bubble {
      padding: 8px 12px;
      border-radius: var(--corvus-radius);
      max-width: 95%;
      word-wrap: break-word;
    }
    .bubble-label {
      font-size: var(--corvus-font-size-sm);
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--corvus-text-secondary);
    }
    .bubble.user {
      background: var(--corvus-user-bubble);
      color: #fff;
      align-self: flex-end;
    }
    .bubble.user .bubble-label {
      color: rgba(255, 255, 255, 0.8);
    }
    .bubble.assistant {
      background: var(--corvus-ai-bubble);
      align-self: flex-start;
    }
    .bubble-content {
      line-height: 1.5;
    }
    .bubble-content :first-child {
      margin-top: 0;
    }
    .bubble-content :last-child {
      margin-bottom: 0;
    }
    .bubble-content code {
      font-family: var(--corvus-font-mono);
      font-size: 0.9em;
      background: rgba(0,0,0,0.06);
      padding: 1px 4px;
      border-radius: 3px;
    }
    .bubble-content pre {
      background: rgba(0,0,0,0.06);
      padding: 8px;
      border-radius: var(--corvus-radius-sm);
      overflow-x: auto;
    }
  `],
})
export class MessageBubbleComponent {
  @Input() role: "user" | "assistant" = "assistant"
  @Input() content = ""
}
