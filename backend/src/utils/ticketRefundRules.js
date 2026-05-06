export function getTicketRefundBlockReason({ ticket, now = new Date() } = {}) {
  if (!ticket) return 'ticket_not_found';
  if (ticket.user_id !== ticket.order_user_id) return 'not_original_buyer';
  if (ticket.status !== 'paid') return 'order_not_paid';
  if (ticket.checked_in_at) return 'ticket_checked_in';

  const eventTime = new Date(ticket.event_date).getTime();
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isNaN(eventTime) && !Number.isNaN(nowTime) && eventTime <= nowTime) {
    return 'event_ended';
  }

  if (ticket.has_pending_transfer) return 'pending_transfer';
  return null;
}
