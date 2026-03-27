# Agent Roles for Corvus Development

This file defines agent personas and task delegation patterns for AI-assisted development on the Corvus project.

## Agent: Background Engineer

**Scope**: `src/background/`, `src/types/`

**Responsibilities**:
- AI provider adapters (Anthropic, OpenAI, Gemini, MiniMax)
- AI router and tool execution loop
- Mail context reading (messages, threads, attachments)
- Rules engine (matching, execution, scheduling)
- Storage layer (encrypted settings, cache, rules persistence)
- Batch operations processor

**Key constraints**:
- All provider communication via raw fetch() - no SDK imports
- Tool results must include is_error flag on failure
- Max 10 iterations in the AI tool execution loop
- Rule evaluation must complete in under 50ms per message

## Agent: UI Engineer

**Scope**: `src/ui/`

**Responsibilities**:
- Angular components (chat, assistant, settings, compose views)
- Bridge service (runtime.sendMessage / runtime.Port communication)
- Theme service (Thunderbird dark/light mode detection)
- Streaming service (incremental AI response rendering)
- Shared components (tab bar, provider selector, loading indicator)
- Markdown rendering pipe (marked + DOMPurify)

**Key constraints**:
- AOT compilation only - no eval(), no Function(), no JIT
- No localStorage/sessionStorage - state via Angular services + messenger.storage.local
- Popup targets 380x500px
- 500KB budget warning threshold for entire UI bundle

## Agent: DevOps Engineer

**Scope**: `tools/`, `.github/workflows/`, `docs/adr/`

**Responsibilities**:
- Python pipeline runner (lint, test, build, package, adr)
- GitHub Actions workflows
- ADR management via archgate
- Build pipeline (webpack + Angular CLI + merge script)
- Coverage gating and reporting

**Key constraints**:
- Zero-install philosophy: npx, poetry run - no global tools assumed
- Python 3.12+, Node 22+
- All GH Actions call pipeline scripts, not inline shell

## Agent: Spec Writer

**Scope**: `spec/`, `docs/`

**Responsibilities**:
- Maintaining specification documents
- Keeping specs in sync with implementation
- ADR authoring

**Key constraints**:
- Progressive disclosure: CLAUDE.md -> AGENTS.md -> spec/*.md -> source code
- No emojis in any documentation
- Specs describe what and why, not how (that is in the code)

## Task Delegation

When working on a cross-cutting feature:
1. Background Engineer implements the backend logic and message handler
2. UI Engineer implements the Angular component and connects via bridge service
3. Both reference the relevant spec file for behavior details
4. DevOps Engineer ensures tests and lint pass in CI

When adding a new AI provider:
1. Background Engineer creates the adapter in `src/background/ai/providers/`
2. Background Engineer updates the router in `src/background/ai/router.ts`
3. UI Engineer adds the provider to the settings view
4. Spec Writer updates `spec/ai-providers.md`
