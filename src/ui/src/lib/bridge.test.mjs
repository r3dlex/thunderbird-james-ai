import assert from "node:assert/strict"
import test from "node:test"

import {
  CORVUS_MESSAGE_TYPES,
  CORVUS_STREAM_CHUNK_TYPES,
  CORVUS_STREAM_PORT_NAME,
  isTerminalStreamChunk,
} from "./contracts.js"
import { createRuntimeBridge } from "./bridge.js"
import { streamChatMessages } from "./streaming.js"

function createTestPort() {
  const messageListeners = []
  const disconnectListeners = []

  return {
    name: CORVUS_STREAM_PORT_NAME,
    postedMessages: [],
    disconnectCalls: 0,
    postMessage(message) {
      this.postedMessages.push(message)
    },
    onMessage: {
      addListener(callback) {
        messageListeners.push(callback)
      },
    },
    onDisconnect: {
      addListener(callback) {
        disconnectListeners.push(callback)
      },
    },
    disconnect() {
      this.disconnectCalls += 1
    },
    emitMessage(message) {
      for (const listener of messageListeners) {
        listener(message)
      }
    },
    emitDisconnect() {
      for (const listener of disconnectListeners) {
        listener()
      }
    },
  }
}

test("contracts lock the extracted runtime message and stream chunk types", () => {
  assert.deepEqual(CORVUS_MESSAGE_TYPES, [
    "chat",
    "getMessageContext",
    "unlockSession",
    "isSessionUnlocked",
    "lockSession",
    "getActiveProvider",
    "setActiveProvider",
    "loadProviderConfigs",
    "saveProviderConfig",
    "removeProviderConfig",
    "testProviderConnection",
    "loadRules",
    "addRule",
    "updateRule",
    "removeRule",
    "toggleRule",
    "isFirstRunAcknowledged",
    "acknowledgeFirstRun",
    "getCacheStats",
    "clearCache",
    "getUsage",
  ])
  assert.deepEqual(CORVUS_STREAM_CHUNK_TYPES, ["text", "tool_call", "done", "error"])
  assert.equal(isTerminalStreamChunk({ type: "done" }), true)
  assert.equal(isTerminalStreamChunk({ type: "error", error: "boom" }), true)
  assert.equal(isTerminalStreamChunk({ type: "text", text: "hello" }), false)
})

test("createRuntimeBridge sends typed runtime envelopes and stream requests", async () => {
  const sentMessages = []
  const testPort = createTestPort()
  let connectInfo

  const runtime = {
    runtime: {
      async sendMessage(message) {
        sentMessages.push(message)
        return { ok: true }
      },
      connect(info) {
        connectInfo = info
        return testPort
      },
    },
  }

  const bridge = createRuntimeBridge(runtime)
  const providerResult = await bridge.send("setActiveProvider", { id: "openai" })
  const lockResult = await bridge.send("lockSession")

  assert.deepEqual(providerResult, { ok: true })
  assert.deepEqual(lockResult, { ok: true })
  assert.deepEqual(sentMessages, [
    { type: "setActiveProvider", payload: { id: "openai" } },
    { type: "lockSession" },
  ])

  const message = { role: "user", content: "hello" }
  const stream = bridge.openStreamPort()
  stream.start([message])

  assert.deepEqual(connectInfo, { name: CORVUS_STREAM_PORT_NAME })
  assert.deepEqual(testPort.postedMessages, [
    { type: "streamChat", payload: { messages: [message] } },
  ])
})

test("streamChatMessages forwards chunks and closes on terminal events", () => {
  const testPort = createTestPort()
  const observed = []
  let completed = 0

  const stop = streamChatMessages(
    {
      openStreamPort: () => ({
        port: testPort,
        start: messages => {
          testPort.postMessage({ type: "streamChat", payload: { messages } })
        },
        onChunk: listener => {
          testPort.onMessage.addListener(listener)
        },
        onDisconnect: listener => {
          testPort.onDisconnect.addListener(listener)
        },
        disconnect: () => {
          testPort.disconnect()
        },
      }),
    },
    [{ role: "user", content: "Draft this" }],
    {
      next: chunk => {
        observed.push(chunk)
      },
      complete: () => {
        completed += 1
      },
    },
  )

  testPort.emitMessage({ type: "text", text: "Hello" })
  testPort.emitMessage({ type: "done" })
  testPort.emitDisconnect()
  stop()

  assert.deepEqual(observed, [
    { type: "text", text: "Hello" },
    { type: "done" },
  ])
  assert.equal(completed, 1)
  assert.equal(testPort.disconnectCalls, 2)
  assert.deepEqual(testPort.postedMessages, [
    { type: "streamChat", payload: { messages: [{ role: "user", content: "Draft this" }] } },
  ])
})
