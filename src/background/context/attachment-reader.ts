/**
 * Extract attachment metadata from messages.
 */

export interface AttachmentInfo {
  name: string
  contentType: string
  size: number
}

export async function getAttachments(messageId: number): Promise<AttachmentInfo[]> {
  const full = await messenger.messages.getFull(messageId)
  return extractAttachments(full)
}

function extractAttachments(part: messenger.messages.MessagePart): AttachmentInfo[] {
  const attachments: AttachmentInfo[] = []

  const isAttachment = part.name &&
    part.contentType &&
    !part.contentType.startsWith("text/") &&
    !part.contentType.startsWith("multipart/")

  if (isAttachment) {
    attachments.push({
      name: part.name!,
      contentType: part.contentType!,
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
