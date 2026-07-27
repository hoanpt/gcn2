import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';
import { sendStatusUpdateEmail } from '@/lib/email';

export const config = { api: { bodyParser: false } };

export async function POST(request, { params }) {
  try {
    const { verifyToken } = require('@/lib/auth');
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
    if (!match) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = verifyToken(match[1]);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file_certificate');
    const notes = formData.get('notes') || '';

    if (!file || !file.name) {
      return NextResponse.json({ error: 'Vui lòng đính kèm file chứng nhận' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${id}_CERT_${Date.now()}_${safeName}`;
    const destPath = path.join(uploadDir, filename);
    await fs.promises.writeFile(destPath, buffer);

    const fileUrl = `/uploads/${filename}`;
    const certId = `CNTH-${id.replace('CDC-', '')}`;
    const now = new Date().toISOString();

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    const certificate_json = JSON.stringify({ certId, issuedAt: now, url: fileUrl });

    await db.run(`
      UPDATE applications 
      SET status = 'completed', certificate_id = ?, certificate_json = ?, package_date = ?, updated_at = ? 
      WHERE id = ?
    `, certId, certificate_json, now.split('T')[0], now, id);

    await db.run(`
      INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?)
    `, id, app.status, 'completed', token.username, notes || 'Đã cấp chứng nhận bản scan');

    // Email
    const updatedApp = await db.get('SELECT * FROM applications WHERE id = ?', id);
    const emailResult = await sendStatusUpdateEmail(updatedApp, 'completed', notes || 'Chứng nhận đã được cấp. Bạn có thể tra cứu trên cổng.');

    return NextResponse.json({ success: true, url: fileUrl, emailSent: emailResult.sent, emailReason: emailResult.reason });
  } catch (err) {
    console.error('[Applications/ID/Certificate POST]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
