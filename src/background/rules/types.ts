/**
 * Rule engine types.
 */

export interface CorvusRule {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditions: RuleCondition[]
  actions: RuleAction[]
  createdAt: string
  lastTriggeredAt?: string
  triggerCount: number
  /** If true, uses LLM to classify the email before matching */
  llmClassification?: LLMClassificationConfig
}

export interface LLMClassificationConfig {
  /** The classification prompt sent to the LLM with the email content */
  classificationPrompt: string
  /** Expected classification labels that trigger this rule */
  matchLabels: string[]
}

export interface RuleCondition {
  field: "from" | "to" | "cc" | "subject" | "body" | "hasAttachment" | "llmClassification"
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "matches" | "exists"
  value: string
  caseSensitive: boolean
}

export interface RuleAction {
  type: "move" | "tag" | "flag" | "markRead" | "autoReply" | "forward" | "notify"
  params: Record<string, string>
}

export interface RuleMatchContext {
  from: string
  to: string[]
  cc: string[]
  subject: string
  body: string
  hasAttachment: boolean
  messageId: number
  /** LLM-assigned classification label, if classification was performed */
  llmClassificationLabel?: string
}
