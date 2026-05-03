const UNSOLD_DELETE_ERROR = 'Chỉ có thể xóa sự kiện khi số vé đã bán là 0';

function toCount(value) {
  return Number(value || 0);
}

export function canDeleteEvent({ soldSeats, paidOrders, tickets }) {
  const hasSoldSeats = toCount(soldSeats) > 0;
  const hasPaidOrders = toCount(paidOrders) > 0;
  const hasTickets = toCount(tickets) > 0;

  if (hasSoldSeats || hasPaidOrders || hasTickets) {
    return {
      ok: false,
      error: UNSOLD_DELETE_ERROR,
    };
  }

  return { ok: true };
}
