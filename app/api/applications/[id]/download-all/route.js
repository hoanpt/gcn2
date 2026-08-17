import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import getDb from '@/lib/db';

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
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = await getDb();
    const app = await db.get('SELECT * FROM applications WHERE id = ?', id);
    if (!app) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ' }, { status: 404 });
    }

    const files = app.files_json ? (typeof app.files_json === 'string' ? JSON.parse(app.files_json) : app.files_json) : [];

    const zip = new JSZip();
    let fileCount = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.localPath) continue;

      const relPath = f.localPath.startsWith('/') ? f.localPath.substring(1) : f.localPath;
      const fullPath = path.join(process.cwd(), 'public', relPath);

      if (fs.existsSync(fullPath)) {
        const buffer = fs.readFileSync(fullPath);
        const originalExt = path.extname(f.originalName || relPath) || '';
        const title = (f.displayTitle || f.label || `File_${i + 1}`).replace(/[/\\?%*:|"<>]/g, '_');
        const zipFileName = `${i + 1}_${title}${originalExt}`;

        zip.file(zipFileName, buffer);
        fileCount++;
      }
    }

    // Nếu có file Giấy chứng nhận đã cấp, thêm vào ZIP luôn nếu tồn tại
    if (app.certificate_json) {
      try {
        const cert = typeof app.certificate_json === 'string' ? JSON.parse(app.certificate_json) : app.certificate_json;
        if (cert && cert.url) {
          const certRelPath = cert.url.startsWith('/') ? cert.url.substring(1) : cert.url;
          const certFullPath = path.join(process.cwd(), 'public', certRelPath);
          if (fs.existsSync(certFullPath)) {
            const certBuffer = fs.readFileSync(certFullPath);
            const certExt = path.extname(cert.url) || '.pdf';
            zip.file(`Giay_Chung_Nhan_${app.certificate_id || 'CDC'}${certExt}`, certBuffer);
            fileCount++;
          }
        }
      } catch (e) {
        console.error('Error adding cert to zip:', e);
      }
    }

    // Nếu các tập tin vật lý trên đĩa không tồn tại (vd: do server làm mới container), tự tạo file thông tin danh sách tệp đính kèm
    if (fileCount === 0) {
      let textNotice = `TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP. ĐÀ NẴNG (CDC ĐÀ NẴNG)\n`;
      textNotice += `=========================================================\n`;
      textNotice += `THÔNG TIN TỆP ĐÍNH KÈM HỒ SƠ: ${app.id}\n`;
      textNotice += `Họ và tên người nộp: ${app.name}\n`;
      textNotice += `CCCD / Hộ chiếu: ${app.cccd}\n`;
      textNotice += `Số điện thoại: ${app.phone}\n`;
      textNotice += `Thời gian nộp: ${new Date(app.submitted_at).toLocaleString('vi-VN')}\n\n`;
      textNotice += `DANH SÁCH FILE ĐÃ ĐĂNG KÝ TRONG HỆ THỐNG:\n`;

      if (files && files.length > 0) {
        for (let idx = 0; idx < files.length; idx++) {
          const f = files[idx];
          textNotice += `${idx + 1}. [${f.displayTitle || f.label || 'Tệp'}] - Tên gốc: ${f.originalName || 'Không rõ'} (${f.localPath || 'Tự động'})\n`;
        }
      } else {
        textNotice += `(Hồ sơ này người dân không đính kèm file nào khi đăng ký)\n`;
      }

      textNotice += `\nGhi chú: Tệp tin đính kèm hiện tại tạm thời chưa khả dụng trên đĩa lưu trữ máy chủ.\n`;

      zip.file(`THONG_TIN_TEP_DINH_KEM_${app.id}.txt`, Buffer.from(textNotice, 'utf-8'));
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const safeName = (app.name || 'Citizen').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const zipFilename = `${app.id}_${safeName}_TatCaFile.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[Download All Files Error]', err);
    return NextResponse.json({ error: 'Lỗi tải xuống tập tin ZIP: ' + err.message }, { status: 500 });
  }
}
