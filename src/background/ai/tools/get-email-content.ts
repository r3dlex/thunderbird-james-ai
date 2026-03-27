/**
 * Tool: get_email_content - Get full content of a specific email.
 */

import type { AIToolDefinition } from "../types"

export const GET_EMAIL_CONTENT_TOOL: AIToolDefinition = {
  name: "get_email_content",
  description: "Get the full content of a specific email",
  parameters: {
    type: "object",
    properties: {
      messageId: { type: "number", description: "Message ID" },
      includeAttachmentList: {
        type: "boolean",
        description: "Include list of attachments",
      },
    },
    required: ["messageId"],
  },
}

export async function getEmailContent(args: Record<string, unknown>): Promise<unknown> {
  const messageId = args.messageId as number
  const includeAttachments = (args.includeAttachmentList as boolean) ?? false

  const header = await messenger.messages.get(messageId)
  const full = await messenger.messages.getFull(messageId)

  const body = extractBody(full)
  const attachments = includeAttachments ? extractAttachments(full) : []

  return {
    subject: header.subject,
    from: header.author,
    to: header.recipients,
    cc: header.ccList,
    date: header.date.toISOString(),
    body,
    attachments,
  }
}

function extractBody(part: messenger.messages.MessagePart): string {
  // Prefer plain text, fall back to HTML
  if (part.contentType === "text/plain" && part.body) {
    return part.body
  }

  if (part.parts) {
    // First pass: look for text/plain
    for (const sub of part.parts) {
      if (sub.contentType === "text/plain" && sub.body) {
        return sub.body
      }
    }
    // Second pass: look for text/html
    for (const sub of part.parts) {
      if (sub.contentType === "text/html" && sub.body) {
        return sub.body
      }
    }
    // Recurse
    for (const sub of part.parts) {
      const result = extractBody(sub)
      if (result) return result
    }
  }

  return part.body ?? ""
}

function extractAttachments(part: messenger.messages.MessagePart): Array<{ name: string; contentType: string; size: number }> {
  const attachments: Array<{ name: string; contentType: string; size: number }> = []

  if (part.name && part.contentType && !part.contentType.startsWith("text/") && !part.contentType.startsWith("multipart/")) {
    attachments.push({
      name: part.name,
      contentType: part.contentType,
      size: part.size ?? 0,
    })
  }

  if (part.parts) {
    for (const sub of part.parts) {
      attachments.push(...extractAttachments(sub))
    }
  }

  return attachments
}
