import { ref, readonly } from 'vue'
import { useI18n } from 'vue-i18n'
import JSZip from 'jszip'
import { parseDae } from '../core/dae-parser'
import type { ParseResult } from '../types/pose'

export function useFileLoader() {
  const { t } = useI18n()
  const parseResult = ref<ParseResult | null>(null)
  const animationName = ref('')
  const fullFileName = ref('')
  const isLoading = ref(false)
  const error = ref('')
  const daeXmlContent = ref<string | null>(null)

  async function loadFile(file: File) {
    isLoading.value = true
    error.value = ''
    parseResult.value = null
    animationName.value = ''
    fullFileName.value = file.name
    daeXmlContent.value = null

    try {
      let xmlContent: string
      if (file.name.toLowerCase().endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const daeFile = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('.dae'))
        if (!daeFile) throw new Error(t('errors.noDaeInZip'))
        xmlContent = await zip.files[daeFile].async('string')
      } else {
        xmlContent = await file.text()
      }

      const result = parseDae(xmlContent)
      parseResult.value = result
      animationName.value = file.name.replace(/\.(dae|zip)$/i, '')
      daeXmlContent.value = xmlContent
    } catch (e: any) {
      error.value = e.message || t('errors.parseFailed')
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
    daeXmlContent: readonly(daeXmlContent),
    loadFile,
  }
}
