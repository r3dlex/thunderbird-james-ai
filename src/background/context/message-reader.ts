/**
 * Read message content, headers, and metadata for AI context.
 */

export interface MessageContext {
  id: number
  subject: string
  from: string
  to: string[]
  cc: string[]
  date: string
  body: string
  headerMessageId: string
  references: string[]
}

export async function readMessage(messageId: number): Promise<MessageContext> {
  const header = await messenger.messages.get(messageId)
  const full = await messenger.messages.getFull(messageId)

  const body = extractPlainText(full)
  const headers = full.headers ?? {}
  const references = headers["references"]?.[0]?.split(/\s+/).map(r => r.trim()) ?? []

  return {
    id: header.id,
    subject: header.subject,
    from: header.author,
    to: header.recipients,
    cc: header.ccList,
    date: header.date.toISOString(),
    body,
    headerMessageId: header.headerMessageId,
    references,
  }
}

function extractPlainText(part: messenger.messages.MessagePart): string {
  if (part.contentType === "text/plain" && part.body) {
    return part.body
  }

  if (part.parts) {
    for (const sub of part.parts) {
      if (sub.contentType === "text/plain" && sub.body) {
        return sub.body
      }
    }
    for (const sub of part.parts) {
      const result = extractPlainText(sub)
      if (result) return result
    }
  }

  // Fall back to HTML body stripped of tags
  if (part.contentType === "text/html" && part.body) {
    return part.body.replace(/<[^>]*>/g, "").trim()
  }

  return part.body ?? ""
}
