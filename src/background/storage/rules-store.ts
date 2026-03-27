/**
 * Persistence layer for automated rules.
 */

import type { CorvusRule } from "../rules/types"

const RULES_KEY = "corvus_rules"

export async function loadRules(): Promise<CorvusRule[]> {
  const data = await messenger.storage.local.get(RULES_KEY)
  return (data[RULES_KEY] as CorvusRule[]) ?? []
}

export async function saveRules(rules: CorvusRule[]): Promise<void> {
  await messenger.storage.local.set({ [RULES_KEY]: rules })
}

export async function addRule(rule: CorvusRule): Promise<void> {
  const rules = await loadRules()
  rules.push(rule)
  await saveRules(rules)
}

export async function updateRule(rule: CorvusRule): Promise<void> {
  const rules = await loadRules()
  const idx = rules.findIndex(r => r.id === rule.id)
  if (idx >= 0) {
    rules[idx] = rule
    await saveRules(rules)
  }
}

export async function removeRule(ruleId: string): Promise<void> {
  const rules = await loadRules()
  await saveRules(rules.filter(r => r.id !== ruleId))
}

export async function getRule(ruleId: string): Promise<CorvusRule | null> {
  const rules = await loadRules()
  return rules.find(r => r.id === ruleId) ?? null
}

export async function toggleRule(ruleId: string, enabled: boolean): Promise<void> {
  const rules = await loadRules()
  const rule = rules.find(r => r.id === ruleId)
  if (rule) {
    rule.enabled = enabled
    await saveRules(rules)
  }
}
