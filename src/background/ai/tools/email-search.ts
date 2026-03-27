/**
 * Tool: search_emails - Search the user's mailbox.
 */

import type { AIToolDefinition } from "../types"

export const SEARCH_EMAILS_TOOL: AIToolDefinition = {
  name: "search_emails",
  description: "Search the user's mailbox for emails matching a query",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search terms" },
      folder: { type: "string", description: "Folder name to search in (default: all)" },
      fromDate: { type: "string", description: "ISO date, search from this date" },
      limit: { type: "number", description: "Max results (default 10, max 50)" },
    },
    required: ["query"],
  },
}

export async function searchEmails(args: Record<string, unknown>): Promise<unknown> {
  const query = args.query as string
  const limit = Math.min((args.limit as number) ?? 10, 50)

  const queryInfo: Record<string, unknown> = {}

  // Build query from search terms - check subject and author
  if (query.includes("@")) {
    queryInfo.author = query
  } else {
    queryInfo.subject = query
  }

  if (args.fromDate) {
    queryInfo.fromDate = new Date(args.fromDate as string)
  }

  if (args.folder) {
    // Find the folder by name
    const accounts = await messenger.accounts.list()
    for (const account of accounts) {
      const folders = await messenger.folders.getSubFolders(account, true)
      const target = findFolder(folders, args.folder as string)
      if (target) {
        queryInfo.folderId = `${target.accountId}/${target.path}`
        break
      }
    }
  }

  const messageList = await messenger.messages.query(queryInfo as messenger.messages.MessageQuery)
  const results = messageList.messages.slice(0, limit).map(msg => ({
    id: msg.id,
    subject: msg.subject,
    from: msg.author,
    date: msg.date.toISOString(),
    snippet: msg.subject.slice(0, 100),
  }))

  return results
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
