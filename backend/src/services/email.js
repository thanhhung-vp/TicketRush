import nodemailer from 'nodemailer';

function createTransport() {
  // Use SMTP_HOST/PORT/USER/PASS from env; fall back to Ethereal (test) if not set
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // Ethereal test account — emails are captured at https://ethereal.email
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.ETHEREAL_USER || 'ethereal_user',
      pass: process.env.ETHEREAL_PASS || 'ethereal_pass',
    },
  });
}

const transporter = createTransport();

export async function sendOrderConfirmation({ to, full_name, event_title, event_date, venue, tickets, total_amount }) {
  const ticketRows = tickets.map(t =>
    `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${t.zone_name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0">${t.seat_label}</td>
    </tr>`
  ).join('');

  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">🎫 TicketRush</h1>
    </div>
    <div style="padding:24px">
      <p>Xin chào <strong>${full_name}</strong>,</p>
      <p>Đặt vé của bạn đã được xác nhận thành công!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#fdf2f8">
          <td colspan="2" style="padding:10px 12px;font-weight:bold">📅 ${event_title}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Địa điểm</td>
          <td style="padding:6px 12px">${venue}</td>
        </tr>
        <tr>
          <td style="padding:6px 12px;color:#666">Thời gian</td>
          <td style="padding:6px 12px">${new Date(event_date).toLocaleString('vi-VN')}</td>
        </tr>
      </table>
      <h3 style="margin:16px 0 8px">Vé của bạn</h3>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f9f9f9">
          <th style="padding:8px 12px;text-align:left">Khu vực</th>
          <th style="padding:8px 12px;text-align:left">Ghế</th>
        </tr>
        ${ticketRows}
      </table>
      <p style="margin-top:16px">
        <strong>Tổng tiền:</strong>
        ${Number(total_amount).toLocaleString('vi-VN')}₫
      </p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Vui lòng đăng nhập vào TicketRush để xem mã QR vé của bạn.<br>
        Mã QR sẽ được quét tại cổng vào sự kiện.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush — Nền tảng đặt vé sự kiện trực tuyến
    </div>
  </div>`;

  try {
    const info = await transporter.sendMail({
      from: `"TicketRush" <${process.env.SMTP_FROM || 'noreply@ticketrush.vn'}>`,
      to,
      subject: `✅ Xác nhận đặt vé: ${event_title}`,
      html,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email preview:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    // Non-fatal — log but don't break the booking flow
    console.error('Email send error:', err.message);
  }
}

export async function sendPasswordResetOTP({ to, otp }) {
  const html = `
  <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#222">
    <div style="background:#E6007E;padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px">🎫 TicketRush</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin-top:0">Khôi phục mật khẩu</h2>
      <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản TicketRush. Vui lòng sử dụng mã xác minh gồm 6 chữ số dưới đây:</p>
      <div style="background:#f4f4f4;padding:16px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:4px;margin:24px 0;border-radius:8px;">
        ${otp}
      </div>
      <p>Mã này có hiệu lực trong vòng 15 phút. Không chia sẻ mã này với bất kỳ ai.</p>
      <p style="color:#666;font-size:13px;margin-top:24px">
        Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
      </p>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#999">
      TicketRush — Nền tảng đặt vé sự kiện trực tuyến
    </div>
  </div>`;

  try {
    const info = await transporter.sendMail({
      from: `"TicketRush" <${process.env.SMTP_FROM || 'noreply@ticketrush.vn'}>`,
      to,
      subject: `🔒 Mã xác minh khôi phục mật khẩu: ${otp}`,
      html,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Password Reset OTP Email preview:', nodemailer.getTestMessageUrl(info));
    }
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}
