# UI Design

## Popup Layout

- Dimensions: 380px wide, 500px tall
- Two tabs: **Chat** (contextual email) and **Assistant** (general)
- Settings accessed via gear icon in the top-right corner
- Tab selection determined by URL query parameter: `?page=msgDisplay`, `?page=chat`, `?page=compose`

## Views

### Chat View (message_display_action)

```
+------------------------------------------+
| [Chat] [Assistant]              [gear]   |
+------------------------------------------+
| Context Card                             |
| Subject: Re: Q3 Budget Review            |
| From: alice@example.com                  |
| Thread: 4 messages                       |
+------------------------------------------+
|                                          |
| [AI bubble]                              |
| This email discusses...                  |
|                                          |
| [User bubble]                            |
| Draft a reply accepting the proposal     |
|                                          |
| [AI bubble]                              |
| I've created a draft reply...            |
|                                          |
+------------------------------------------+
| [Type a message...]            [Send]    |
+------------------------------------------+
```

- **Context card**: Collapsed summary of the displayed email. Shows subject, sender, thread count. Expandable for full headers.
- **Message bubbles**: Left-aligned for AI, right-aligned for user. AI bubbles render Markdown (via marked + DOMPurify).
- **Input area**: Text input with send button. Enter sends, Shift+Enter for newline.

### Assistant View (action popup)

Same layout as Chat but without the context card. First message includes a prompt suggesting available operations.

### Compose View (compose_action)

```
+------------------------------------------+
| Corvus Compose Assistant        [gear]   |
+------------------------------------------+
| Quick Actions                            |
| [Concise] [Formal] [Grammar] [EN/DE]    |
+------------------------------------------+
| Custom instruction:                      |
| [________________________]     [Apply]   |
+------------------------------------------+
| Preview                                  |
| (shows transformed draft text)           |
|                                          |
| [Accept] [Revert]                        |
+------------------------------------------+
```

- Quick-action cards trigger predefined prompts
- Preview shows the AI-modified text before applying
- Accept writes back to the compose window; Revert restores the original

### Settings View

Accessed via gear icon. One card per provider:

```
+------------------------------------------+
| Settings                        [back]   |
+------------------------------------------+
| Anthropic                                |
| Model: [claude-sonnet-4-5 v]            |
| API Key: [********]  [Test] [Clear]      |
| Usage: 12,450 in / 3,200 out tokens     |
+------------------------------------------+
| OpenAI                                   |
| Model: [gpt-4o          v]              |
| API Key: [________]  [Test] [Clear]      |
+------------------------------------------+
| Gemini                                   |
| ...                                      |
+------------------------------------------+
| MiniMax                                  |
| ...                                      |
+------------------------------------------+
| Active Provider: [Anthropic v]           |
+------------------------------------------+
```

- Model selector: dropdown per provider
- API key: masked input, test connection button sends a minimal request
- Usage stats: input/output token counts for the current session
- Active provider: global selector at the bottom

## Theme

The UI uses Thunderbird's CSS custom properties for consistent theming:

| Purpose | Property |
|---------|----------|
| Background (primary) | `--layout-background-0` |
| Background (secondary) | `--layout-background-1` |
| Background (tertiary) | `--layout-background-2` |
| Text (primary) | `--layout-color-0` |
| Text (secondary) | `--layout-color-1` |
| Text (muted) | `--layout-color-2` |
| Accent | `--color-blue-50` |
| Error | `--color-red-50` |
| Success | `--color-green-50` |
| Border | `--layout-border-0` |

**Dark mode detection**:

1. CSS: `@media (prefers-color-scheme: dark)` for system-level detection
2. Thunderbird-specific: read `ui.systemUsesDarkTheme` preference when available
3. The theme service subscribes to changes and updates a `data-theme` attribute on the root element

All colors must be specified exclusively via these custom properties -- no hardcoded hex values.

## Angular Component Structure

```
AppComponent
  TabBarComponent
  RouterOutlet
    ChatViewComponent
      ContextCardComponent
      MessageListComponent
        MessageBubbleComponent
      ChatInputComponent
    AssistantViewComponent
      MessageListComponent
      ChatInputComponent
    ComposeViewComponent
      QuickActionCardComponent
      CustomInstructionInputComponent
      DraftPreviewComponent
    SettingsViewComponent
      ProviderCardComponent (x4)
      ActiveProviderSelectorComponent
```

## Shared Components

- **TabBarComponent**: Two-tab switcher with active indicator
- **ProviderSelectorComponent**: Dropdown for model/provider selection
- **LoadingIndicatorComponent**: Animated dots shown during AI streaming
- **MarkdownPipe**: Transforms AI response text to sanitized HTML via `marked` and `DOMPurify`
