# Tools

Tool definitions provided to AI providers for function calling. Each tool maps to one or more `messenger.*` API calls executed in the background script.

## Tool Definitions

### search_emails

Search messages across folders using Thunderbird's query API.

```typescript
{
  name: "search_emails",
  description: "Search emails by query text, sender, folder, or date range",
  parameters: {
    query: { type: "string", description: "Search text (subject, body, or sender)", required: true },
    folder: { type: "string", description: "Folder path to search in (e.g. '/INBOX')", required: false },
    fromDate: { type: "string", description: "ISO 8601 date, only return messages after this date", required: false },
    limit: { type: "number", description: "Max results to return (default 20, max 100)", required: false }
  }
}
```

**Returns**: `Array<{ id: number, subject: string, from: string, date: string, snippet: string }>`

**Implementation**: Calls `messenger.messages.query()` with mapped parameters. Uses `messenger.messages.continueList()` for pagination up to `limit`. The `snippet` field is the first 200 characters of the plain-text body.

---

### move_emails

Move messages to a destination folder.

```typescript
{
  name: "move_emails",
  description: "Move one or more emails to a destination folder",
  parameters: {
    messageIds: { type: "array", items: { type: "number" }, description: "Array of message IDs to move", required: true },
    destinationFolder: { type: "string", description: "Target folder path (e.g. '/Archive')", required: true }
  }
}
```

**Returns**: `{ moved: number, failed: number }`

**Implementation**: Resolves the destination folder via `messenger.folders.get()`, then calls `messenger.messages.move()`. Operations on more than 10 messages require batch confirmation from the UI.

---

### create_draft

Create a new draft message (reply, forward, or new).

```typescript
{
  name: "create_draft",
  description: "Create a draft email. Does not send.",
  parameters: {
    type: { type: "string", enum: ["reply", "replyAll", "forward", "new"], description: "Draft type", required: true },
    originalMessageId: { type: "number", description: "Message ID to reply to or forward (required for reply/replyAll/forward)", required: false },
    to: { type: "array", items: { type: "string" }, description: "Recipient addresses (required for new)", required: false },
    subject: { type: "string", description: "Subject line (required for new)", required: false },
    body: { type: "string", description: "Message body (HTML or plain text)", required: true }
  }
}
```

**Returns**: `{ draftId: number, status: "created" }`

**Implementation**: Dispatches to `messenger.compose.beginReply()`, `messenger.compose.beginForward()`, or `messenger.compose.beginNew()` based on `type`. Sets compose details via `messenger.compose.setComposeDetails()`. Never calls `messenger.compose.sendMessage()`.

---

### list_folders

List all mail folders across all accounts.

```typescript
{
  name: "list_folders",
  description: "List all mail folders with unread counts",
  parameters: {}
}
```

**Returns**: `Array<{ id: string, name: string, path: string, unreadCount: number }>`

**Implementation**: Calls `messenger.accounts.list()`, then `messenger.folders.getSubFolders()` recursively for each account. Unread counts are derived from `messenger.messages.query({ folderId, unread: true })`.

---

### tag_emails

Add or remove tags on messages.

```typescript
{
  name: "tag_emails",
  description: "Add or remove tags on one or more emails",
  parameters: {
    messageIds: { type: "array", items: { type: "number" }, description: "Array of message IDs", required: true },
    addTags: { type: "array", items: { type: "string" }, description: "Tag keys to add", required: false },
    removeTags: { type: "array", items: { type: "string" }, description: "Tag keys to remove", required: false }
  }
}
```

**Returns**: `{ updated: number }`

**Implementation**: For each message, reads current tags via `messenger.messages.get()`, computes the new tag set, and calls `messenger.messages.update()` with the merged `tags` array.

---

### get_email_content

Retrieve full content of a single message.

```typescript
{
  name: "get_email_content",
  description: "Get the full content of an email by ID",
  parameters: {
    messageId: { type: "number", description: "Message ID", required: true },
    includeAttachmentList: { type: "boolean", description: "Include attachment metadata (default false)", required: false }
  }
}
```

**Returns**: `{ subject: string, from: string, to: string[], cc: string[], date: string, body: string, attachments: Array<{ name: string, size: number, contentType: string }> }`

**Implementation**: Calls `messenger.messages.get()` for headers and `messenger.messages.getFull()` for the MIME tree. Extracts the plain-text or HTML body part. Attachment metadata is gathered from MIME parts with a `name` field; actual attachment content is not retrieved.

---

### get_thread

Retrieve all messages in a conversation thread.

```typescript
{
  name: "get_thread",
  description: "Get all messages in a thread, ordered chronologically",
  parameters: {
    messageId: { type: "number", description: "Any message ID in the thread", required: true }
  }
}
```

**Returns**: `Array<{ id: number, subject: string, from: string, to: string[], date: string, body: string }>`

**Implementation**: Reads the `references` and `headerMessageId` fields from the seed message, then queries for all messages sharing the same `headerMessageId` chain via `messenger.messages.query()`. Results are sorted by date ascending.

## Error Handling

All tool results include an `is_error` flag when the operation fails:

```typescript
{
  is_error: true,
  error: "Folder '/NonExistent' not found"
}
```

The AI provider receives these errors as tool results and can retry or inform the user.
