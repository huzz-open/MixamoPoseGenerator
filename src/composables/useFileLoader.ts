import { ref, readonly } from 'vue'
import { parseDaeOrZip } from '../core/dae-parser'
import type { ParseResult } from '../types/pose'

export function useFileLoader() {
  const parseResult = ref<ParseResult | null>(null)
  const animationName = ref('')
  const fullFileName = ref('')
  const isLoading = ref(false)
  const error = ref('')

  async function loadFile(file: File) {
    isLoading.value = true
    error.value = ''
    parseResult.value = null
    animationName.value = ''
    fullFileName.value = file.name

    try {
      const result = await parseDaeOrZip(file)
      parseResult.value = result
      animationName.value = file.name.replace(/\.(dae|zip)$/i, '')
    } catch (e: any) {
      error.value = e.message || 'Failed to parse file'
      fullFileName.value = ''
    } finally {
      isLoading.value = false
    }
  }

  return {
    parseResult: readonly(parseResult),
    animationName: readonly(animationName),
    fullFileName: readonly(fullFileName),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadFile,
  }
}
