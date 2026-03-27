# ADR 001: Use Manifest V3 WebExtension Architecture

## Status

Accepted

## Context

Corvus needs to integrate AI capabilities into Thunderbird. The extension platform options are:

1. Manifest V2 WebExtension (legacy, being deprecated)
2. Manifest V3 WebExtension (current standard)
3. Experiment APIs (requires custom C++ or JS modules, not portable)

## Decision

Use Manifest V3 WebExtension architecture targeting Thunderbird 128+.

## Consequences

- Access to stable, documented MailExtension APIs (messagesRead, compose, folders, etc.)
- Future-proof against Thunderbird's migration path
- CSP restrictions require AOT compilation for Angular (no eval/Function)
- Background scripts are persistent in Thunderbird MV3 (unlike Chrome MV3 service workers)
- No access to low-level protocol APIs (IMAP commands, raw SMTP)
- Distribution via .xpi and eventual ATN listing
