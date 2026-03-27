/**
 * Tool: move_emails - Move messages to a specified folder.
 */

import type { AIToolDefinition } from "../types"

export const MOVE_EMAILS_TOOL: AIToolDefinition = {
  name: "move_emails",
  description: "Move one or more emails to a specified folder",
  parameters: {
    type: "object",
    properties: {
      messageIds: {
        type: "array",
        items: { type: "number" },
        description: "Message IDs to move",
      },
      destinationFolder: {
        type: "string",
        description: "Target folder name",
      },
    },
    required: ["messageIds", "destinationFolder"],
  },
}

export async function moveEmails(args: Record<string, unknown>): Promise<unknown> {
  const messageIds = args.messageIds as number[]
  const destinationFolder = args.destinationFolder as string

  // Find the destination folder
  const accounts = await messenger.accounts.list()
  let targetFolder: messenger.folders.MailFolder | null = null

  for (const account of accounts) {
    const folders = await messenger.folders.getSubFolders(account, true)
    targetFolder = findFolder(folders, destinationFolder)
    if (targetFolder) break
  }

  if (!targetFolder) {
    throw new Error(`Folder not found: ${destinationFolder}`)
  }

  let moved = 0
  let failed = 0

  // Move in batches of 50
  for (let i = 0; i < messageIds.length; i += 50) {
    const batch = messageIds.slice(i, i + 50)
    try {
      await messenger.messages.move(batch, targetFolder)
      moved += batch.length
    } catch {
      failed += batch.length
    }
  }

  return { moved, failed }
}

function findFolder(
  folders: messenger.folders.MailFolder[],
  name: string
): messenger.folders.MailFolder | null {
  for (const folder of folders) {
    if (folder.name?.toLowerCase() === name.toLowerCase()) {
      return folder
    }
    if (folder.subFolders?.length) {
      const found = findFolder(folder.subFolders, name)
      if (found) return found
    }
  }
  return null
}
