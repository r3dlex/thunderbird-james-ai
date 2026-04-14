import DOMPurify from "dompurify"
import { marked } from "marked"
import type {
  AIMessage,
  AIToolCall,
  AttachmentInfo,
  GetMessageContextResponse,
  MessageContext,
} from "../../lib/contracts.js"

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export interface ChatActionCard {
  id: string
  label: string
  type: string
  summary: string
}

export interface EmailContextSummary {
  subject: string
  from: string
  threadCount: number
  attachments: AttachmentInfo[]
  message: MessageContext
}

function truncate(value: string, limit = 72): string {
  const normalized = value.trim()
  if (normalized.length <= limit) return normalized
  return `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function humanizeToolName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, char => char.toUpperCase())
}

function summarizeToolArguments(argumentsMap: Record<string, unknown>): string {
  const summaryParts = Object.entries(argumentsMap)
    .filter(([, value]) => value !== undefined && value !== null && `${value}`.trim().length > 0)
    .slice(0, 2)
    .map(([key, value]) => `${humanizeToolName(key)}: ${truncate(String(value), 36)}`)

  return summaryParts.length > 0 ? summaryParts.join(" · ") : "Tool call in progress"
}

export function mapToolCallToActionCard(toolCall: AIToolCall): ChatActionCard {
  return {
    id: toolCall.id,
    type: toolCall.name,
    label: humanizeToolName(toolCall.name),
    summary: summarizeToolArguments(toolCall.arguments),
  }
}

export function renderMarkdownToHtml(value: string): string {
  if (!value) return ""
  const html = marked.parse(value, { async: false }) as string
  return DOMPurify.sanitize(html)
}

export function buildChatPrompt(
  history: ChatMessage[],
  emailContext: EmailContextSummary | null,
  threadContext: string,
): AIMessage[] {
  const systemParts = [
    "You are Corvus, an email assistant integrated into Thunderbird.",
  ]

  if (emailContext) {
    systemParts.push(`\nCURRENT EMAIL:\nFrom: ${emailContext.from}\nSubject: ${emailContext.subject}`)

    if (threadContext.trim().length > 0) {
      systemParts.push(`\nTHREAD HISTORY:\n${threadContext}`)
    }
  }

  systemParts.push(
    "\nYou have access to tools for searching, moving, drafting, and organizing emails.",
    "Keep responses concise. Do not repeat email content unless asked.",
  )

  return [
    { role: "system", content: systemParts.join("\n") },
    ...history.map(message => ({
      role: message.role,
      content: message.content,
    })),
  ]
}

export function parseEmailContext(
  response: GetMessageContextResponse,
): { emailContext: EmailContextSummary | null; threadContext: string } {
  if (
    "error" in response && response.error
    || !response.message
    || !response.thread
    || !response.attachments
  ) {
    return { emailContext: null, threadContext: "" }
  }

  return {
    emailContext: {
      subject: response.message.subject,
      from: response.message.from,
      threadCount: response.thread.totalCount,
      attachments: response.attachments,
      message: response.message,
    },
    threadContext: response.thread.formatted ?? "",
  }
}
