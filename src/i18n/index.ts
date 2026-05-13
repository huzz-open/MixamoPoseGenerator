import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import en from './en'

export type MessageSchema = typeof zhCN

function detectLocale(): 'zh-CN' | 'en' {
  const saved = localStorage.getItem('locale')
  if (saved === 'zh-CN' || saved === 'en') return saved
  const lang = navigator.language
  if (lang.startsWith('zh')) return 'zh-CN'
  return 'en'
}

const i18n = createI18n<[MessageSchema], 'zh-CN' | 'en'>({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n

export function setLocale(locale: 'zh-CN' | 'en') {
  ;(i18n.global.locale as unknown as { value: string }).value = locale
  localStorage.setItem('locale', locale)
  document.documentElement.lang = locale === 'zh-CN' ? 'zh-CN' : 'en'
}
