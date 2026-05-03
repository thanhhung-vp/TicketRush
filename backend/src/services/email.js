import nodemailer from 'nodemailer';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'TicketRush <onboarding@resend.dev>';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  return new Date(value).toLocaleString('vi-VN');
}

function formatMoney(value) {
  return `${Number(value).toLocaleString('vi-VN')} VND`;
}

export function resolveEmailProvider(env = process.env) {
  if (env.RESEND_API_KEY) return 'resend';
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) return 'smtp';
  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) return 'ethereal';
  return 'none';
}

function getFromAddress(env = process.env) {
  return env.RESEND_FROM || env.SMTP_FROM || DEFAULT_FROM;
}

function createTransport(env = process.env) {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || '587'),
      secure: env.SMTP_SECURE === 'true',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS },
    });
  }

  throw new Error('Email provider is not configured');
}

async function sendViaResend({ from, to, subject, html }, env = process.env) {
  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || `Resend email failed with status ${response.status}`;
    throw new Error(message);
  }

  if (env.NODE_ENV !== 'production') {
    console.log('Email sent via Resend:', payload.id);
  }

  return payload;
}

async function sendViaSmtp({ from, to, subject, html }, env = process.env) {
  const transporter = createTransport(env);
  const info = await transporter.sendMail({ from, to, subject, html });

  if (env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log('Email preview:', previewUrl);
  }

  return info;
}

export async function sendEmail({ to, subject, html }, env = process.env) {
  const message = { from: getFromAddress(env), to, subject, html };
  const provider = resolveEmailProvider(env);

  if (provider === 'resend') return sendViaResend(message, env);
  if (provider === 'smtp' || provider === 'ethereal') return sendViaSmtp(message, env);

  throw new Error('Email provider is not configured. Set RESEND_API_KEY or SMTP_* variables.');
}

export function buildPasswordResetOtpEmail({ otp }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TicketRush</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin-top:0">Password reset</h2>
      <p>Use this 6-digit verification code to reset your TicketRush password:</p>
      <div style="background:#f4f4f4;padding:16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:4px;margin:24px 0;border-radius:8px;">
        ${escapeHtml(otp)}
      </div>
      <p>This code expires in 15 minutes. Do not share it with anyone.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        If you did not request a password reset, ignore this email.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush
    </div>
  </div>`;
}

export async function sendOrderConfirmation({ to, full_name, event_title, event_date, venue, tickets, total_amount }) {
  const ticketRows = tickets.map(t =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(t.zone_name)}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${escapeHtml(t.seat_label)}</td>
    </tr>`
  ).join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">TicketRush</h1>
    </div>
    <div style="padding:24px">
      <p>Hello <strong>${escapeHtml(full_name)}</strong>,</p>
      <p>Your booking has been confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#fdf2f8">
          <td colspan="2" style="padding:10px 12px;font-weight:bold">${escapeHtml(event_title)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Venue</td>
          <td style="padding:6px 12px">${escapeHtml(venue)}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Time</td>
          <td style="padding:6px 12px">${escapeHtml(formatDate(event_date))}</td>
        </tr>
      </table>
      <h3 style="margin:16px 0 8px">Tickets</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f9f9f9">
          <th style="padding:8px 12px;text-align:left">Zone</th>
          <th style="padding:8px 12px;text-align:left">Seat</th>
        </tr>
        ${ticketRows}
      </table>
      <p style="margin-top:16px">
        <strong>Total:</strong> ${escapeHtml(formatMoney(total_amount))}
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Sign in to TicketRush to view your ticket QR codes.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush
    </div>
  </div>`;

  try {
    await sendEmail({
      to,
      subject: `TicketRush order confirmation: ${event_title}`,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

export async function sendPasswordResetOTP({ to, otp }) {
  await sendEmail({
    to,
    subject: `TicketRush password reset code: ${otp}`,
    html: buildPasswordResetOtpEmail({ otp }),
  });
}
