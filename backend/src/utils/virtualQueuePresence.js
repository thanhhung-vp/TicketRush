import { releaseQueueSlotAndFill } from './virtualQueueFlow.js';

const DEFAULT_QUEUE_PAGE_LEAVE_GRACE_MS = 2_000;

function presenceKey(eventId, userId) {
  return `${eventId}:${userId}`;
}

function normalizeEventId(eventId) {
  if (eventId === null || eventId === undefined) return null;
  const normalized = String(eventId).trim();
  return normalized || null;
}

export function createVirtualQueuePresence({
  io,
  releaseSlotAndFill = releaseQueueSlotAndFill,
  graceMs = Number(process.env.QUEUE_PAGE_LEAVE_GRACE_MS) || DEFAULT_QUEUE_PAGE_LEAVE_GRACE_MS,
  logger = console,
} = {}) {
  const activePages = new Map();

  function join(eventId, userId) {
    const normalizedEventId = normalizeEventId(eventId);
    if (!normalizedEventId || !userId) return null;

    const key = presenceKey(normalizedEventId, userId);
    const current = activePages.get(key) || { count: 0, timer: null };
    if (current.timer) {
      clearTimeout(current.timer);
      current.timer = null;
    }

    const next = { ...current, count: current.count + 1 };
    activePages.set(key, next);
    return normalizedEventId;
  }

  function leave(eventId, userId) {
    const normalizedEventId = normalizeEventId(eventId);
    if (!normalizedEventId || !userId) return;

    const key = presenceKey(normalizedEventId, userId);
    const current = activePages.get(key);
    if (!current) return;

    const nextCount = Math.max(0, current.count - 1);
    if (nextCount > 0) {
      activePages.set(key, { ...current, count: nextCount });
      return;
    }

    if (current.timer) clearTimeout(current.timer);
    const timer = setTimeout(() => {
      const latest = activePages.get(key);
      if (!latest || latest.count > 0) return;
      activePages.delete(key);
      releaseSlotAndFill({ eventId: normalizedEventId, userId, io }).catch(err => {
        logger.warn?.('Queue slot release skipped:', err.message);
      });
    }, Math.max(0, graceMs));
    timer.unref?.();

    activePages.set(key, { count: 0, timer });
  }

  function getActiveCount(eventId, userId) {
    return activePages.get(presenceKey(eventId, userId))?.count || 0;
  }

  return { join, leave, getActiveCount };
}
