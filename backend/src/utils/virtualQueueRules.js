export const DEFAULT_QUEUE_BATCH_SIZE = 50;
export const MAX_QUEUE_BATCH_SIZE = 500;

export function normalizeQueueBatchSize(value, fallback = DEFAULT_QUEUE_BATCH_SIZE) {
  if (value === undefined || value === null || value === '') {
    return normalizeQueueBatchSize(fallback, DEFAULT_QUEUE_BATCH_SIZE);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, MAX_QUEUE_BATCH_SIZE);
}

export function getAvailableAdmissionSlots({ capacity, admittedCount }) {
  const normalizedCapacity = normalizeQueueBatchSize(capacity);
  const normalizedAdmitted = Math.max(0, Number(admittedCount) || 0);
  return Math.max(0, normalizedCapacity - normalizedAdmitted);
}

export function userHasQueueAccess({ queueEnabled, admitted, isAdmin }) {
  return !queueEnabled || Boolean(isAdmin) || Boolean(admitted);
}

export function extractQueueUserIds(zpopminResult) {
  if (!Array.isArray(zpopminResult)) return [];
  return zpopminResult.filter((_, index) => index % 2 === 0);
}
