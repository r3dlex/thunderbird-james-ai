import { createMessengerBridge, type CorvusBridge } from "../../lib/bridge"
import { streamChatMessages } from "../../lib/streaming"
import { createComposeAssistantController } from "./composeController"

export function useComposeAssistant(bridge: Pick<CorvusBridge, "openStreamPort"> = createMessengerBridge()) {
  return createComposeAssistantController({
    streamMessages(messages, observer) {
      return streamChatMessages(bridge, messages, observer)
    },
  })
}
