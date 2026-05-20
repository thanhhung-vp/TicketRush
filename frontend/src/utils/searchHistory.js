export const SEARCH_HISTORY_KEY = 'ticketrush.searchHistory';
export const SEARCH_HISTORY_LIMIT = 8;

export function normalizeSearchTerm(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function readSearchHistory(storage = globalThis.localStorage) {
  if (!storage) return [];

  try {
    const raw = storage.getItem(SEARCH_HISTORY_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];

    const seen = new Set();
    return parsed
      .map(normalizeSearchTerm)
      .filter(Boolean)
      .filter(term => {
        const key = term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveSearchTerm(value, storage = globalThis.localStorage) {
  const term = normalizeSearchTerm(value);
  if (!term || !storage) return readSearchHistory(storage);

  const next = [
    term,
    ...readSearchHistory(storage).filter(item => item.toLowerCase() !== term.toLowerCase()),
  ].slice(0, SEARCH_HISTORY_LIMIT);

  try {
    storage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    return next;
  }

  return next;
}

export function clearSearchHistory(storage = globalThis.localStorage) {
  if (!storage) return;
  try {
    storage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // Local storage may be unavailable in private or restricted contexts.
  }
}
