<template>
  <section class="space-y-3 rounded-xl border border-[var(--corvus-border)] bg-[var(--corvus-surface)]/80 p-4">
    <div>
      <h3 class="text-sm font-semibold text-[var(--corvus-text)]">Batch Operations</h3>
      <p class="mt-1 text-xs leading-5 text-[var(--corvus-text-secondary)]">
        Use the assistant chat to run bulk actions across your mailbox. The flow stays confirmation-first for destructive or large actions.
      </p>
    </div>

    <ul class="list-disc space-y-2 pl-4 text-sm leading-5 text-[var(--corvus-text)]">
      <li>Archive all read emails older than 30 days</li>
      <li>Move all newsletters into a Newsletters folder</li>
      <li>Tag project mail from a team as important</li>
    </ul>

    <p class="rounded-lg border border-dashed border-[var(--corvus-border)] bg-[var(--corvus-bg)] px-3 py-2 text-xs leading-5 text-[var(--corvus-text-secondary)]">
      The assistant should confirm before executing any bulk mailbox operation.
    </p>
  </section>
</template>
