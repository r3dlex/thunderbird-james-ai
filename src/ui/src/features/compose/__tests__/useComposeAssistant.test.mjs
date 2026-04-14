import assert from "node:assert/strict"
import test from "node:test"

import { createComposeAssistantController, composeSystemPrompt } from "../composeController.ts"

function createHarness() {
  const streamCalls = []
  const stopCalls = []
  let activeObserver = null

  const controller = createComposeAssistantController({
    streamMessages(messages, observer) {
      streamCalls.push(messages)
      activeObserver = observer

      return () => {
        stopCalls.push(streamCalls.length)
      }
    },
  })

  return {
    controller,
    streamCalls,
    stopCalls,
    emit(chunk) {
      activeObserver?.next(chunk)
    },
    complete() {
      activeObserver?.complete()
    },
  }
}

test("applyCustomInstruction clears the input and streams the compose prompt", () => {
  const harness = createHarness()
  harness.controller.customInstruction.value = " Polish the closing paragraph "

  const started = harness.controller.applyCustomInstruction()

  assert.equal(started, true)
  assert.equal(harness.controller.customInstruction.value, "")
  assert.equal(harness.controller.isProcessing.value, true)
  assert.deepEqual(harness.streamCalls, [[
    { role: "system", content: composeSystemPrompt },
    { role: "user", content: "Polish the closing paragraph" },
  ]])

  harness.emit({ type: "text", text: "Updated draft" })
  harness.complete()

  assert.equal(harness.controller.lastResponse.value, "Updated draft")
  assert.equal(harness.controller.hasPreview.value, true)
  assert.equal(harness.controller.isProcessing.value, false)
})

test("applyQuickAction stops the previous stream before starting a new one", () => {
  const harness = createHarness()

  assert.equal(harness.controller.applyQuickAction("First instruction"), true)
  assert.equal(harness.controller.applyQuickAction("Second instruction"), true)

  assert.deepEqual(harness.stopCalls, [1])
  assert.deepEqual(harness.streamCalls, [
    [
      { role: "system", content: composeSystemPrompt },
      { role: "user", content: "First instruction" },
    ],
    [
      { role: "system", content: composeSystemPrompt },
      { role: "user", content: "Second instruction" },
    ],
  ])
})

test("stream errors are surfaced in compose preview state", () => {
  const harness = createHarness()

  harness.controller.applyQuickAction("Translate to German.")
  harness.emit({ type: "error", error: "Provider timed out" })
  harness.complete()

  assert.equal(harness.controller.errorMessage.value, "Provider timed out")
  assert.equal(harness.controller.hasPreview.value, true)
  assert.equal(harness.controller.isProcessing.value, false)
})
