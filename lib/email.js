import nodemailer from 'nodemailer';
import getDb from '@/lib/db';

async function getTransporter() {
  const db = await getDb();
  const rows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key = 'app_url'");
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);

  const host = settings.smtp_host || process.env.SMTP_HOST;
  const user = settings.smtp_user || process.env.SMTP_USER;
  const pass = settings.smtp_pass || process.env.SMTP_PASS;
  const port = settings.smtp_port || process.env.SMTP_PORT || '587';
  const secure = (settings.smtp_secure || process.env.SMTP_SECURE) === 'true';
  const from = settings.smtp_from || process.env.SMTP_FROM || '"CDC Đà Nẵng" <noreply@cdc-danang.gov.vn>';
  const appUrl = settings.app_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!host || !user || !pass) {
    console.warn('[Email] Chưa cấu hình SMTP. Email sẽ không được gửi.');
    return { transporter: null, enabled: false, from, appUrl };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure,
    auth: { user, pass },
  });

  return { transporter, enabled: true, from, appUrl };
}

const statusLabels = {
  pending: 'Chờ tiếp nhận',
  received: 'Đã tiếp nhận',
  processing: 'Đang xử lý',
  completed: 'Đã hoàn tất',
};

function buildStatusEmail(app, newStatus, note, appUrl) {
  const statusText = statusLabels[newStatus] || newStatus;
  const trackUrl = `${appUrl}/track?id=${app.id}`;

  return {
    subject: `[CDC Đà Nẵng] Cập nhật hồ sơ ${app.id} — ${statusText}`,
    html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0263e0, #1e40af); padding: 30px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">CDC Đà Nẵng</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 13px;">Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng</p>
      </div>
      <div style="padding: 35px 40px; background: white;">
        <p style="color: #374151; font-size: 16px;">Kính gửi <strong>${app.name}</strong>,</p>
        <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
          Hồ sơ của bạn đã được cập nhật trạng thái mới:
        </p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="font-size: 13px; color: #1d4ed8; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Trạng thái hồ sơ</div>
          <div style="font-size: 24px; font-weight: 700; color: #0263e0;">${statusText}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 5px;">Mã hồ sơ: <strong>${app.id}</strong></div>
        </div>
        ${note ? `<div style="background: #f9fafb; border-left: 4px solid #0263e0; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;"><p style="margin: 0; color: #374151; font-size: 14px;"><strong>Ghi chú:</strong> ${note}</p></div>` : ''}
        ${newStatus === 'completed' ? `
        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">✅ Hồ sơ của bạn đã được giải quyết xong!</p>
          <p style="margin: 8px 0 0; color: #047857; font-size: 13px;">
            ${app.receive_method === 'email' ? 'Giấy chứng nhận đã được gửi kèm email này.' : ''}
            ${app.receive_method === 'postal' ? 'Giấy chứng nhận sẽ được gửi qua bưu điện đến địa chỉ của bạn.' : ''}
            ${app.receive_method === 'direct' ? 'Vui lòng đến nhận trực tiếp tại CDC Đà Nẵng.' : ''}
          </p>
        </div>
        ` : ''}
        <a href="${trackUrl}" style="display: inline-block; background: #0263e0; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 10px;">
          Xem chi tiết hồ sơ →
        </a>
      </div>
      <div style="padding: 20px 40px; background: #f1f5f9; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">CDC Đà Nẵng — Phòng bệnh chủ động, vươn rộng tương lai</p>
        <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0;">This is an automated message, please do not reply directly.</p>
      </div>
    </div>`,
  };
}

function buildSubmitConfirmEmail(app, appUrl) {
  const trackUrl = `${appUrl}/track?id=${app.id}`;
  return {
    subject: `[CDC Đà Nẵng] Xác nhận nộp hồ sơ — Mã: ${app.id}`,
    html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0263e0, #1e40af); padding: 30px 40px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">CDC Đà Nẵng</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0; font-size: 13px;">Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng</p>
      </div>
      <div style="padding: 35px 40px; background: white;">
        <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">✅ Hồ sơ đã được tiếp nhận thành công!</h2>
        <p style="color: #374151; font-size: 15px;">Kính gửi <strong>${app.name}</strong>,</p>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">Hệ thống đã ghi nhận hồ sơ đề nghị cấp Giấy Chứng Nhận Tiêm Chủng của bạn. Vui lòng lưu lại thông tin dưới đây:</p>
        <div style="background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="font-size: 13px; color: #1d4ed8; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Mã theo dõi hồ sơ của bạn</div>
          <div style="font-size: 32px; font-weight: 800; color: #0263e0; letter-spacing: 2px;">${app.id}</div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
          <tr style="background: #f8fafc;"><td style="padding: 10px; color: #6b7280; width: 40%;">Họ và tên</td><td style="padding: 10px; font-weight: 600; color: #1e293b;">${app.name}</td></tr>
          <tr><td style="padding: 10px; color: #6b7280;">CCCD/Hộ chiếu</td><td style="padding: 10px; color: #1e293b;">${app.cccd}</td></tr>
          <tr style="background: #f8fafc;"><td style="padding: 10px; color: #6b7280;">Thời gian nộp</td><td style="padding: 10px; color: #1e293b;">${new Date(app.submitted_at).toLocaleString('vi-VN')}</td></tr>
          <tr><td style="padding: 10px; color: #6b7280;">Hình thức nhận KQ</td><td style="padding: 10px; color: #1e293b;">${app.receive_method === 'email' ? 'Qua Email' : app.receive_method === 'postal' ? 'Bưu điện' : 'Nhận trực tiếp'}</td></tr>
        </table>
        <p style="color: #6b7280; font-size: 13px; background: #fef9c3; border: 1px solid #fde047; border-radius: 6px; padding: 12px 16px;">
          ⏱ Thời gian xử lý dự kiến: <strong>3–5 ngày làm việc</strong>. Bạn sẽ nhận được email thông báo khi có cập nhật.
        </p>
        <a href="${trackUrl}" style="display: inline-block; background: #0263e0; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 16px;">
          Theo dõi hồ sơ →
        </a>
      </div>
      <div style="padding: 20px 40px; background: #f1f5f9; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">CDC Đà Nẵng — Phòng bệnh chủ động, vươn rộng tương lai</p>
      </div>
    </div>`,
  };
}

export async function sendStatusUpdateEmail(app, newStatus, note = '') {
  const { transporter, enabled, from, appUrl } = await getTransporter();
  if (!enabled || !app.email) return { sent: false, reason: 'Email not configured or no recipient' };

  const { subject, html } = buildStatusEmail(app, newStatus, note, appUrl);
  const mailOptions = {
    from,
    to: app.email,
    subject,
    html,
  };

  if (newStatus === 'completed' && app.certificate_json) {
    try {
      let certData;
      try { certData = typeof app.certificate_json === 'string' ? JSON.parse(app.certificate_json) : app.certificate_json; } catch(e) {}
      if (certData && certData.url) {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), 'public', certData.url);
        if (fs.existsSync(localPath)) {
          mailOptions.attachments = [{
            filename: `Chung_Nhan_${app.id}${path.extname(localPath)}`,
            path: localPath
          }];
        }
      }
    } catch (e) { console.error('Error attaching cert to email', e); }
  }

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    console.error('[Email] Gửi email thất bại:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendSubmitConfirmEmail(app) {
  const { transporter, enabled, from, appUrl } = await getTransporter();
  if (!enabled || !app.email) return { sent: false, reason: 'Email not configured or no recipient' };

  const { subject, html } = buildSubmitConfirmEmail(app, appUrl);
  try {
    await transporter.sendMail({
      from,
      to: app.email,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error('[Email] Gửi email xác nhận thất bại:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function isEmailEnabled() {
  const { enabled } = await getTransporter();
  return enabled;
}
