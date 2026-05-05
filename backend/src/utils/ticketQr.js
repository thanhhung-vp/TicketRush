import QRCode from 'qrcode';

function buildTicketQrPayload(ticket) {
  return JSON.stringify({
    ticket_id: ticket.id,
    order_id: ticket.order_id,
    seat_id: ticket.seat_id,
    user_id: ticket.user_id,
    event_id: ticket.event_id,
  });
}

export async function attachDynamicQrToTicket(ticket) {
  if (!ticket) return ticket;
  const qrCode = await QRCode.toDataURL(buildTicketQrPayload(ticket));
  return { ...ticket, qr_code: qrCode };
}

export async function attachDynamicQrToTickets(tickets = []) {
  return Promise.all(tickets.map(ticket => attachDynamicQrToTicket(ticket)));
}
