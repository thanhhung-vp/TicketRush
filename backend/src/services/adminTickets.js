export function canIssueAdminTicket(seatStatus) {
  return seatStatus === 'available';
}

export function getOrderStateAfterTicketDelete(itemCount, totalAmount) {
  if (Number(itemCount) <= 0) {
    return { status: 'cancelled', totalAmount: 0 };
  }

  return { status: 'paid', totalAmount: Number(totalAmount) };
}
