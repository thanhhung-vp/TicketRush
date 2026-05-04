export const EVENT_DELETE_BLOCKED_ERROR =
  'Chỉ có thể xóa sự kiện khi tất cả ghế đều trống và chưa có vé đã bán';

function toCount(value) {
  return Number(value || 0);
}

export function canDeleteEvent({ soldSeats, lockedSeats, paidOrders, tickets, orders, adminActions }) {
  const hasUnavailableSeats = toCount(soldSeats) > 0 || toCount(lockedSeats) > 0;
  const hasSoldTickets = toCount(paidOrders) > 0 || toCount(tickets) > 0;
  const hasOrderHistory = toCount(orders) > 0;
  const hasAdminHistory = toCount(adminActions) > 0;

  if (hasUnavailableSeats || hasSoldTickets || hasOrderHistory || hasAdminHistory) {
    return {
      ok: false,
      error: EVENT_DELETE_BLOCKED_ERROR,
    };
  }

  return { ok: true };
}
