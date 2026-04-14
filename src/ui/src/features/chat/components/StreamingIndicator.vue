<template>
  <div class="inline-flex items-center gap-2 rounded-full border border-[var(--corvus-border)] bg-[var(--corvus-surface)] px-3 py-2 text-xs text-[var(--corvus-text-secondary)]">
    <span class="font-medium text-[var(--corvus-text)]">Thinking</span>
    <span class="corvus-dot" />
    <span class="corvus-dot delay-150" />
    <span class="corvus-dot delay-300" />
  </div>
</template>

<style scoped>
.corvus-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 9999px;
  background: var(--corvus-accent);
  animation: corvus-pulse 1s infinite ease-in-out;
}

.delay-150 {
  animation-delay: 150ms;
}

.delay-300 {
  animation-delay: 300ms;
}

@keyframes corvus-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.35;
  }

  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
