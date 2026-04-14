import {
  CORVUS_STREAM_PORT_NAME,
  type AIMessage,
  type CorvusMessageEnvelope,
  type CorvusMessagePayload,
  type CorvusMessageResponse,
  type CorvusMessageType,
  type CorvusPortEnvelope,
  type CorvusStreamChunk,
} from "./contracts.js"

export interface RuntimePortLike {
  name: string
  postMessage(message: unknown): void
  onMessage: {
    addListener(callback: (message: unknown) => void): void
  }
  onDisconnect: {
    addListener(callback: () => void): void
  }
  disconnect(): void
}

export interface RuntimeMessengerLike {
  runtime: {
    sendMessage(message: unknown): Promise<unknown>
    connect(info?: { name?: string }): RuntimePortLike
  }
}

type PayloadArgs<T extends CorvusMessageType> = [CorvusMessagePayload<T>] extends [undefined]
  ? []
  : [payload: CorvusMessagePayload<T>]

export interface CorvusStreamPortConnection {
  port: RuntimePortLike
  start(messages: AIMessage[]): void
  onChunk(listener: (chunk: CorvusStreamChunk) => void): void
  onDisconnect(listener: () => void): void
  disconnect(): void
}

export interface CorvusBridge {
  send<T extends CorvusMessageType>(type: T, ...payload: PayloadArgs<T>): Promise<CorvusMessageResponse<T>>
  openStreamPort(): CorvusStreamPortConnection
}

function buildEnvelope<T extends CorvusMessageType>(
  type: T,
  payload: PayloadArgs<T>,
): CorvusMessageEnvelope<T> {
  if (payload.length === 0) {
    return { type } as CorvusMessageEnvelope<T>
  }

  return { type, payload: payload[0] } as CorvusMessageEnvelope<T>
}

export function createRuntimeBridge(runtime: RuntimeMessengerLike): CorvusBridge {
  return {
    async send<T extends CorvusMessageType>(
      type: T,
      ...payload: PayloadArgs<T>
    ): Promise<CorvusMessageResponse<T>> {
      const envelope = buildEnvelope(type, payload)
      const response = await runtime.runtime.sendMessage(envelope)
      return response as CorvusMessageResponse<T>
    },

    openStreamPort(): CorvusStreamPortConnection {
      const port = runtime.runtime.connect({ name: CORVUS_STREAM_PORT_NAME })

      return {
        port,
        start(messages: AIMessage[]): void {
          const envelope: CorvusPortEnvelope<"streamChat"> = {
            type: "streamChat",
            payload: { messages },
          }
          port.postMessage(envelope)
        },
        onChunk(listener: (chunk: CorvusStreamChunk) => void): void {
          port.onMessage.addListener(message => {
            listener(message as CorvusStreamChunk)
          })
        },
        onDisconnect(listener: () => void): void {
          port.onDisconnect.addListener(listener)
        },
        disconnect(): void {
          port.disconnect()
        },
      }
    },
  }
}

declare const messenger: RuntimeMessengerLike

export function createMessengerBridge(): CorvusBridge {
  return createRuntimeBridge(messenger)
}
