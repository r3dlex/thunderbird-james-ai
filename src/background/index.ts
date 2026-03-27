/**
 * Corvus background script entry point.
 * Registers event listeners, sets up alarms, handles message routing.
 */

import { evaluateMessage } from "./rules/engine"
import { setupRuleScheduler } from "./rules/scheduler"
import { chat, streamChat, getActiveProvider } from "./ai/router"
import { readMessage } from "./context/message-reader"
import { buildThread, formatThreadForPrompt } from "./context/thread-builder"
import { getAttachments } from "./context/attachment-reader"
import { unlockSession, isSessionUnlocked, lockSession } from "./storage/crypto"
import {
  loadProviderConfig,
  loadAllProviderConfigs,
  saveProviderConfig,
  removeProviderConfig,
  getActiveProviderId,
  setActiveProviderId,
  isFirstRunAcknowledged,
  acknowledgeFirstRun,
  loadSettings,
} from "./storage/settings"
import { loadRules, addRule, updateRule, removeRule, toggleRule } from "./storage/rules-store"
import { cacheStats, cacheClear } from "./storage/cache"
import type { AIMessage } from "./ai/types"

// --- Event Listeners ---

// New mail: evaluate rules
messenger.messages.onNewMailReceived.addListener((_folder, messages) => {
  for (const msg of messages.messages) {
    evaluateMessage(msg.id).catch(err => {
      console.error("Rule evaluation error for message", msg.id, err)
    })
  }
})

// Setup periodic rule evaluation
setupRuleScheduler()

// --- Message Routing (UI <-> Background) ---

messenger.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  const msg = message as { type: string; payload?: unknown }

  switch (msg.type) {
    case "chat":
      return handleChat(msg.payload as { messages: AIMessage[] })

    case "getMessageContext":
      return handleGetMessageContext(msg.payload as { tabId: number })

    case "unlockSession":
      return handleUnlockSession(msg.payload as { passphrase: string })

    case "isSessionUnlocked":
      return Promise.resolve({ unlocked: isSessionUnlocked() })

    case "lockSession":
      lockSession()
      return Promise.resolve({ ok: true })

    case "getActiveProvider":
      return getActiveProviderId().then(id => ({ providerId: id }))

    case "setActiveProvider":
      return setActiveProviderId((msg.payload as { id: string }).id as "anthropic" | "openai" | "gemini" | "minimax")
        .then(() => ({ ok: true }))

    case "loadProviderConfigs":
      return loadAllProviderConfigs().then(configs => ({ configs }))

    case "saveProviderConfig":
      return saveProviderConfig(msg.payload as Parameters<typeof saveProviderConfig>[0])
        .then(() => ({ ok: true }))

    case "removeProviderConfig":
      return removeProviderConfig((msg.payload as { id: string }).id as "anthropic" | "openai" | "gemini" | "minimax")
        .then(() => ({ ok: true }))

    case "testProviderConnection":
      return handleTestConnection(msg.payload as { providerId: string })

    case "loadRules":
      return loadRules().then(rules => ({ rules }))

    case "addRule":
      return addRule(msg.payload as Parameters<typeof addRule>[0]).then(() => ({ ok: true }))

    case "updateRule":
      return updateRule(msg.payload as Parameters<typeof updateRule>[0]).then(() => ({ ok: true }))

    case "removeRule":
      return removeRule((msg.payload as { id: string }).id).then(() => ({ ok: true }))

    case "toggleRule":
      return toggleRule(
        (msg.payload as { id: string; enabled: boolean }).id,
        (msg.payload as { id: string; enabled: boolean }).enabled
      ).then(() => ({ ok: true }))

    case "isFirstRunAcknowledged":
      return isFirstRunAcknowledged().then(ack => ({ acknowledged: ack }))

    case "acknowledgeFirstRun":
      return acknowledgeFirstRun().then(() => ({ ok: true }))

    case "getCacheStats":
      return cacheStats().then(stats => ({ stats }))

    case "clearCache":
      return cacheClear().then(() => ({ ok: true }))

    case "getUsage":
      return messenger.storage.local.get("corvus_usage").then(data => ({
        usage: data.corvus_usage ?? { totalInputTokens: 0, totalOutputTokens: 0, sessionInputTokens: 0, sessionOutputTokens: 0 },
      }))

    default:
      return Promise.resolve({ error: `Unknown message type: ${msg.type}` })
  }
})

// --- Streaming via Port ---

messenger.runtime.onConnect.addListener((port) => {
  if (port.name !== "corvus-stream") return

  port.onMessage.addListener(async (message) => {
    const msg = message as { type: string; payload?: unknown }

    if (msg.type === "streamChat") {
      const { messages } = msg.payload as { messages: AIMessage[] }
      try {
        for await (const chunk of streamChat(messages)) {
          port.postMessage(chunk)
        }
      } catch (err) {
        port.postMessage({
          type: "error",
          error: err instanceof Error ? err.message : "Stream failed",
        })
      }
    }
  })
})

// --- Handlers ---

async function handleChat(payload: { messages: AIMessage[] }): Promise<unknown> {
  const response = await chat(payload.messages)
  return { response }
}

async function handleGetMessageContext(payload: { tabId: number }): Promise<unknown> {
  const displayedMessage = await messenger.messageDisplay.getDisplayedMessage(payload.tabId)
  if (!displayedMessage) {
    return { error: "No message displayed" }
  }

  const context = await readMessage(displayedMessage.id)
  const thread = await buildThread(displayedMessage.id)
  const attachments = await getAttachments(displayedMessage.id)

  return {
    message: context,
    thread: {
      messages: thread.messages,
      totalCount: thread.totalCount,
      formatted: formatThreadForPrompt(thread),
    },
    attachments,
  }
}

async function handleUnlockSession(payload: { passphrase: string }): Promise<unknown> {
  const success = await unlockSession(payload.passphrase)
  return { success }
}

async function handleTestConnection(payload: { providerId: string }): Promise<unknown> {
  const config = await loadProviderConfig(payload.providerId as "anthropic" | "openai" | "gemini" | "minimax")
  if (!config) {
    return { success: false, error: "Provider not configured" }
  }

  try {
    const { AnthropicProvider } = await import("./ai/providers/anthropic")
    const { OpenAIProvider } = await import("./ai/providers/openai")
    const { GeminiProvider } = await import("./ai/providers/gemini")
    const { MiniMaxProvider } = await import("./ai/providers/minimax")

    let provider
    switch (config.id) {
      case "anthropic": provider = new AnthropicProvider(config); break
      case "openai": provider = new OpenAIProvider(config); break
      case "gemini": provider = new GeminiProvider(config); break
      case "minimax": provider = new MiniMaxProvider(config); break
    }

    const response = await provider.chat([
      { role: "user", content: "Say hello in one word." },
    ])

    return {
      success: response.stopReason !== "error",
      response: response.content.slice(0, 100),
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Connection failed",
    }
  }
}

console.log("Corvus background script loaded")
