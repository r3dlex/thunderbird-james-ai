/**
 * Tool: create_draft - Create a draft email.
 */

import type { AIToolDefinition } from "../types"

export const CREATE_DRAFT_TOOL: AIToolDefinition = {
  name: "create_draft",
  description: "Create a draft email reply or new message",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["reply", "replyAll", "forward", "new"],
        description: "Type of draft to create",
      },
      originalMessageId: {
        type: "number",
        description: "Original message ID (required for reply/forward)",
      },
      to: {
        type: "array",
        items: { type: "string" },
        description: "Recipients (required for new)",
      },
      subject: { type: "string", description: "Email subject" },
      body: { type: "string", description: "Email body (plain text or HTML)" },
    },
    required: ["type", "body"],
  },
}

export async function createDraft(args: Record<string, unknown>): Promise<unknown> {
  const type = args.type as string
  const body = args.body as string
  const originalMessageId = args.originalMessageId as number | undefined
  const subject = args.subject as string | undefined
  const to = args.to as string[] | undefined

  let tab: messenger.tabs.Tab

  switch (type) {
    case "reply":
      if (!originalMessageId) throw new Error("originalMessageId required for reply")
      tab = await messenger.compose.beginReply(originalMessageId, "replyToSender")
      break
    case "replyAll":
      if (!originalMessageId) throw new Error("originalMessageId required for replyAll")
      tab = await messenger.compose.beginReply(originalMessageId, "replyToAll")
      break
    case "forward":
      if (!originalMessageId) throw new Error("originalMessageId required for forward")
      tab = await messenger.compose.beginForward(originalMessageId, "forwardInline")
      break
    case "new":
      tab = await messenger.compose.beginNew(undefined, {
        to: to ?? [],
        subject: subject ?? "",
      })
      break
    default:
      throw new Error(`Unknown draft type: ${type}`)
  }

  if (!tab.id) throw new Error("Failed to open compose tab")

  const details: messenger.compose.ComposeDetails = { body }
  if (subject && type === "new") {
    details.subject = subject
  }

  await messenger.compose.setComposeDetails(tab.id, details)

  return { draftId: tab.id, status: "created" }
}
