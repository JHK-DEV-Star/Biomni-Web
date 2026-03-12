/**
 * React i18n module — wraps inference_ui's language files.
 * Uses React Context for language state, provides t() and useTranslation() hook.
 */
import { createContext, useContext } from 'react';

export interface LanguageInfo {
  code: string;
  name: string;
}

export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '简体中文' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'pl', name: 'Polski' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sv', name: 'Svenska' },
  { code: 'da', name: 'Dansk' },
  { code: 'no', name: 'Norsk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'hu', name: 'Magyar' },
  { code: 'ro', name: 'Română' },
  { code: 'uk', name: 'Українська' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'th', name: 'ภาษาไทย' },
  { code: 'id', name: 'Bahasa Indonesia' },
];

type LocaleData = Record<string, string>;

const localeCache: Record<string, LocaleData> = {};

// Eagerly import all locale JSON files via Vite's import.meta.glob
const localeModules = import.meta.glob('./locales/*.json', { eager: true }) as Record<
  string,
  { default: LocaleData }
>;

// Pre-populate cache from eager imports
for (const [path, mod] of Object.entries(localeModules)) {
  const match = path.match(/\/([a-z]{2})\.json$/);
  if (match) {
    localeCache[match[1]] = mod.default;
  }
}

export function getLocaleData(lang: string): LocaleData {
  return localeCache[lang] || localeCache['en'] || {};
}

/**
 * Translate key with optional interpolation: t('key', { count: 5 })
 */
export function translate(
  locale: LocaleData,
  fallback: LocaleData,
  key: string,
  params?: Record<string, string | number>,
): string {
  let str = locale[key] || fallback[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ─── React Context ───

export interface I18nContextValue {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  setLang: (lang: string) => void;
  availableLanguages: LanguageInfo[];
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
  availableLanguages: AVAILABLE_LANGUAGES,
});

export function useTranslation() {
  return useContext(I18nContext);
}
