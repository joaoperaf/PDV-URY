import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './config';

function normalizeLang(lang?: string | null): string | undefined {
  if (!lang) return undefined;
  const normalized = lang.trim().replace('_', '-');
  if (normalized.toLowerCase() === 'pt' || normalized.toLowerCase() === 'pt-br') {
    return 'pt-BR';
  }
  return SUPPORTED_LANGUAGES[normalized] ? normalized : undefined;
}

/**
 * Resolves the active language using the following priority:
 * 1. localStorage key 'ury_language'
 * 2. frappe.boot.lang (Frappe site config / user preference)
 * 3. DEFAULT_LANGUAGE ('pt-BR')
 */
export function resolveLanguage(): string {
  // 1. Local storage override
  const storedLang = normalizeLang(localStorage.getItem('ury_language'));
  if (storedLang) {
    return storedLang;
  }

  // 2. Frappe boot object
  const frappeLang = normalizeLang((window as any)?.frappe?.boot?.lang);
  if (frappeLang && frappeLang !== 'en') {
    return frappeLang;
  }

  return DEFAULT_LANGUAGE;
}
