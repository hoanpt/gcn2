import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { sendStatusUpdateEmail } from '@/lib/email';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

// GET: Chi tiết một hồ sơ (admin)
export async function GET(request, { params }) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const id = resolvedParams?.id;
    if (!id) return NextResponse.json({ error: 'Mã hồ sơ không hợp lệ' }, { status: 400 });

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    // Lấy audit log
    const logs = await db.all('SELECT * FROM status_logs WHERE application_id = ? ORDER BY changed_at DESC', id);

    let parsedFiles = [];
    if (app.files_json) {
      try {
        parsedFiles = typeof app.files_json === 'string' ? JSON.parse(app.files_json) : app.files_json;
      } catch (e) {
        console.error('Error parsing files_json:', e);
      }
    }

    let parsedCert = null;
    if (app.certificate_json) {
      try {
        parsedCert = typeof app.certificate_json === 'string' ? JSON.parse(app.certificate_json) : app.certificate_json;
      } catch (e) {
        console.error('Error parsing certificate_json:', e);
      }
    }

    return NextResponse.json({
      ...app,
      files_json: parsedFiles,
      certificate_json: parsedCert,
      statusLogs: logs || []
    });
  } catch (err) {
    console.error('[Applications/ID GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// PUT: Cập nhật trạng thái & thông tin (admin)
export async function PUT(request, { params }) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, notes, certificateData } = body;

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    const validStatuses = ['pending', 'received', 'processing', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    }

    const oldStatus = app.status;
    const now = new Date().toISOString();

    // Cập nhật hồ sơ
    const updates = { updated_at: now };
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (certificateData) {
      const certId = `CNTH-${id.replace('CDC-', '')}-${Date.now().toString(36).toUpperCase()}`;
      updates.certificate_id = certId;
      updates.certificate_json = JSON.stringify({ ...certificateData, certId, issuedAt: now });
      updates.package_date = now.split('T')[0];
      updates.status = 'completed';
    }

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    await db.run(`UPDATE applications SET ${setClauses} WHERE id = ?`, ...Object.values(updates), id);

    // Ghi audit log nếu status thay đổi
    let emailResult = { sent: false, reason: 'Email not sent' };
    if (status && status !== oldStatus) {
      await db.run(`
        INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
        VALUES (?, ?, ?, ?, ?)
      `, id, oldStatus, updates.status || status, token.username, notes || '');

      // Gửi email thông báo
      const updatedApp = await db.get('SELECT * FROM applications WHERE id = ?', id);
      emailResult = await sendStatusUpdateEmail(updatedApp, updates.status || status, notes || '');
    }

    return NextResponse.json({ success: true, id, status: updates.status || status, emailSent: emailResult.sent, emailReason: emailResult.reason });
  } catch (err) {
    console.error('[Applications/ID PUT]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

// DELETE: Xóa hồ sơ (chỉ admin role)
export async function DELETE(request, { params }) {
  try {
    const token = getTokenFromReq(request);
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Chỉ Admin mới có quyền xóa' }, { status: 403 });
    }

    const { id } = await params;
    const db = await getDb();
    const app = await db.get('SELECT id FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    await db.run('DELETE FROM status_logs WHERE application_id = ?', id);
    await db.run('DELETE FROM applications WHERE id = ?', id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Applications/ID DELETE]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
