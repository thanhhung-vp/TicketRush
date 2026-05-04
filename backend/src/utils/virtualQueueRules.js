export const DEFAULT_QUEUE_BATCH_SIZE = 50;
export const MAX_QUEUE_BATCH_SIZE = 500;

export function normalizeQueueBatchSize(value, fallback = DEFAULT_QUEUE_BATCH_SIZE) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, MAX_QUEUE_BATCH_SIZE);
}

export function userHasQueueAccess({ queueEnabled, admitted, isAdmin }) {
  return !queueEnabled || Boolean(isAdmin) || Boolean(admitted);
}

export function extractQueueUserIds(zpopminResult) {
  if (!Array.isArray(zpopminResult)) return [];
  return zpopminResult.filter((_, index) => index % 2 === 0);
}
