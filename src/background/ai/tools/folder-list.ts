/**
 * Tool: list_folders - List all mail folders.
 */

import type { AIToolDefinition } from "../types"

export const LIST_FOLDERS_TOOL: AIToolDefinition = {
  name: "list_folders",
  description: "List all mail folders for the active account",
  parameters: {
    type: "object",
    properties: {},
  },
}

export async function listFolders(): Promise<unknown> {
  const accounts = await messenger.accounts.list()
  const result: Array<{ id: string; name: string; path: string; type?: string }> = []

  for (const account of accounts) {
    const folders = await messenger.folders.getSubFolders(account, true)
    flattenFolders(folders, result, account.id)
  }

  return result
}

function flattenFolders(
  folders: messenger.folders.MailFolder[],
  result: Array<{ id: string; name: string; path: string; type?: string }>,
  accountId: string
): void {
  for (const folder of folders) {
    result.push({
      id: `${accountId}/${folder.path}`,
      name: folder.name ?? folder.path,
      path: folder.path,
      type: folder.type,
    })
    if (folder.subFolders?.length) {
      flattenFolders(folder.subFolders, result, accountId)
    }
  }
}
