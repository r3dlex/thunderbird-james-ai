/**
 * Batch email operations: move, tag, delete, archive.
 */

export interface BatchResult {
  operation: string
  total: number
  succeeded: number
  failed: number
}

export async function batchMove(
  messageIds: number[],
  folder: messenger.folders.MailFolder
): Promise<BatchResult> {
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < messageIds.length; i += 50) {
    const batch = messageIds.slice(i, i + 50)
    try {
      await messenger.messages.move(batch, folder)
      succeeded += batch.length
    } catch {
      failed += batch.length
    }
  }

  return { operation: "move", total: messageIds.length, succeeded, failed }
}

export async function batchTag(
  messageIds: number[],
  addTags: string[],
  removeTags: string[]
): Promise<BatchResult> {
  let succeeded = 0
  let failed = 0

  for (const id of messageIds) {
    try {
      const msg = await messenger.messages.get(id)
      let tags = [...msg.tags]
      for (const tag of addTags) {
        if (!tags.includes(tag)) tags.push(tag)
      }
      tags = tags.filter(t => !removeTags.includes(t))
      await messenger.messages.update(id, { tags })
      succeeded++
    } catch {
      failed++
    }
  }

  return { operation: "tag", total: messageIds.length, succeeded, failed }
}

export async function batchMarkRead(messageIds: number[], read: boolean): Promise<BatchResult> {
  let succeeded = 0
  let failed = 0

  for (const id of messageIds) {
    try {
      await messenger.messages.update(id, { read })
      succeeded++
    } catch {
      failed++
    }
  }

  return { operation: "markRead", total: messageIds.length, succeeded, failed }
}

export async function batchDelete(messageIds: number[]): Promise<BatchResult> {
  let succeeded = 0
  let failed = 0

  for (let i = 0; i < messageIds.length; i += 50) {
    const batch = messageIds.slice(i, i + 50)
    try {
      await messenger.messages.delete_(batch)
      succeeded += batch.length
    } catch {
      failed += batch.length
    }
  }

  return { operation: "delete", total: messageIds.length, succeeded, failed }
}
