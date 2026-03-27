import { Injectable } from "@angular/core"
import { BridgeService } from "./bridge.service"
import { Subject, Observable } from "rxjs"

export interface StreamChunk {
  type: "text" | "tool_call" | "done" | "error"
  text?: string
  toolCall?: { id: string; name: string; arguments: Record<string, unknown> }
  error?: string
}

@Injectable({ providedIn: "root" })
export class StreamingService {
  constructor(private bridge: BridgeService) {}

  streamChat(messages: Array<{ role: string; content: string }>): Observable<StreamChunk> {
    const subject = new Subject<StreamChunk>()

    const connection = this.bridge.openStreamPort()

    connection.onMessage((message) => {
      const chunk = message as StreamChunk
      subject.next(chunk)
      if (chunk.type === "done" || chunk.type === "error") {
        subject.complete()
        connection.disconnect()
      }
    })

    connection.onDisconnect(() => {
      subject.complete()
    })

    connection.send("streamChat", { messages })

    return subject.asObservable()
  }
}
