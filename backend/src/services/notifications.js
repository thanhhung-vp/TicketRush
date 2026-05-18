import { config } from '../config/index.js';
import { sendEmail } from './email.js';

function toJson(value) {
  return JSON.stringify(value || {});
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function emitNotification(io, notification) {
  if (!io || !notification?.user_id) return;
  io.to(`user:${notification.user_id}`).emit('notification:new', notification);
}

function buildEventLine(item) {
  return `${item.event_title || item.title || ''} - ${item.zone_name || 'Zone'} ${item.seat_label || ''}`.trim();
}

function buildActionUrl(path) {
  return new URL(path, config.clientUrl).toString();
}

async function sendNotificationEmail({ to, subject, html, logPrefix }) {
  if (!to) return false;
  try {
    await sendEmail({ to, subject, html });
    return true;
  } catch (err) {
    console.error(`${logPrefix} email send error:`, err.message);
    return false;
  }
}

export async function createNotification({
  db,
  io,
  userId,
  type,
  title,
  body = '',
  actionUrl = null,
  metadata = {},
}) {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, action_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [userId, type, title, body || null, actionUrl, toJson(metadata)]
  );
  emitNotification(io, rows[0]);
  return rows[0];
}

export async function createNotificationsForUsers({
  db,
  io,
  users,
  type,
  title,
  body = '',
  actionUrl = null,
  metadata = {},
}) {
  if (!users.length) return [];

  const values = [];
  const params = [];
  users.forEach((user, index) => {
    const base = index * 6;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`);
    params.push(user.id, type, title, body || null, actionUrl, toJson(metadata));
  });

  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, action_url, metadata)
     VALUES ${values.join(', ')}
     RETURNING *`,
    params
  );
  rows.forEach(notification => emitNotification(io, notification));
  return rows;
}

export function buildNewEventEmail({ event, actionUrl }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TicketRush</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin-top:0">Sự kiện mới đã mở bán</h2>
      <p><strong>${escapeHtml(event.title)}</strong> hiện đã có trên TicketRush.</p>
      <p><strong>Địa điểm:</strong> ${escapeHtml(event.venue)}</p>
      <p><strong>Thời gian:</strong> ${new Date(event.event_date).toLocaleString('vi-VN')}</p>
      <p style="margin-top:20px">
        <a href="${escapeHtml(actionUrl)}" style="background:#E6007E;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
          Xem sự kiện
        </a>
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush
    </div>
  </div>`;
}

export function buildTicketCancelledEmail({ ticket, actionUrl }) {
  const eventLine = buildEventLine(ticket);
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TicketRush</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin-top:0">Ticket cancelled</h2>
      <p>Your ticket has been cancelled by TicketRush admin.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr>
          <td style="padding:6px 12px;color:#666">Event</td>
          <td style="padding:6px 12px">${escapeHtml(ticket.event_title)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Seat</td>
          <td style="padding:6px 12px">${escapeHtml(eventLine)}</td>
        </tr>
        ${ticket.reason ? `
        <tr>
          <td style="padding:6px 12px;color:#666">Reason</td>
          <td style="padding:6px 12px">${escapeHtml(ticket.reason)}</td>
        </tr>` : ''}
      </table>
      <p style="margin-top:20px">
        <a href="${escapeHtml(actionUrl)}" style="background:#E6007E;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
          View my tickets
        </a>
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush
    </div>
  </div>`;
}

export function buildTicketRefundedEmail({ refund, status, actionUrl }) {
  const approved = status === 'approved';
  const title = approved ? 'Refund approved' : 'Refund rejected';
  const message = approved
    ? 'Your refund request has been approved. The ticket was removed and the seat is available again.'
    : 'Your refund request has been rejected. Your ticket remains unchanged.';
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TicketRush</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin-top:0">${title}</h2>
      <p>${message}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr>
          <td style="padding:6px 12px;color:#666">Event</td>
          <td style="padding:6px 12px">${escapeHtml(refund.event_title)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Seat</td>
          <td style="padding:6px 12px">${escapeHtml(buildEventLine(refund))}</td>
        </tr>
      </table>
      <p style="margin-top:20px">
        <a href="${escapeHtml(actionUrl)}" style="background:#E6007E;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">
          View my tickets
        </a>
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush
    </div>
  </div>`;
}

export async function notifyCustomersAboutNewEvent({ db, io, event }) {
  if (!event || event.status !== 'on_sale') return { notifications: 0, emails: 0 };

  const { rows: users } = await db.query(
    `SELECT id, email
     FROM users
     WHERE role = 'customer'
       AND email IS NOT NULL
       AND email <> ''`
  );
  const actionUrl = `/events/${event.id}`;
  const absoluteUrl = buildActionUrl(actionUrl);
  const title = 'Sự kiện mới';
  const body = `${event.title} đã mở bán tại ${event.venue}.`;

  const notifications = await createNotificationsForUsers({
    db,
    io,
    users,
    type: 'event_new',
    title,
    body,
    actionUrl,
    metadata: { event_id: event.id },
  });

  const emailResults = await Promise.allSettled(users.map(user => (
    sendEmail({
      to: user.email,
      subject: `TicketRush: Sự kiện mới ${event.title}`,
      html: buildNewEventEmail({ event, actionUrl: absoluteUrl }),
    })
  )));

  emailResults
    .filter(result => result.status === 'rejected')
    .forEach(result => console.error('New event email send error:', result.reason?.message || result.reason));

  return {
    notifications: notifications.length,
    emails: emailResults.filter(result => result.status === 'fulfilled').length,
  };
}

export async function notifyUserTicketCancelled({ db, io, ticket, reason }) {
  const actionUrl = '/my-tickets?status=cancelled';
  const notification = await createNotification({
    db,
    io,
    userId: ticket.user_id,
    type: 'ticket_cancelled',
    title: 'Ticket cancelled',
    body: buildEventLine(ticket),
    actionUrl,
    metadata: {
      event_id: ticket.event_id,
      order_id: ticket.order_id,
      ticket_id: ticket.ticket_id || ticket.id,
      seat_id: ticket.seat_id,
      reason: reason || ticket.reason || null,
    },
  });

  const email = await sendNotificationEmail({
    to: ticket.user_email || ticket.email,
    subject: `TicketRush: Ticket cancelled - ${ticket.event_title}`,
    html: buildTicketCancelledEmail({
      ticket: { ...ticket, reason: reason || ticket.reason || null },
      actionUrl: buildActionUrl(actionUrl),
    }),
    logPrefix: 'Ticket cancellation',
  });

  return { notification: Boolean(notification), email };
}

export async function sendTicketCancelledEmail({ ticket, reason }) {
  return sendNotificationEmail({
    to: ticket.user_email || ticket.email,
    subject: `TicketRush: Ticket cancelled - ${ticket.event_title}`,
    html: buildTicketCancelledEmail({
      ticket: { ...ticket, reason: reason || ticket.reason || null },
      actionUrl: buildActionUrl('/my-tickets?status=cancelled'),
    }),
    logPrefix: 'Ticket cancellation',
  });
}

export async function notifyUserTicketRefunded({ db, io, refund, status = 'approved' }) {
  const approved = status === 'approved';
  const actionUrl = '/my-tickets?status=cancelled';
  const notification = await createNotification({
    db,
    io,
    userId: refund.user_id,
    type: approved ? 'ticket_refunded' : 'ticket_refund_rejected',
    title: approved ? 'Refund approved' : 'Refund rejected',
    body: buildEventLine(refund),
    actionUrl,
    metadata: {
      event_id: refund.event_id,
      order_id: refund.order_id,
      ticket_id: refund.ticket_id,
      seat_id: refund.seat_id,
      refund_id: refund.id,
    },
  });

  const email = await sendNotificationEmail({
    to: refund.user_email || refund.email,
    subject: `TicketRush refund ${status}: ${refund.event_title}`,
    html: buildTicketRefundedEmail({
      refund,
      status,
      actionUrl: buildActionUrl(actionUrl),
    }),
    logPrefix: 'Refund',
  });

  return { notification: Boolean(notification), email };
}

export async function sendTicketRefundEmail({ refund, status = 'approved' }) {
  return sendNotificationEmail({
    to: refund.user_email || refund.email,
    subject: `TicketRush refund ${status}: ${refund.event_title}`,
    html: buildTicketRefundedEmail({
      refund,
      status,
      actionUrl: buildActionUrl('/my-tickets?status=cancelled'),
    }),
    logPrefix: 'Refund',
  });
}
