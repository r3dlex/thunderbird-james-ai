/**
 * Reconstruct conversation threads from References/In-Reply-To headers.
 */

import { readMessage, type MessageContext } from "./message-reader"

export interface ThreadContext {
  messages: MessageContext[]
  totalCount: number
}

const MAX_THREAD_MESSAGES = 5

export async function buildThread(messageId: number): Promise<ThreadContext> {
  const root = await readMessage(messageId)
  const allMessageIds = new Set<string>()
  allMessageIds.add(root.headerMessageId)

  for (const ref of root.references) {
    if (ref) allMessageIds.add(ref)
  }

  const threadMessages: MessageContext[] = [root]

  for (const msgId of allMessageIds) {
    if (msgId === root.headerMessageId) continue

    try {
      const list = await messenger.messages.query({ headerMessageId: msgId })
      for (const header of list.messages) {
        if (!threadMessages.some(m => m.id === header.id)) {
          const ctx = await readMessage(header.id)
          threadMessages.push(ctx)
        }
      }
    } catch {
      // Skip unreachable messages
    }
  }

  // Sort chronologically, newest first
  threadMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    messages: threadMessages.slice(0, MAX_THREAD_MESSAGES),
    totalCount: threadMessages.length,
  }
}

export function formatThreadForPrompt(thread: ThreadContext): string {
  if (thread.messages.length <= 1) {
    return "(No prior messages in thread)"
  }

  // Skip the first message (it is the current one, shown separately)
  return thread.messages
    .slice(1)
    .map(msg =>
      `From: ${msg.from}\nDate: ${msg.date}\nSubject: ${msg.subject}\n---\n${msg.body.slice(0, 500)}`
    )
    .join("\n\n")
}
