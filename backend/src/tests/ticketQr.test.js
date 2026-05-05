import { describe, expect, it, vi } from 'vitest';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async payload => `data:image/png;base64,${Buffer.from(payload).toString('base64')}`),
  },
}));

const { attachDynamicQrToTicket, attachDynamicQrToTickets } = await import('../utils/ticketQr.js');

describe('ticket QR helpers', () => {
  it('returns a new ticket object with a QR data URL that includes the ticket id', async () => {
    const ticket = {
      id: 'ticket-1',
      order_id: 'order-1',
      seat_id: 'seat-1',
      user_id: 'user-1',
      event_id: 'event-1',
      qr_code: 'old-qr',
    };

    const result = await attachDynamicQrToTicket(ticket);
    const encodedPayload = result.qr_code.replace('data:image/png;base64,', '');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));

    expect(result).not.toBe(ticket);
    expect(result.qr_code).toMatch(/^data:image\/png;base64,/);
    expect(payload).toMatchObject({ ticket_id: ticket.id, order_id: ticket.order_id });
    expect(ticket.qr_code).toBe('old-qr');
  });

  it('attaches QR data URLs to a ticket list', async () => {
    const result = await attachDynamicQrToTickets([
      { id: 'ticket-1', order_id: 'order-1', seat_id: 'seat-1', user_id: 'user-1' },
      { id: 'ticket-2', order_id: 'order-2', seat_id: 'seat-2', user_id: 'user-2' },
    ]);

    expect(result).toHaveLength(2);
    expect(result.every(ticket => ticket.qr_code.startsWith('data:image/png;base64,'))).toBe(true);
  });
});
