import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export async function POST(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Chỉ tài khoản Admin mới có quyền xóa hàng loạt' }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất một hồ sơ để xóa' }, { status: 400 });
    }

    const db = await getDb();
    const placeholders = ids.map(() => '?').join(',');

    // Lấy thông tin các file đính kèm để dọn dẹp trên đĩa
    try {
      const rows = await db.all(`SELECT files_json, certificate_json FROM applications WHERE id IN (${placeholders})`, ...ids);
      for (const row of rows) {
        if (row.files_json) {
          try {
            const files = typeof row.files_json === 'string' ? JSON.parse(row.files_json) : row.files_json;
            for (const f of files) {
              if (f && f.localPath) {
                const relPath = f.localPath.startsWith('/') ? f.localPath.substring(1) : f.localPath;
                const fullPath = path.join(process.cwd(), 'public', relPath);
                if (fs.existsSync(fullPath)) {
                  fs.unlinkSync(fullPath);
                }
              }
            }
          } catch (e) {}
        }
        if (row.certificate_json) {
          try {
            const cert = typeof row.certificate_json === 'string' ? JSON.parse(row.certificate_json) : row.certificate_json;
            if (cert && cert.url) {
              const certRelPath = cert.url.startsWith('/') ? cert.url.substring(1) : cert.url;
              const certFullPath = path.join(process.cwd(), 'public', certRelPath);
              if (fs.existsSync(certFullPath)) {
                fs.unlinkSync(certFullPath);
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('File cleanup warning during batch delete:', e.message);
    }

    // Xóa trong DB
    await db.run(`DELETE FROM status_logs WHERE application_id IN (${placeholders})`, ...ids);
    const result = await db.run(`DELETE FROM applications WHERE id IN (${placeholders})`, ...ids);

    return NextResponse.json({
      success: true,
      deletedCount: ids.length,
      message: `Đã xóa thành công ${ids.length} hồ sơ!`
    });
  } catch (err) {
    console.error('[Batch Delete Error]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi xóa hồ sơ: ' + err.message }, { status: 500 });
  }
}
