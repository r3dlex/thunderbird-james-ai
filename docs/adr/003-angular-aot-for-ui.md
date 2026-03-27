# ADR 003: Angular 19 with AOT Compilation for UI

## Status

Accepted

## Context

The extension UI runs inside Thunderbird popup panels and needs a component framework. Options:

1. Vanilla HTML/JS (minimal but no component model)
2. React (requires JSX transform, potential CSP issues with some tooling)
3. Angular with AOT (mature, strict CSP compliance with AOT, built-in routing)
4. Svelte (compiles away, but less mature ecosystem for extension contexts)

## Decision

Use Angular 19+ with Ahead-of-Time (AOT) compilation. AOT is mandatory because Thunderbird's CSP forbids eval() and Function() constructors that JIT compilation requires.

## Consequences

- Full CSP compliance out of the box with AOT
- Built-in routing for multi-view popup (chat, assistant, settings, compose)
- Reactive forms and dependency injection available
- Larger initial bundle compared to vanilla or Svelte (~200-400KB)
- 500KB budget threshold set to keep bundle reasonable
- Angular CLI manages its own build pipeline, merged with webpack output post-build
- No localStorage/sessionStorage in extension context; use messenger.storage.local + Angular state
