import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { findFileOnDisk } from '@/lib/upload';
import getDb from '@/lib/db';
import { downloadFileFromDrive } from '@/lib/drive';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { filename } = resolvedParams;
    const safeFilename = path.basename(filename);

    let fileBuffer = null;

    // 1. Quét tìm file trên tất cả đường dẫn đĩa candidate
    const diskPath = findFileOnDisk(safeFilename);
    if (diskPath) {
      try {
        fileBuffer = fs.readFileSync(diskPath);
      } catch (e) {
        console.error('[Uploads Route] Lỗi đọc file local:', e.message);
      }
    }

    // 2. Nếu không có trên đĩa, tìm kiếm trong DB để lấy Drive ID hoặc mã mã hóa Base64
    if (!fileBuffer) {
      try {
        const db = await getDb();
        const rows = await db.all("SELECT files_json, certificate_json FROM applications WHERE files_json LIKE ? OR certificate_json LIKE ?", `%${safeFilename}%`, `%${safeFilename}%`);
        
        for (const row of rows) {
          if (fileBuffer) break;
          
          const files = row.files_json ? (typeof row.files_json === 'string' ? JSON.parse(row.files_json) : row.files_json) : [];
          if (row.certificate_json) {
            const cert = typeof row.certificate_json === 'string' ? JSON.parse(row.certificate_json) : row.certificate_json;
            if (cert) files.push(cert);
          }

          for (const f of files) {
            if ((f.localPath && f.localPath.includes(safeFilename)) || f.originalName === safeFilename) {
              // Thử lấy từ Drive
              if (f.driveId) {
                const stream = await downloadFileFromDrive(f.driveId);
                if (stream) {
                  const chunks = [];
                  for await (const chunk of stream) chunks.push(chunk);
                  fileBuffer = Buffer.concat(chunks);
                  if (fileBuffer.length > 0) break;
                }
              }
              // Thử lấy từ Base64
              if (f.base64) {
                fileBuffer = Buffer.from(f.base64, 'base64');
                if (fileBuffer.length > 0) break;
              }
            }
          }
        }
      } catch (dbErr) {
        console.error('[Uploads Route] Lỗi truy vấn DB fallback:', dbErr.message);
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.txt') contentType = 'text/plain; charset=utf-8';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(safeFilename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[Uploads Route Error]', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
