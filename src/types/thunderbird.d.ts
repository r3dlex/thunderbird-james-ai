/**
 * Type declarations for Thunderbird MailExtension APIs (messenger.*)
 * Based on Thunderbird 128+ WebExtension API surface.
 */

declare namespace messenger {
  // --- Storage ---
  namespace storage {
    namespace local {
      function get(keys?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>
      function set(items: Record<string, unknown>): Promise<void>
      function remove(keys: string | string[]): Promise<void>
      function clear(): Promise<void>
    }
  }

  // --- Runtime ---
  namespace runtime {
    function sendMessage(message: unknown): Promise<unknown>
    function getURL(path: string): string

    interface Port {
      name: string
      postMessage(message: unknown): void
      onMessage: EventListener<(message: unknown, port: Port) => void>
      onDisconnect: EventListener<(port: Port) => void>
      disconnect(): void
    }

    function connect(connectInfo?: { name?: string }): Port

    const onMessage: EventListener<
      (message: unknown, sender: MessageSender, sendResponse: (response?: unknown) => void) => boolean | void | Promise<unknown>
    >

    const onConnect: EventListener<(port: Port) => void>

    interface MessageSender {
      tab?: tabs.Tab
      url?: string
      id?: string
    }
  }

  // --- Messages ---
  namespace messages {
    interface MessageHeader {
      id: number
      date: Date
      author: string
      recipients: string[]
      ccList: string[]
      bccList: string[]
      subject: string
      read: boolean
      flagged: boolean
      tags: string[]
      folder: folders.MailFolder
      headerMessageId: string
      references?: string[]
    }

    interface MessagePart {
      body?: string
      contentType?: string
      headers?: Record<string, string[]>
      name?: string
      partName?: string
      parts?: MessagePart[]
      size?: number
    }

    interface MessageList {
      id?: string
      messages: MessageHeader[]
    }

    function get(messageId: number): Promise<MessageHeader>
    function getFull(messageId: number): Promise<MessagePart>
    function getRaw(messageId: number): Promise<string>
    function query(queryInfo: MessageQuery): Promise<MessageList>
    function move(messageIds: number[], destination: folders.MailFolder): Promise<void>
    function delete_(messageIds: number[], skipTrash?: boolean): Promise<void>
    function update(messageId: number, newProperties: Partial<Pick<MessageHeader, "read" | "flagged" | "tags">>): Promise<void>
    function listTags(): Promise<MessageTag[]>
    function continueList(messageListId: string): Promise<MessageList>

    interface MessageQuery {
      accountId?: string
      folderId?: string
      subject?: string
      body?: string
      author?: string
      recipients?: string
      fromDate?: Date
      toDate?: Date
      unread?: boolean
      flagged?: boolean
      tags?: MessageTagFilter
      headerMessageId?: string
    }

    interface MessageTag {
      key: string
      tag: string
      color: string
      ordinal: string
    }

    interface MessageTagFilter {
      mode: "all" | "any"
      tags: Record<string, boolean>
    }

    const onNewMailReceived: EventListener<
      (folder: folders.MailFolder, messages: MessageList) => void
    >
  }

  // --- Message Display ---
  namespace messageDisplay {
    function getDisplayedMessage(tabId: number): Promise<messages.MessageHeader | null>
    function getDisplayedMessages(tabId: number): Promise<messages.MessageHeader[]>

    const onMessageDisplayed: EventListener<
      (tab: tabs.Tab, message: messages.MessageHeader) => void
    >
  }

  // --- Folders ---
  namespace folders {
    interface MailFolder {
      accountId: string
      path: string
      name?: string
      type?: string
      subFolders?: MailFolder[]
    }

    function getSubFolders(folderOrAccount: MailFolder | accounts.MailAccount, includeSubFolders?: boolean): Promise<MailFolder[]>
    function get(folderId: string): Promise<MailFolder>
    function create(parentFolder: MailFolder, childName: string): Promise<MailFolder>
    function rename(folder: MailFolder, newName: string): Promise<MailFolder>
    function delete_(folder: MailFolder): Promise<void>
  }

  // --- Accounts ---
  namespace accounts {
    interface MailAccount {
      id: string
      name: string
      type: string
      identities: MailIdentity[]
      rootFolder: folders.MailFolder
    }

    interface MailIdentity {
      accountId: string
      composeHtml: boolean
      email: string
      id: string
      label: string
      name: string
      replyTo: string
      organization: string
      signature: string
      signatureIsPlainText: boolean
    }

    function list(): Promise<MailAccount[]>
    function get(accountId: string): Promise<MailAccount>
    function getDefault(): Promise<MailAccount>
  }

  // --- Compose ---
  namespace compose {
    interface ComposeDetails {
      body?: string
      plainTextBody?: string
      isPlainText?: boolean
      to?: ComposeRecipient[]
      cc?: ComposeRecipient[]
      bcc?: ComposeRecipient[]
      subject?: string
      replyTo?: ComposeRecipient[]
      from?: ComposeRecipient
      identityId?: string
    }

    type ComposeRecipient = string | { id: string; type: "contact" | "mailingList" }

    function beginNew(messageId?: number, details?: ComposeDetails): Promise<tabs.Tab>
    function beginReply(messageId: number, replyType?: "replyToSender" | "replyToAll", details?: ComposeDetails): Promise<tabs.Tab>
    function beginForward(messageId: number, forwardType?: "forwardInline" | "forwardAsAttachment", details?: ComposeDetails): Promise<tabs.Tab>
    function getComposeDetails(tabId: number): Promise<ComposeDetails>
    function setComposeDetails(tabId: number, details: ComposeDetails): Promise<void>
    function sendMessage(tabId: number, options?: { mode?: "default" | "sendNow" | "sendLater" }): Promise<{ headerMessageId?: string; messages: messages.MessageHeader[] }>
  }

  // --- Tabs ---
  namespace tabs {
    interface Tab {
      id?: number
      index: number
      windowId: number
      active: boolean
      type?: string
      mailTab?: boolean
    }

    function query(queryInfo: Partial<Tab>): Promise<Tab[]>
    function get(tabId: number): Promise<Tab>
    function getCurrent(): Promise<Tab>
  }

  // --- Windows ---
  namespace windows {
    function getCurrent(): Promise<{ id: number; focused: boolean }>
  }

  // --- Alarms ---
  namespace alarms {
    interface Alarm {
      name: string
      scheduledTime: number
      periodInMinutes?: number
    }

    function create(name: string, alarmInfo: { delayInMinutes?: number; periodInMinutes?: number; when?: number }): void
    function clear(name: string): Promise<boolean>
    function clearAll(): Promise<boolean>
    function get(name: string): Promise<Alarm | undefined>
    function getAll(): Promise<Alarm[]>

    const onAlarm: EventListener<(alarm: Alarm) => void>
  }

  // --- Notifications ---
  namespace notifications {
    function create(notificationId: string, options: {
      type: "basic"
      title: string
      message: string
      iconUrl?: string
    }): Promise<string>

    function clear(notificationId: string): Promise<boolean>
  }

  // --- Menus ---
  namespace menus {
    function create(createProperties: {
      id: string
      title: string
      contexts: string[]
      onclick?: (info: OnClickData) => void
    }): number | string

    function remove(menuItemId: number | string): Promise<void>
    function removeAll(): Promise<void>

    interface OnClickData {
      menuItemId: number | string
      selectedMessages?: messages.MessageList
    }

    const onClicked: EventListener<(info: OnClickData, tab: tabs.Tab) => void>
  }

  // --- i18n ---
  namespace i18n {
    function getMessage(messageName: string, substitutions?: string | string[]): string
    function getUILanguage(): string
  }
}

// Generic event listener type
interface EventListener<T extends (...args: never[]) => unknown> {
  addListener(callback: T): void
  removeListener(callback: T): void
  hasListener(callback: T): boolean
}
