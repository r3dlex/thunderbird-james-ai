/**
 * Tool registry: maps tool names to definitions and execution functions.
 */

import type { AIToolDefinition } from "../types"
import { searchEmails, SEARCH_EMAILS_TOOL } from "./email-search"
import { moveEmails, MOVE_EMAILS_TOOL } from "./email-move"
import { createDraft, CREATE_DRAFT_TOOL } from "./email-draft"
import { tagEmails, TAG_EMAILS_TOOL } from "./email-flag"
import { listFolders, LIST_FOLDERS_TOOL } from "./folder-list"
import { getEmailContent, GET_EMAIL_CONTENT_TOOL } from "./get-email-content"
import { getThread, GET_THREAD_TOOL } from "./get-thread"

type ToolExecutor = (args: Record<string, unknown>) => Promise<unknown>

const toolRegistry: Map<string, { definition: AIToolDefinition; execute: ToolExecutor }> = new Map()

function register(definition: AIToolDefinition, execute: ToolExecutor): void {
  toolRegistry.set(definition.name, { definition, execute })
}

// Register all tools
register(SEARCH_EMAILS_TOOL, searchEmails)
register(MOVE_EMAILS_TOOL, moveEmails)
register(CREATE_DRAFT_TOOL, createDraft)
register(TAG_EMAILS_TOOL, tagEmails)
register(LIST_FOLDERS_TOOL, listFolders)
register(GET_EMAIL_CONTENT_TOOL, getEmailContent)
register(GET_THREAD_TOOL, getThread)

export function getAllTools(): AIToolDefinition[] {
  return Array.from(toolRegistry.values()).map(t => t.definition)
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = toolRegistry.get(name)
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`)
  }
  return tool.execute(args)
}
