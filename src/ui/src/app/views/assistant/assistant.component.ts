import { Component, signal, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { StreamingService, type StreamChunk } from "../../services/streaming.service"
import { MessageBubbleComponent } from "../chat/message-bubble.component"
import { LoadingIndicatorComponent } from "../../shared/components/loading-indicator.component"
import { FilterRulesComponent } from "./filter-rules.component"
import { BatchOpsComponent } from "./batch-ops.component"
import { AutoReplyComponent } from "./auto-reply.component"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

@Component({
  selector: "corvus-assistant",
  standalone: true,
  imports: [
    CommonModule, FormsModule, MessageBubbleComponent,
    LoadingIndicatorComponent, FilterRulesComponent,
    BatchOpsComponent, AutoReplyComponent,
  ],
  template: `
    <div class="assistant-container">
      <div class="quick-actions">
        <button class="secondary" (click)="activePanel.set('rules')">Filter Rules</button>
        <button class="secondary" (click)="activePanel.set('batch')">Batch Ops</button>
        <button class="secondary" (click)="activePanel.set('autoReply')">Auto-Reply</button>
      </div>

      <div *ngIf="activePanel() === 'rules'" class="panel">
        <corvus-filter-rules></corvus-filter-rules>
      </div>
      <div *ngIf="activePanel() === 'batch'" class="panel">
        <corvus-batch-ops></corvus-batch-ops>
      </div>
      <div *ngIf="activePanel() === 'autoReply'" class="panel">
        <corvus-auto-reply></corvus-auto-reply>
      </div>

      <div *ngIf="!activePanel()" class="messages scroll-area" #messagesContainer>
        <corvus-message-bubble
          *ngFor="let msg of messages()"
          [role]="msg.role"
          [content]="msg.content">
        </corvus-message-bubble>
        <corvus-loading *ngIf="isStreaming()"></corvus-loading>
      </div>

      <div class="input-area">
        <input
          type="text"
          class="chat-input"
          [(ngModel)]="inputText"
          (keydown.enter)="sendMessage()"
          placeholder="Ask anything about your email..."
          [disabled]="isStreaming()">
        <button
          class="send-btn"
          (click)="sendMessage()"
          [disabled]="!inputText.trim() || isStreaming()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M1 1l14 7-14 7V9l10-1-10-1V1z"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .assistant-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .quick-actions {
      display: flex;
      gap: 4px;
      padding: 8px;
      border-bottom: 1px solid var(--corvus-border);
    }
    .quick-actions button {
      font-size: var(--corvus-font-size-sm);
      padding: 4px 8px;
    }
    .panel {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }
    .messages {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .input-area {
      display: flex;
      gap: 6px;
      padding: 8px;
      border-top: 1px solid var(--corvus-border);
    }
    .chat-input { flex: 1; }
    .send-btn {
      padding: 6px 10px;
      display: flex;
      align-items: center;
    }
  `],
})
export class AssistantComponent {
  @ViewChild("messagesContainer") messagesContainer!: ElementRef

  messages = signal<ChatMessage[]>([])
  isStreaming = signal(false)
  activePanel = signal<string | null>(null)
  inputText = ""

  constructor(private streaming: StreamingService) {}

  sendMessage(): void {
    const text = this.inputText.trim()
    if (!text || this.isStreaming()) return

    this.activePanel.set(null) // Close any open panel
    this.inputText = ""
    this.messages.update(msgs => [...msgs, { role: "user" as const, content: text }])

    const aiMessages = [
      {
        role: "system",
        content: "You are Corvus, a general email assistant. You have tools to search, move, draft, tag, and organize emails. Confirm before any destructive or bulk operation (>10 emails).",
      },
      ...this.messages().map(m => ({ role: m.role, content: m.content })),
    ]

    this.isStreaming.set(true)
    let responseText = ""
    this.messages.update(msgs => [...msgs, { role: "assistant" as const, content: "" }])

    this.streaming.streamChat(aiMessages).subscribe({
      next: (chunk: StreamChunk) => {
        if (chunk.type === "text" && chunk.text) {
          responseText += chunk.text
          this.messages.update(msgs => {
            const updated = [...msgs]
            updated[updated.length - 1] = { role: "assistant", content: responseText }
            return updated
          })
        }
      },
      complete: () => this.isStreaming.set(false),
      error: () => this.isStreaming.set(false),
    })
  }
}
