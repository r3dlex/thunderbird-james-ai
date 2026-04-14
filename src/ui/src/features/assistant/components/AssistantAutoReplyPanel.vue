<template>
  <section class="space-y-3 rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/80 p-4">
    <div>
      <h3 class="text-sm font-semibold text-[var(--corvus-text)]">Auto-Reply Configuration</h3>
      <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
        Configure auto-replies by describing the matching email pattern and the desired reply style in the assistant chat.
      </p>
    </div>

    <ul class="list-disc space-y-2 pl-4 text-sm leading-5 text-[var(--corvus-text)]">
      <li>Sender patterns such as support mailboxes</li>
      <li>Subject keywords for common request types</li>
      <li>LLM classifications such as meeting requests or PTO questions</li>
    </ul>

    <p class="rounded-lg border-l-3 border-[var(--corvus-accent)] bg-[var(--corvus-bg)] px-3 py-2 text-xs leading-5 text-[var(--corvus-text-secondary)]">
      Auto-replies only run for rules you explicitly create and enable. The extension does not send replies without a matching rule.
    </p>
  </section>
</template>
