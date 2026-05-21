const DEFAULT_TTL_MS = 30_000;

export function createRequestCache({ ttlMs = DEFAULT_TTL_MS, now = () => Date.now() } = {}) {
  const entries = new Map();

  const normalizeKey = key => String(key);

  const getFreshEntry = (key) => {
    const normalizedKey = normalizeKey(key);
    const entry = entries.get(normalizedKey);
    if (!entry) return null;

    if (entry.expiresAt <= now()) {
      entries.delete(normalizedKey);
      return null;
    }

    return entry;
  };

  return {
    get(key) {
      return getFreshEntry(key)?.data ?? null;
    },

    isPartial(key) {
      return Boolean(getFreshEntry(key)?.partial);
    },

    set(key, data, { partial = false } = {}) {
      entries.set(normalizeKey(key), {
        data,
        partial,
        expiresAt: now() + ttlMs,
        promise: null,
      });
      return data;
    },

    fetch(key, fetcher, { force = false } = {}) {
      const normalizedKey = normalizeKey(key);
      const existing = getFreshEntry(normalizedKey);

      if (!force && existing?.promise) return existing.promise;
      if (!force && existing && !existing.partial) return Promise.resolve(existing.data);

      const previousData = existing?.data ?? null;
      const previousPartial = Boolean(existing?.partial);
      const promise = Promise.resolve()
        .then(fetcher)
        .then(data => {
          entries.set(normalizedKey, {
            data,
            partial: false,
            expiresAt: now() + ttlMs,
            promise: null,
          });
          return data;
        })
        .catch(error => {
          if (previousData !== null) {
            entries.set(normalizedKey, {
              data: previousData,
              partial: previousPartial,
              expiresAt: now() + ttlMs,
              promise: null,
            });
          } else {
            entries.delete(normalizedKey);
          }
          throw error;
        });

      entries.set(normalizedKey, {
        data: previousData,
        partial: previousPartial,
        expiresAt: now() + ttlMs,
        promise,
      });

      return promise;
    },

    clear() {
      entries.clear();
    },
  };
}
