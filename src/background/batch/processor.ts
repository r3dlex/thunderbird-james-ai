/**
 * Batch operation queue processor.
 */

import type { BatchResult } from "./operations"
import { batchMove, batchTag, batchMarkRead, batchDelete } from "./operations"

export interface BatchJob {
  id: string
  operation: "move" | "tag" | "markRead" | "delete"
  messageIds: number[]
  params: Record<string, unknown>
  status: "pending" | "running" | "completed" | "failed"
  result?: BatchResult
}

const jobQueue: BatchJob[] = []
let processing = false

export function enqueueJob(job: BatchJob): void {
  jobQueue.push(job)
  if (!processing) {
    processQueue().catch(console.error)
  }
}

export function getJobStatus(jobId: string): BatchJob | undefined {
  return jobQueue.find(j => j.id === jobId)
}

export function getActiveJobs(): BatchJob[] {
  return jobQueue.filter(j => j.status === "pending" || j.status === "running")
}

async function processQueue(): Promise<void> {
  if (processing) return
  processing = true

  while (jobQueue.length > 0) {
    const job = jobQueue.find(j => j.status === "pending")
    if (!job) break

    job.status = "running"

    try {
      switch (job.operation) {
        case "move": {
          const folder = job.params.folder as messenger.folders.MailFolder
          job.result = await batchMove(job.messageIds, folder)
          break
        }
        case "tag": {
          const addTags = (job.params.addTags as string[]) ?? []
          const removeTags = (job.params.removeTags as string[]) ?? []
          job.result = await batchTag(job.messageIds, addTags, removeTags)
          break
        }
        case "markRead": {
          const read = (job.params.read as boolean) ?? true
          job.result = await batchMarkRead(job.messageIds, read)
          break
        }
        case "delete": {
          job.result = await batchDelete(job.messageIds)
          break
        }
      }
      job.status = "completed"
    } catch {
      job.status = "failed"
      job.result = {
        operation: job.operation,
        total: job.messageIds.length,
        succeeded: 0,
        failed: job.messageIds.length,
      }
    }
  }

  processing = false
}
