import { ref, readonly } from 'vue'

export type LogLevel = 'info' | 'success' | 'error' | 'warning'

export interface LogEntry {
  time: string
  message: string
  level: LogLevel
}

export function useLog() {
  const entries = ref<LogEntry[]>([])

  function log(message: string, level: LogLevel = 'info') {
    const now = new Date()
    const time = now.toLocaleTimeString('zh-CN', { hour12: false })
    entries.value.push({ time, message, level })
  }

  function clear() {
    entries.value = []
  }

  return {
    entries: readonly(entries),
    log,
    clear,
  }
}
