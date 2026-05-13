import { ref, computed } from 'vue'

export interface RotationRecord {
  directionName: string
  oldAngle: number
  newAngle: number
}

export function useRotationHistory() {
  const undoStack = ref<RotationRecord[]>([])
  const redoStack = ref<RotationRecord[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function push(record: RotationRecord) {
    undoStack.value.push(record)
    redoStack.value = []
  }

  function undo(): RotationRecord | null {
    const record = undoStack.value.pop()
    if (!record) return null
    redoStack.value.push(record)
    return record
  }

  function redo(): RotationRecord | null {
    const record = redoStack.value.pop()
    if (!record) return null
    undoStack.value.push(record)
    return record
  }

  function clear() {
    undoStack.value = []
    redoStack.value = []
  }

  return { canUndo, canRedo, push, undo, redo, clear }
}
