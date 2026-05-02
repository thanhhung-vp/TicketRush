export const formatVND = (n, compact = false) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND',
    ...(compact && { notation: 'compact' }),
  }).format(Number(n));

export const formatDate = (d, opts = {}) =>
  new Date(d).toLocaleString('vi-VN', {
    weekday: opts.full ? 'long' : 'short',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  });

export const formatDateShort = (d) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const formatCountdown = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
};
