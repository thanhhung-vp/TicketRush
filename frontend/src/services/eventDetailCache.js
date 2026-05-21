import api from '../lib/api.js';
import { createRequestCache } from '../utils/prefetchCache.js';

const EVENT_DETAIL_TTL_MS = 60_000;
const eventDetailCache = createRequestCache({ ttlMs: EVENT_DETAIL_TTL_MS });

function getEventId(eventOrId) {
  if (eventOrId && typeof eventOrId === 'object') return eventOrId.id;
  return eventOrId;
}

export function seedEventDetail(event) {
  const id = getEventId(event);
  if (!id || !event) return null;

  const cached = eventDetailCache.get(id);
  if (cached && !eventDetailCache.isPartial(id)) return cached;

  return eventDetailCache.set(id, { ...event }, { partial: true });
}

export function getCachedEventDetail(id) {
  return eventDetailCache.get(id);
}

export function isCachedEventDetailPartial(id) {
  return eventDetailCache.isPartial(id);
}

export function fetchEventDetail(id, { signal, force = false } = {}) {
  if (!id) return Promise.resolve(null);

  return eventDetailCache.fetch(id, async () => {
    const { data } = await api.get(`/events/${id}`, { signal });
    return data;
  }, { force });
}

export function prefetchEventDetail(eventOrId) {
  const id = getEventId(eventOrId);
  if (!id) return false;

  if (eventOrId && typeof eventOrId === 'object') seedEventDetail(eventOrId);
  fetchEventDetail(id).catch(() => {});
  return true;
}

export function clearEventDetailCache() {
  eventDetailCache.clear();
}
