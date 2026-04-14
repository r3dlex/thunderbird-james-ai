import { computed, onMounted, onUnmounted, readonly, ref } from "vue"

export const directPopupPages = ["chat", "msgDisplay", "compose"] as const
export const internalPages = ["assistant", "settings"] as const
export const allPages = [...directPopupPages, ...internalPages] as const

export type CorvusPage = (typeof allPages)[number]

interface PageMeta {
  title: string
  summary: string
  body: string
  modeLabel: string
}

const defaultPage: CorvusPage = "chat"

const pageMetaByKey: Record<CorvusPage, PageMeta> = {
  chat: {
    title: "Chat popup entry",
    summary: "Default toolbar popup entry backed by the page query parameter.",
    body: "Chat and message display will share the first feature migration wave after the build topology is locked.",
    modeLabel: "toolbar",
  },
  msgDisplay: {
    title: "Message display popup entry",
    summary: "Opened from Thunderbird message display action with message-aware context loading.",
    body: "The next migration wave will wire this entry back into getMessageContext without introducing a router shell.",
    modeLabel: "message display",
  },
  compose: {
    title: "Compose popup entry",
    summary: "Opened from Thunderbird compose action while preserving streaming response plumbing.",
    body: "Compose stays on the corvus-stream + runtime.sendMessage contract during the staged rewrite.",
    modeLabel: "compose",
  },
  assistant: {
    title: "Assistant internal state",
    summary: "Internal navigation state for assistant workflows inside the same popup shell.",
    body: "Assistant remains an in-app state rather than a separate manifest popup entry.",
    modeLabel: "internal",
  },
  settings: {
    title: "Settings internal state",
    summary: "Internal navigation state for provider, cache, and usage configuration flows.",
    body: "Settings remains internal so manifest popup URLs stay limited to chat, msgDisplay, and compose.",
    modeLabel: "internal",
  },
}

function normalizePage(candidate: string | null | undefined): CorvusPage {
  return allPages.includes(candidate as CorvusPage) ? (candidate as CorvusPage) : defaultPage
}

function currentSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function readPageFromLocation(): CorvusPage {
  return normalizePage(currentSearchParams().get("page"))
}

function writePageToLocation(page: CorvusPage): void {
  const params = currentSearchParams()

  if (page === defaultPage) {
    params.delete("page")
  } else {
    params.set("page", page)
  }

  const query = params.toString()
  const nextUrl = query.length > 0 ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.replaceState(window.history.state, "", nextUrl)
}

export function usePage() {
  const page = ref<CorvusPage>(readPageFromLocation())

  const syncFromLocation = () => {
    page.value = readPageFromLocation()
  }

  const setPage = (nextPage: CorvusPage) => {
    const normalized = normalizePage(nextPage)
    writePageToLocation(normalized)
    page.value = normalized
  }

  onMounted(() => {
    window.addEventListener("popstate", syncFromLocation)
    syncFromLocation()
  })

  onUnmounted(() => {
    window.removeEventListener("popstate", syncFromLocation)
  })

  return {
    page: readonly(page),
    pageMeta: computed(() => pageMetaByKey[page.value]),
    isDirectPopupEntry: computed(() => directPopupPages.includes(page.value as (typeof directPopupPages)[number])),
    setPage,
  }
}
