/**
 * Periodic rule evaluation via the alarms API.
 */

import { evaluateRecent } from "./engine"

const ALARM_NAME = "corvus-rule-eval"
const DEFAULT_PERIOD_MINUTES = 5

export function setupRuleScheduler(): void {
  messenger.alarms.create(ALARM_NAME, {
    periodInMinutes: DEFAULT_PERIOD_MINUTES,
  })

  messenger.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      evaluateRecent().catch(err => {
        console.error("Rule evaluation failed:", err)
      })
    }
  })
}

export async function updateSchedulerPeriod(minutes: number): Promise<void> {
  await messenger.alarms.clear(ALARM_NAME)
  messenger.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, minutes),
  })
}
