import { Injectable } from "@angular/core"

declare const messenger: {
  runtime: {
    sendMessage(message: unknown): Promise<unknown>
    connect(info?: { name?: string }): {
      name: string
      postMessage(message: unknown): void
      onMessage: { addListener(callback: (message: unknown) => void): void }
      onDisconnect: { addListener(callback: () => void): void }
      disconnect(): void
    }
  }
}

@Injectable({ providedIn: "root" })
export class BridgeService {
  async send<T = unknown>(type: string, payload?: unknown): Promise<T> {
    const response = await messenger.runtime.sendMessage({ type, payload })
    return response as T
  }

  openStreamPort(): {
    port: ReturnType<typeof messenger.runtime.connect>
    send: (type: string, payload?: unknown) => void
    onMessage: (callback: (message: unknown) => void) => void
    onDisconnect: (callback: () => void) => void
    disconnect: () => void
  } {
    const port = messenger.runtime.connect({ name: "corvus-stream" })

    return {
      port,
      send: (type: string, payload?: unknown) => {
        port.postMessage({ type, payload })
      },
      onMessage: (callback: (message: unknown) => void) => {
        port.onMessage.addListener(callback)
      },
      onDisconnect: (callback: () => void) => {
        port.onDisconnect.addListener(callback)
      },
      disconnect: () => {
        port.disconnect()
      },
    }
  }
}
