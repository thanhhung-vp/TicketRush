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

export async function notifyCustomersAboutNewEvent({ db, io, event }) {
  if (!event || event.status !== 'on_sale') return { notifications: 0, emails: 0 };

  const { rows: users } = await db.query(
    `SELECT id, email
     FROM users
     WHERE role = 'customer'`
  );
  const actionUrl = `/events/${event.id}`;
  const absoluteUrl = new URL(actionUrl, config.clientUrl).toString();
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
