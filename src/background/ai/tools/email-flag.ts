/**
 * Tool: tag_emails - Add or remove tags on emails.
 */

import type { AIToolDefinition } from "../types"

export const TAG_EMAILS_TOOL: AIToolDefinition = {
  name: "tag_emails",
  description: "Add or remove tags on emails",
  parameters: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "number" },
        description: "Message IDs to update",
      },
      addTags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to add",
      },
      removeTags: {
        type: "array",
        items: { type: "string" },
        description: "Tags to remove",
      },
    },
    required: ["messageIds"],
  },
}

export async function tagEmails(args: Record<string, unknown>): Promise<unknown> {
  const messageIds = args.messageIds as number[]
  const addTags = (args.addTags as string[]) ?? []
  const removeTags = (args.removeTags as string[]) ?? []

  let updated = 0

  for (const id of messageIds) {
    try {
      const msg = await messenger.messages.get(id)
      let tags = [...msg.tags]

      for (const tag of addTags) {
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      }

      tags = tags.filter(t => !removeTags.includes(t))

      await messenger.messages.update(id, { tags })
      updated++
    } catch {
      // Skip individual failures
    }
  }

  return { updated }
}
