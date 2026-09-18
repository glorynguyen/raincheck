// Client-side "bring your own key" storage for local development only.
const STORAGE_KEY = 'raincheck:tomorrow-io-api-key'

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value && value.trim() !== '' ? value.trim() : null
}

export function setStoredApiKey(apiKey: string) {
  window.localStorage.setItem(STORAGE_KEY, apiKey.trim())
}

export function clearStoredApiKey() {
  window.localStorage.removeItem(STORAGE_KEY)
}
