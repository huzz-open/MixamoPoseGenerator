import { ref, readonly } from 'vue'

export type ToastType = 'info' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let nextId = 0
const items = ref<ToastItem[]>([])

export function useToast() {
  function toast(message: string, type: ToastType = 'info', duration = 2500) {
    const id = nextId++
    items.value.push({ id, message, type })
    setTimeout(() => {
      items.value = items.value.filter(t => t.id !== id)
    }, duration)
  }

  return {
    items: readonly(items),
    toast,
  }
}
