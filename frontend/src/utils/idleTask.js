export function scheduleIdleTask(callback, timeout = 1200) {
  if (typeof window === 'undefined') return () => {};

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timerId = window.setTimeout(callback, Math.min(timeout, 500));
  return () => window.clearTimeout(timerId);
}
