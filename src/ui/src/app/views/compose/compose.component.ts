import { Component, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { BridgeService } from "../../services/bridge.service"
import { StreamingService, type StreamChunk } from "../../services/streaming.service"
import { SuggestionCardComponent } from "./suggestion-card.component"
import { LoadingIndicatorComponent } from "../../shared/components/loading-indicator.component"
import { MessageBubbleComponent } from "../chat/message-bubble.component"

@Component({
  selector: "corvus-compose",
  standalone: true,
  imports: [CommonModule, FormsModule, SuggestionCardComponent, LoadingIndicatorComponent, MessageBubbleComponent],
  template: `
    <div class="compose-container">
      <div class="quick-actions">
        <corvus-suggestion-card
          label="Make more concise"
          (action)="applyQuickAction('Make the email body more concise. Keep the same meaning.')">
        </corvus-suggestion-card>
        <corvus-suggestion-card
          label="Make more formal"
          (action)="applyQuickAction('Make the email body more formal and professional.')">
        </corvus-suggestion-card>
        <corvus-suggestion-card
          label="Fix grammar"
          (action)="applyQuickAction('Fix any grammar or spelling issues in the email body.')">
        </corvus-suggestion-card>
        <corvus-suggestion-card
          label="Translate to English"
          (action)="applyQuickAction('Translate the email body to English.')">
        </corvus-suggestion-card>
        <corvus-suggestion-card
          label="Translate to German"
          (action)="applyQuickAction('Translate the email body to German.')">
        </corvus-suggestion-card>
      </div>

      <div class="response-area scroll-area" *ngIf="lastResponse()">
        <corvus-message-bubble role="assistant" [content]="lastResponse()"></corvus-message-bubble>
      </div>

      <corvus-loading *ngIf="isProcessing()"></corvus-loading>

      <div class="input-area">
        <input
          type="text"
          class="chat-input"
          [(ngModel)]="customInstruction"
          (keydown.enter)="applyCustomInstruction()"
          placeholder="Custom instruction..."
          [disabled]="isProcessing()">
        <button
          (click)="applyCustomInstruction()"
          [disabled]="!customInstruction.trim() || isProcessing()">
          Apply
        </button>
      </div>
    </div>
  `,
  styles: [`
    .compose-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 8px;
    }
    .response-area {
      flex: 1;
      padding: 8px;
    }
    .input-area {
      display: flex;
      gap: 6px;
      padding: 8px;
      border-top: 1px solid var(--corvus-border);
    }
    .chat-input { flex: 1; }
  `],
})
export class ComposeComponent {
  isProcessing = signal(false)
  lastResponse = signal("")
  customInstruction = ""

  constructor(
    private bridge: BridgeService,
    private streaming: StreamingService
  ) {}

  applyQuickAction(instruction: string): void {
    this.processInstruction(instruction)
  }

  applyCustomInstruction(): void {
    const text = this.customInstruction.trim()
    if (!text) return
    this.customInstruction = ""
    this.processInstruction(text)
  }

  private processInstruction(instruction: string): void {
    this.isProcessing.set(true)
    this.lastResponse.set("")

    const messages = [
      {
        role: "system",
        content: "You are Corvus, an email writing assistant. The user is composing an email. Apply the requested changes to improve the email. Return only the improved email body text, no explanations.",
      },
      { role: "user", content: instruction },
    ]

    let responseText = ""
    this.streaming.streamChat(messages).subscribe({
      next: (chunk: StreamChunk) => {
        if (chunk.type === "text" && chunk.text) {
          responseText += chunk.text
          this.lastResponse.set(responseText)
        }
      },
      complete: () => this.isProcessing.set(false),
      error: () => this.isProcessing.set(false),
    })
  }
}
