import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET: Tra cứu hồ sơ theo mã (public)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Thiếu mã hồ sơ' }, { status: 400 });

    const db = await getDb();
    // Tìm theo ID hoặc CCCD
    const app = await db.get(`
      SELECT id, submitted_at, name, cccd, phone, receive_method, status, certificate_id, package_date, address
      FROM applications
      WHERE id = ? OR cccd = ?
      ORDER BY submitted_at DESC
      LIMIT 1
    `, id.toUpperCase(), id);

    if (!app) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ với mã hoặc CCCD này' }, { status: 404 });
    }

    // Lấy timeline (status logs)
    const logs = await db.all(`
      SELECT new_status, changed_at, note
      FROM status_logs
      WHERE application_id = ?
      ORDER BY changed_at ASC
    `, app.id);

    // Mask thông tin nhạy cảm
    const masked = {
      ...app,
      name: maskName(app.name),
      phone: maskPhone(app.phone),
      cccd: maskCCCD(app.cccd),
    };

    return NextResponse.json({ application: masked, statusLogs: logs });
  } catch (err) {
    console.error('[Track GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

function maskName(name) {
  if (!name || name.length < 2) return name;
  const parts = name.split(' ');
  return parts.map((p, i) => i === parts.length - 1 ? p : p[0] + '*'.repeat(p.length - 1)).join(' ');
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function maskCCCD(cccd) {
  if (!cccd || cccd.length < 6) return cccd;
  return cccd.slice(0, 3) + '****' + cccd.slice(-3);
}
