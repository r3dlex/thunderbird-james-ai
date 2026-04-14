import type { Component } from "vue"
import type { CorvusPage } from "./composables/usePage"
import ChatWorkspace from "./features/chat/ChatWorkspace.vue"

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
    contracts: ["runtime.sendMessage", "corvus-stream"],
  },
  assistant: {
    contracts: ["runtime.sendMessage"],
  },
  settings: {
    contracts: ["runtime.sendMessage"],
  },
}
