import type { Component } from "vue"
import type { CorvusPage } from "./composables/usePage"
import { AssistantPage } from "./features/assistant"
import ChatWorkspace from "./features/chat/ChatWorkspace.vue"
import { ComposePage } from "./features/compose"
import { SettingsPage } from "./features/settings"

export interface CorvusPageRegistration {
  component?: Component
  props?: Record<string, unknown>
  contracts: string[]
}

export const pageRegistry: Record<CorvusPage, CorvusPageRegistration> = {
  chat: {
    component: ChatWorkspace,
    props: { page: "chat" },
    contracts: ["runtime.sendMessage", "corvus-stream", "getMessageContext"],
  },
  msgDisplay: {
    component: ChatWorkspace,
    props: { page: "msgDisplay" },
    contracts: ["runtime.sendMessage", "corvus-stream", "getMessageContext"],
  },
  compose: {
    component: ComposePage,
    contracts: ["runtime.sendMessage", "corvus-stream"],
  },
  assistant: {
    component: AssistantPage,
    contracts: ["runtime.sendMessage"],
  },
  settings: {
    component: SettingsPage,
    contracts: ["runtime.sendMessage"],
  },
}
