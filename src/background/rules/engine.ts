/**
 * Rule evaluation engine.
 * Evaluates rules against incoming messages, including LLM-based classification.
 */

import type { CorvusRule, RuleMatchContext } from "./types"
import { matchesAllConditions } from "./matcher"
import { executeActions } from "./executor"
import { loadRules, updateRule } from "../storage/rules-store"
import { readMessage } from "../context/message-reader"
import { getAttachments } from "../context/attachment-reader"
import { chat } from "../ai/router"
import type { AIMessage } from "../ai/types"

export async function evaluateMessage(messageId: number): Promise<void> {
  const rules = await loadRules()
  const enabledRules = rules
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority)

  if (enabledRules.length === 0) return

  const context = await buildMatchContext(messageId)

  for (const rule of enabledRules) {
    // If the rule uses LLM classification, run it first
    if (rule.llmClassification) {
      const label = await classifyWithLLM(rule, context)
      context.llmClassificationLabel = label

      if (!rule.llmClassification.matchLabels.includes(label)) {
        continue
      }
    }

    if (matchesAllConditions(rule.conditions, context)) {
      await executeActions(rule.actions, context)

      // Update rule stats
      rule.lastTriggeredAt = new Date().toISOString()
      rule.triggerCount++
      await updateRule(rule)

      // First matching rule wins
      return
    }
  }
}

/**
 * Classify an email using the LLM based on the rule's classification config.
 */
async function classifyWithLLM(rule: CorvusRule, context: RuleMatchContext): Promise<string> {
  if (!rule.llmClassification) return ""

  const systemPrompt = `You are an email classifier. Classify the following email into exactly one of these categories: ${rule.llmClassification.matchLabels.join(", ")}. Respond with ONLY the category label, nothing else.`

  const emailContent = `From: ${context.from}\nSubject: ${context.subject}\n\n${context.body.slice(0, 2000)}`

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `${rule.llmClassification.classificationPrompt}\n\nEmail:\n${emailContent}` },
  ]

  try {
    const response = await chat(messages, []) // No tools for classification
    return response.content.trim()
  } catch {
    return ""
  }
}

export async function evaluateRecent(): Promise<void> {
  // Find messages received since last evaluation
  const data = await messenger.storage.local.get("corvus_last_rule_eval")
  const lastEval = data.corvus_last_rule_eval as string | undefined
  const fromDate = lastEval ? new Date(lastEval) : new Date(Date.now() - 5 * 60 * 1000)

  const accounts = await messenger.accounts.list()
  for (const account of accounts) {
    try {
      const messages = await messenger.messages.query({
        accountId: account.id,
        fromDate,
      })

      for (const msg of messages.messages) {
        await evaluateMessage(msg.id)
      }
    } catch {
      // Skip accounts that fail
    }
  }

  await messenger.storage.local.set({
    corvus_last_rule_eval: new Date().toISOString(),
  })
}

async function buildMatchContext(messageId: number): Promise<RuleMatchContext> {
  const msg = await readMessage(messageId)
  const attachments = await getAttachments(messageId)

  return {
    from: msg.from,
    to: msg.to,
    cc: msg.cc,
    subject: msg.subject,
    body: msg.body,
    hasAttachment: attachments.length > 0,
    messageId,
  }
}
