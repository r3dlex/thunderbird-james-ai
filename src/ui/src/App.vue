<script setup lang="ts">
import { computed } from "vue"
import Button from "primevue/button"
import Card from "primevue/card"
import Tag from "primevue/tag"
import { directPopupPages, internalPages, type CorvusPage, usePage } from "./composables/usePage"
import { pageRegistry } from "./page-registry"

const pageLabels: Record<CorvusPage, string> = {
  chat: "Chat",
  msgDisplay: "Message",
  compose: "Compose",
  assistant: "Assistant",
  settings: "Settings",
}

const { page, pageMeta, setPage, isDirectPopupEntry } = usePage()

const directEntries = directPopupPages.map(key => ({
  key,
  label: pageLabels[key],
}))

const internalEntries = internalPages.map(key => ({
  key,
  label: pageLabels[key],
}))

const activePageRegistration = computed(() => pageRegistry[page.value])
const activeContractSummary = computed(() => activePageRegistration.value.contracts)

function goToPage(nextPage: CorvusPage): void {
  setPage(nextPage)
}
</script>

<template>
  <main class="flex min-h-screen flex-col bg-[var(--corvus-bg)] text-[var(--corvus-text)]">
    <section class="border-b border-[var(--corvus-border)] px-4 py-3">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--corvus-text-secondary)]">
            Corvus popup shell
          </p>
          <h1 class="mt-1 text-lg font-semibold">Vue/Vite migration checkpoint</h1>
        </div>
        <Tag :value="isDirectPopupEntry ? 'direct popup' : 'internal state'" :severity="isDirectPopupEntry ? 'success' : 'secondary'" />
      </div>
      <p class="mt-2 text-sm text-[var(--corvus-text-secondary)]">
        Query param <code class="font-mono text-xs">page</code> stays authoritative for popup entry and lightweight internal navigation.
      </p>
    </section>

    <section class="grid gap-3 px-4 py-3">
      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
          Popup entries
        </p>
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-for="entry in directEntries"
            :key="entry.key"
            :label="entry.label"
            size="small"
            :severity="page === entry.key ? 'primary' : 'secondary'"
            class="w-full"
            @click="goToPage(entry.key)"
          />
        </div>
      </div>

      <div>
        <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
          Internal states
        </p>
        <div class="grid grid-cols-2 gap-2">
          <Button
            v-for="entry in internalEntries"
            :key="entry.key"
            :label="entry.label"
            size="small"
            :variant="page === entry.key ? undefined : 'outlined'"
            :severity="page === entry.key ? 'primary' : 'secondary'"
            class="w-full"
            @click="goToPage(entry.key)"
          />
        </div>
      </div>
    </section>

    <section class="flex-1 px-4 pb-4">
      <Card class="h-full border border-[var(--corvus-border)] shadow-panel">
        <template #title>
          <div class="flex items-center justify-between gap-2">
            <span>{{ pageMeta.title }}</span>
            <Tag :value="pageMeta.modeLabel" severity="secondary" />
          </div>
        </template>
        <template #subtitle>
          {{ pageMeta.summary }}
        </template>
        <template #content>
          <div class="space-y-4 text-sm leading-6 text-[var(--corvus-text-secondary)]">
            <div>
              <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--corvus-text-secondary)]">
                Preserved contracts
              </p>
              <div class="flex flex-wrap gap-2">
                <Tag
                  v-for="contract in activeContractSummary"
                  :key="contract"
                  :value="contract"
                  severity="info"
                />
              </div>
            </div>

            <component
              :is="activePageRegistration.component"
              v-if="activePageRegistration.component"
              v-bind="activePageRegistration.props"
            />

            <div
              v-else
              class="rounded-xl border border-dashed border-[var(--corvus-border)] bg-[var(--corvus-surface)]/70 p-3"
            >
              <p class="font-medium text-[var(--corvus-text)]">Current state</p>
              <p class="mt-1">{{ pageMeta.body }}</p>
            </div>
          </div>
        </template>
      </Card>
    </section>
  </main>
</template>
