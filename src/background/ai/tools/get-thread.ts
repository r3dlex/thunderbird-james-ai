/**
 * Tool: get_thread - Get all messages in the same conversation thread.
 */

import type { AIToolDefinition } from "../types"

export const GET_THREAD_TOOL: AIToolDefinition = {
  name: "get_thread",
  description: "Get all messages in the same conversation thread",
  parameters: {
    type: "object",
    properties: {
      messageId: { type: "number", description: "Message ID" },
    },
    required: ["messageId"],
  },
}

export async function getThread(args: Record<string, unknown>): Promise<unknown> {
  const messageId = args.messageId as number

  const header = await messenger.messages.get(messageId)
  const full = await messenger.messages.getFull(messageId)

  // Extract References and In-Reply-To headers to find thread
  const headers = full.headers ?? {}
  const references = headers["references"]?.[0]?.split(/\s+/) ?? []
  const inReplyTo = headers["in-reply-to"]?.[0]

  // Collect all message IDs in the thread
  const threadMessageIds = new Set<string>()
  threadMessageIds.add(header.headerMessageId)
  for (const ref of references) {
    threadMessageIds.add(ref.trim())
  }
  if (inReplyTo) {
    threadMessageIds.add(inReplyTo.trim())
  }

  // Search for all messages in the thread
  const threadMessages: Array<{
    id: number
    subject: string
    from: string
    date: string
    snippet: string
  }> = []

  for (const msgId of threadMessageIds) {
    try {
      const list = await messenger.messages.query({ headerMessageId: msgId })
      for (const msg of list.messages) {
        if (!threadMessages.some(m => m.id === msg.id)) {
          threadMessages.push({
            id: msg.id,
            subject: msg.subject,
            from: msg.author,
            date: msg.date.toISOString(),
            snippet: msg.subject.slice(0, 100),
          })
        }
      }
    } catch {
      // Skip messages we cannot find
    }
  }

  // Sort chronologically
  threadMessages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return threadMessages
}
