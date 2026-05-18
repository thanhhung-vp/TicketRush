import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock('../services/email.js', () => ({
  sendEmail: sendEmailMock,
}));

const {
  buildNewEventEmail,
  buildTicketCancelledEmail,
  buildTicketRefundedEmail,
  createNotification,
  notifyUserTicketCancelled,
  notifyUserTicketRefunded,
  notifyCustomersAboutNewEvent,
} = await import('../services/notifications.js');

describe('notification service', () => {
  beforeEach(() => {
    sendEmailMock.mockReset();
  });

  it('creates a user notification and emits it to the user socket room', async () => {
    const notification = {
      id: 'notification-1',
      user_id: 'user-1',
      title: 'Ticket received',
    };
    const db = {
      query: vi.fn(async () => ({ rows: [notification] })),
    };
    const emit = vi.fn();
    const io = {
      to: vi.fn(() => ({ emit })),
    };

    const result = await createNotification({
      db,
      io,
      userId: 'user-1',
      type: 'ticket_received',
      title: 'Ticket received',
      actionUrl: '/my-tickets?status=paid',
    });

    expect(result).toBe(notification);
    expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO notifications/i);
    expect(io.to).toHaveBeenCalledWith('user:user-1');
    expect(emit).toHaveBeenCalledWith('notification:new', notification);
  });

  it('notifies all customers and emails them when a new on-sale event is published', async () => {
    const users = [
      { id: 'user-1', email: 'one@example.com' },
      { id: 'user-2', email: 'two@example.com' },
    ];
    const db = {
      query: vi.fn(async (sql) => {
        if (sql.includes('FROM users')) return { rows: users };
        return {
          rows: users.map(user => ({
            id: `notification-${user.id}`,
            user_id: user.id,
            type: 'event_new',
          })),
        };
      }),
    };
    sendEmailMock.mockResolvedValue({});

    const result = await notifyCustomersAboutNewEvent({
      db,
      event: {
        id: 'event-1',
        status: 'on_sale',
        title: 'Launch Concert',
        venue: 'Main Hall',
        event_date: '2026-06-01T12:00:00.000Z',
      },
    });

    expect(result).toEqual({ notifications: 2, emails: 2 });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(db.query.mock.calls[1][0]).toMatch(/INSERT INTO notifications/i);
  });

  it('escapes new event email content', () => {
    const html = buildNewEventEmail({
      event: {
        title: '<script>alert(1)</script>',
        venue: '<b>Hall</b>',
        event_date: '2026-06-01T12:00:00.000Z',
      },
      actionUrl: 'http://localhost:3000/events/event-1',
    });

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;b&gt;Hall&lt;/b&gt;');
  });

  it('emails the customer when an admin cancels a ticket', async () => {
    const ticket = {
      user_id: 'user-1',
      user_email: 'buyer@gmail.com',
      event_id: 'event-1',
      order_id: 'order-1',
      ticket_id: 'ticket-1',
      seat_id: 'seat-1',
      event_title: 'Launch Concert',
      zone_name: 'VIP',
      seat_label: 'A01',
      reason: 'Schedule changed',
    };
    const db = {
      query: vi.fn(async () => ({
        rows: [{ id: 'notification-1', user_id: 'user-1', type: 'ticket_cancelled' }],
      })),
    };
    sendEmailMock.mockResolvedValue({});

    const result = await notifyUserTicketCancelled({ db, ticket });

    expect(result).toEqual({ notification: true, email: true });
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'buyer@gmail.com',
      subject: expect.stringContaining('Launch Concert'),
    }));
  });

  it('emails the customer when a refund is approved', async () => {
    const refund = {
      id: 'refund-1',
      user_id: 'user-1',
      user_email: 'buyer@gmail.com',
      event_id: 'event-1',
      order_id: 'order-1',
      ticket_id: 'ticket-1',
      seat_id: 'seat-1',
      event_title: 'Launch Concert',
      zone_name: 'VIP',
      seat_label: 'A01',
    };
    const db = {
      query: vi.fn(async () => ({
        rows: [{ id: 'notification-1', user_id: 'user-1', type: 'ticket_refunded' }],
      })),
    };
    sendEmailMock.mockResolvedValue({});

    const result = await notifyUserTicketRefunded({ db, refund, status: 'approved' });

    expect(result).toEqual({ notification: true, email: true });
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'buyer@gmail.com',
      subject: expect.stringContaining('approved'),
    }));
  });

  it('escapes ticket status email content', () => {
    const cancelledHtml = buildTicketCancelledEmail({
      ticket: {
        event_title: '<script>alert(1)</script>',
        zone_name: '<b>VIP</b>',
        seat_label: 'A01',
        reason: '<img src=x>',
      },
      actionUrl: 'http://localhost:3000/my-tickets?status=cancelled',
    });
    const refundedHtml = buildTicketRefundedEmail({
      refund: {
        event_title: '<script>alert(1)</script>',
        zone_name: '<b>VIP</b>',
        seat_label: 'A01',
      },
      status: 'approved',
      actionUrl: 'http://localhost:3000/my-tickets?status=cancelled',
    });

    expect(cancelledHtml).not.toContain('<script>alert(1)</script>');
    expect(cancelledHtml).toContain('&lt;b&gt;VIP&lt;/b&gt;');
    expect(cancelledHtml).toContain('&lt;img src=x&gt;');
    expect(refundedHtml).not.toContain('<script>alert(1)</script>');
  });
});
