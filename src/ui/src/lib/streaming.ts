import { isTerminalStreamChunk, type AIMessage, type CorvusStreamChunk } from "./contracts.js"
import type { CorvusBridge } from "./bridge.js"

export interface CorvusStreamObserver {
  next(chunk: CorvusStreamChunk): void
  complete(): void
}

export function streamChatMessages(
  bridge: Pick<CorvusBridge, "openStreamPort">,
  messages: AIMessage[],
  observer: CorvusStreamObserver,
): () => void {
  const connection = bridge.openStreamPort()
  let completed = false

  const finish = (): void => {
    if (completed) return
    completed = true
    observer.complete()
  }

  connection.onChunk(chunk => {
    observer.next(chunk)

    if (isTerminalStreamChunk(chunk)) {
      finish()
      connection.disconnect()
    }
  })

  connection.onDisconnect(() => {
    finish()
  })

  connection.start(messages)

  return () => {
    connection.disconnect()
    finish()
  }
}
