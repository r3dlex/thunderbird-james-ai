/**
 * Rule condition matching logic.
 */

import type { RuleCondition, RuleMatchContext } from "./types"

export function matchesAllConditions(conditions: RuleCondition[], context: RuleMatchContext): boolean {
  return conditions.every(c => matchesCondition(c, context))
}

function matchesCondition(condition: RuleCondition, context: RuleMatchContext): boolean {
  const fieldValue = getFieldValue(condition.field, context)

  if (condition.operator === "exists") {
    return condition.value === "true" ? !!fieldValue : !fieldValue
  }

  if (typeof fieldValue !== "string") return false

  const value = condition.caseSensitive ? fieldValue : fieldValue.toLowerCase()
  const target = condition.caseSensitive ? condition.value : condition.value.toLowerCase()

  switch (condition.operator) {
    case "contains":
      return value.includes(target)
    case "equals":
      return value === target
    case "startsWith":
      return value.startsWith(target)
    case "endsWith":
      return value.endsWith(target)
    case "matches":
      try {
        const flags = condition.caseSensitive ? "" : "i"
        return new RegExp(condition.value, flags).test(fieldValue)
      } catch {
        return false
      }
    default:
      return false
  }
}

function getFieldValue(field: RuleCondition["field"], context: RuleMatchContext): string | boolean {
  switch (field) {
    case "from":
      return context.from
    case "to":
      return context.to.join(", ")
    case "cc":
      return context.cc.join(", ")
    case "subject":
      return context.subject
    case "body":
      return context.body
    case "hasAttachment":
      return context.hasAttachment
    case "llmClassification":
      return context.llmClassificationLabel ?? ""
    default:
      return ""
  }
}
