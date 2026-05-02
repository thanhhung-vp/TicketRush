import { useState, useEffect } from 'react';

/**
 * Returns remaining seconds from a future Date (or ISO string).
 * Ticks down every second. Returns null if not started.
 */
export function useCountdown(targetDate) {
  const [seconds, setSeconds] = useState(() =>
    targetDate ? Math.max(0, Math.floor((new Date(targetDate) - Date.now()) / 1000)) : null
  );

  useEffect(() => {
    if (seconds === null) return;
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return seconds;
}
