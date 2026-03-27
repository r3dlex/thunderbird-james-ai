import { Component, OnInit, signal, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { BridgeService } from "../../services/bridge.service"
import { StreamingService, type StreamChunk } from "../../services/streaming.service"
import { MessageBubbleComponent } from "./message-bubble.component"
import { ActionCardsComponent } from "./action-cards.component"
import { LoadingIndicatorComponent } from "../../shared/components/loading-indicator.component"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  actions?: Array<{ type: string; label: string; data?: unknown }>
}

interface EmailContext {
  subject: string
  from: string
  threadCount: number
}

@Component({
  selector: "corvus-chat",
  standalone: true,
  imports: [CommonModule, FormsModule, MessageBubbleComponent, ActionCardsComponent, LoadingIndicatorComponent],
  template: `
    <div class="chat-container">
      <div *ngIf="emailContext()" class="context-card">
        <div class="context-subject">{{ emailContext()!.subject }}</div>
        <div class="context-meta">From: {{ emailContext()!.from }}</div>
        <div class="context-meta" *ngIf="emailContext()!.threadCount > 1">
          {{ emailContext()!.threadCount }} messages in thread
        </div>
      </div>

      <div class="messages scroll-area" #messagesContainer>
        <corvus-message-bubble
          *ngFor="let msg of messages()"
          [role]="msg.role"
          [content]="msg.content">
        </corvus-message-bubble>

        <corvus-action-cards
          *ngIf="currentActions().length > 0"
          [actions]="currentActions()">
        </corvus-action-cards>

        <corvus-loading *ngIf="isStreaming()"></corvus-loading>
      </div>

      <div class="input-area">
        <input
          type="text"
          class="chat-input"
          [(ngModel)]="inputText"
          (keydown.enter)="sendMessage()"
          placeholder="Type a message..."
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
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .context-card {
      padding: 8px 12px;
      margin: 8px;
      background: var(--corvus-surface);
      border: 1px solid var(--corvus-border);
      border-radius: var(--corvus-radius);
      font-size: var(--corvus-font-size-sm);
    }
    .context-subject {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .context-meta {
      color: var(--corvus-text-secondary);
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
    .chat-input {
      flex: 1;
    }
    .send-btn {
      padding: 6px 10px;
      display: flex;
      align-items: center;
    }
  `],
})
export class ChatComponent implements OnInit {
  @ViewChild("messagesContainer") messagesContainer!: ElementRef

  messages = signal<ChatMessage[]>([])
  emailContext = signal<EmailContext | null>(null)
  currentActions = signal<Array<{ type: string; label: string; data?: unknown }>>([])
  isStreaming = signal(false)
  inputText = ""

  private threadContext = ""

  constructor(
    private bridge: BridgeService,
    private streaming: StreamingService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadEmailContext()
  }

  async loadEmailContext(): Promise<void> {
    try {
      // Get the current tab to read displayed message
      const result = await this.bridge.send<{
        message?: { subject: string; from: string }
        thread?: { totalCount: number; formatted: string }
        error?: string
      }>("getMessageContext", { tabId: 0 })

      if (result.message) {
        this.emailContext.set({
          subject: result.message.subject,
          from: result.message.from,
          threadCount: result.thread?.totalCount ?? 1,
        })
        this.threadContext = result.thread?.formatted ?? ""
      }
    } catch {
      // Not in message display context, that is fine
    }
  }

  sendMessage(): void {
    const text = this.inputText.trim()
    if (!text || this.isStreaming()) return

    this.inputText = ""
    const userMsg: ChatMessage = { role: "user", content: text }
    this.messages.update(msgs => [...msgs, userMsg])

    // Build messages for AI
    const aiMessages = this.buildAIMessages(text)
    this.streamResponse(aiMessages)
  }

  private buildAIMessages(userText: string): Array<{ role: string; content: string }> {
    const systemParts: string[] = [
      "You are Corvus, an email assistant integrated into Thunderbird.",
    ]

    const ctx = this.emailContext()
    if (ctx) {
      systemParts.push(
        `\nCURRENT EMAIL:\nFrom: ${ctx.from}\nSubject: ${ctx.subject}`,
      )
      if (this.threadContext) {
        systemParts.push(`\nTHREAD HISTORY:\n${this.threadContext}`)
      }
    }

    systemParts.push(
      "\nYou have access to tools for searching, moving, drafting, and organizing emails.",
      "Keep responses concise. Do not repeat email content unless asked.",
    )

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemParts.join("\n") },
    ]

    for (const msg of this.messages()) {
      messages.push({ role: msg.role, content: msg.content })
    }

    return messages
  }

  private streamResponse(messages: Array<{ role: string; content: string }>): void {
    this.isStreaming.set(true)
    let responseText = ""

    const assistantMsg: ChatMessage = { role: "assistant", content: "" }
    this.messages.update(msgs => [...msgs, assistantMsg])

    this.streaming.streamChat(messages).subscribe({
      next: (chunk: StreamChunk) => {
        if (chunk.type === "text" && chunk.text) {
          responseText += chunk.text
          this.messages.update(msgs => {
            const updated = [...msgs]
            updated[updated.length - 1] = { ...assistantMsg, content: responseText }
            return updated
          })
          this.scrollToBottom()
        }
      },
      complete: () => {
        this.isStreaming.set(false)
      },
      error: () => {
        this.isStreaming.set(false)
      },
    })
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement
      if (el) el.scrollTop = el.scrollHeight
    }, 10)
  }
}
