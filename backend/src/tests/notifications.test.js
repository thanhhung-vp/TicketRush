import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEmailMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
}));

vi.mock('../services/email.js', () => ({
  sendEmail: sendEmailMock,
}));

const {
  buildNewEventEmail,
  createNotification,
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
});
