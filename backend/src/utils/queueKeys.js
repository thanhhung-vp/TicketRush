export function queueKey(eventId) {
  return `queue:${eventId}`;
}

export function admittedKey(eventId) {
  return `admitted:${eventId}`;
}

export function highLoadKey(eventId) {
  return `highload:${eventId}`;
}

export function queueAdmissionLockKey(eventId) {
  return `queue:${eventId}:admit-lock`;
}
