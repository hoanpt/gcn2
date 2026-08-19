import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';
import { downloadFileFromDrive } from '@/lib/drive';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export async function GET(request, { params }) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolvedParams = await params;
    const { id, fileIndex } = resolvedParams;
    const idx = parseInt(fileIndex, 10);

    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });

    const files = app.files_json ? (typeof app.files_json === 'string' ? JSON.parse(app.files_json) : app.files_json) : [];
    if (isNaN(idx) || idx < 0 || idx >= files.length) {
      return NextResponse.json({ error: 'Không tìm thấy tệp đính kèm' }, { status: 404 });
    }

    const f = files[idx];
    let buffer = null;
    let mimeType = f.mimeType || 'application/octet-stream';

    // 1. Kiểm tra ổ đĩa cục bộ (localPath)
    if (f.localPath) {
      const relPath = f.localPath.startsWith('/') ? f.localPath.substring(1) : f.localPath;
      const fullPath = path.join(process.cwd(), 'public', relPath);
      if (fs.existsSync(fullPath)) {
        try {
          buffer = fs.readFileSync(fullPath);
        } catch (e) {}
      }
    }

    // 2. Kiểm tra Google Drive (driveId)
    if (!buffer && f.driveId) {
      try {
        const stream = await downloadFileFromDrive(f.driveId);
        if (stream) {
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          buffer = Buffer.concat(chunks);
        }
      } catch (e) {}
    }

    // 3. Kiểm tra dữ liệu Base64 lưu trực tiếp trong DB
    if (!buffer && f.base64) {
      try {
        buffer = Buffer.from(f.base64, 'base64');
      } catch (e) {}
    }

    // 4. Kiểm tra URL liên kết ngoài
    if (!buffer && (f.url || (typeof f.localPath === 'string' && f.localPath.startsWith('http')))) {
      const targetUrl = f.url || f.localPath;
      try {
        const res = await fetch(targetUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          buffer = Buffer.from(arrayBuf);
        }
      } catch (e) {}
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'Tệp tin đính kèm hiện không khả dụng trên server' }, { status: 404 });
    }

    const filename = f.originalName || `file_${idx + 1}`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[File Serve GET]', err);
    return NextResponse.json({ error: 'Lỗi tải tệp: ' + err.message }, { status: 500 });
  }
}
