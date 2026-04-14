export interface ComposeQuickAction {
  label: string
  instruction: string
}

export const composeQuickActions: ComposeQuickAction[] = [
  {
    label: "Make more concise",
    instruction: "Make the email body more concise. Keep the same meaning.",
  },
  {
    label: "Make more formal",
    instruction: "Make the email body more formal and professional.",
  },
  {
    label: "Fix grammar",
    instruction: "Fix any grammar or spelling issues in the email body.",
  },
  {
    label: "Translate to English",
    instruction: "Translate the email body to English.",
  },
  {
    label: "Translate to German",
    instruction: "Translate the email body to German.",
  },
] as const
