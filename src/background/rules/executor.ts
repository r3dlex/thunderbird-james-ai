/**
 * Rule action execution.
 */

import type { RuleAction, RuleMatchContext } from "./types"

const AUTO_REPLY_SENT_KEY = "corvus_auto_reply_sent"

export async function executeActions(
  actions: RuleAction[],
  context: RuleMatchContext
): Promise<void> {
  for (const action of actions) {
    await executeAction(action, context)
  }
}

async function executeAction(action: RuleAction, context: RuleMatchContext): Promise<void> {
  switch (action.type) {
    case "move":
      await executeMove(action, context)
      break
    case "tag":
      await executeTag(action, context)
      break
    case "flag":
      await executeFlag(context)
      break
    case "markRead":
      await executeMarkRead(context)
      break
    case "autoReply":
      await executeAutoReply(action, context)
      break
    case "forward":
      await executeForward(action, context)
      break
    case "notify":
      await executeNotify(action)
      break
  }
}

async function executeMove(action: RuleAction, context: RuleMatchContext): Promise<void> {
  const folderName = action.params.folder
  if (!folderName) return

  const accounts = await messenger.accounts.list()
  for (const account of accounts) {
    const folders = await messenger.folders.getSubFolders(account, true)
    const target = findFolder(folders, folderName)
    if (target) {
      await messenger.messages.move([context.messageId], target)
      return
    }
  }
}

async function executeTag(action: RuleAction, context: RuleMatchContext): Promise<void> {
  const tag = action.params.tag
  if (!tag) return

  const msg = await messenger.messages.get(context.messageId)
  const tags = [...msg.tags]
  if (!tags.includes(tag)) {
    tags.push(tag)
    await messenger.messages.update(context.messageId, { tags })
  }
}

async function executeFlag(context: RuleMatchContext): Promise<void> {
  await messenger.messages.update(context.messageId, { flagged: true })
}

async function executeMarkRead(context: RuleMatchContext): Promise<void> {
  await messenger.messages.update(context.messageId, { read: true })
}

async function executeAutoReply(action: RuleAction, context: RuleMatchContext): Promise<void> {
  const body = action.params.body
  if (!body) return

  // Check onlyOnce deduplication
  if (action.params.onlyOnce === "true") {
    const sent = await getAutoReplySent()
    const senderKey = `${action.params.templateId ?? "default"}_${context.from}`
    if (sent.has(senderKey)) return
    sent.add(senderKey)
    await saveAutoReplySent(sent)
  }

  const tab = await messenger.compose.beginReply(context.messageId, "replyToSender")
  if (!tab.id) return

  await messenger.compose.setComposeDetails(tab.id, { body })
  await messenger.compose.sendMessage(tab.id, { mode: "sendNow" })
}

async function executeForward(action: RuleAction, context: RuleMatchContext): Promise<void> {
  const to = action.params.to
  if (!to) return

  const tab = await messenger.compose.beginForward(context.messageId, "forwardInline")
  if (!tab.id) return

  await messenger.compose.setComposeDetails(tab.id, { to: [to] })
  await messenger.compose.sendMessage(tab.id, { mode: "sendNow" })
}

async function executeNotify(action: RuleAction): Promise<void> {
  const title = action.params.title ?? "Corvus"
  const message = action.params.message ?? ""

  await messenger.notifications.create(`corvus_rule_${Date.now()}`, {
    type: "basic",
    title,
    message,
  })
}

async function getAutoReplySent(): Promise<Set<string>> {
  const data = await messenger.storage.local.get(AUTO_REPLY_SENT_KEY)
  const list = (data[AUTO_REPLY_SENT_KEY] as string[]) ?? []
  return new Set(list)
}

async function saveAutoReplySent(sent: Set<string>): Promise<void> {
  await messenger.storage.local.set({ [AUTO_REPLY_SENT_KEY]: Array.from(sent) })
}

function findFolder(
  folders: messenger.folders.MailFolder[],
  name: string
): messenger.folders.MailFolder | null {
  for (const folder of folders) {
    if (folder.name?.toLowerCase() === name.toLowerCase()) return folder
    if (folder.subFolders?.length) {
      const found = findFolder(folder.subFolders, name)
      if (found) return found
    }
  }
  return null
}
