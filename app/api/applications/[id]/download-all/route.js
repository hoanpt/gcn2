import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import getDb from '@/lib/db';
import { downloadFileFromDrive, listFilesInFolder } from '@/lib/drive';

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
    const addedNames = new Set();

    // Helper lấy Buffer nội dung file từ nhiều nguồn (Local disk, Google Drive, URL)
    async function getFileBuffer(f) {
      if (!f) return null;

      // 1. Kiểm tra ổ đĩa cục bộ (localPath)
      if (f.localPath) {
        const relPath = f.localPath.startsWith('/') ? f.localPath.substring(1) : f.localPath;
        const fullPath = path.join(process.cwd(), 'public', relPath);
        if (fs.existsSync(fullPath)) {
          try {
            return fs.readFileSync(fullPath);
          } catch (e) {
            console.error(`[DownloadAll] Lỗi đọc file local ${fullPath}:`, e.message);
          }
        }
      }

      // 2. Kiểm tra Google Drive (driveId)
      if (f.driveId) {
        try {
          const stream = await downloadFileFromDrive(f.driveId);
          if (stream) {
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            return Buffer.concat(chunks);
          }
        } catch (e) {
          console.error(`[DownloadAll] Lỗi tải từ Google Drive ID ${f.driveId}:`, e.message);
        }
      }

      // 3. Kiểm tra Base64 trong CSDL
      if (f.base64) {
        try {
          return Buffer.from(f.base64, 'base64');
        } catch (e) {
          console.error(`[DownloadAll] Lỗi giải mã base64:`, e.message);
        }
      }

      // 4. Kiểm tra liên kết HTTP / HTTPS ngoài
      const url = f.url || (typeof f.localPath === 'string' && f.localPath.startsWith('http') ? f.localPath : null);
      if (url) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer();
            return Buffer.from(arrayBuf);
          }
        } catch (e) {
          console.error(`[DownloadAll] Lỗi tải từ URL ${url}:`, e.message);
        }
      }

      return null;
    }

    // Xử lý các file đính kèm trong files_json
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buffer = await getFileBuffer(f);

      if (buffer && buffer.length > 0) {
        const originalExt = path.extname(f.originalName || f.localPath || '') || '';
        const title = (f.displayTitle || f.label || `File_${i + 1}`).replace(/[/\\?%*:|"<>]/g, '_');
        let zipFileName = `${i + 1}_${title}${originalExt}`;

        if (addedNames.has(zipFileName)) {
          zipFileName = `${i + 1}_${title}_${Date.now()}${originalExt}`;
        }
        addedNames.add(zipFileName);

        zip.file(zipFileName, buffer);
        fileCount++;
      }
    }

    // Nếu có file Giấy chứng nhận đã cấp, thêm vào ZIP
    if (app.certificate_json) {
      try {
        const cert = typeof app.certificate_json === 'string' ? JSON.parse(app.certificate_json) : app.certificate_json;
        if (cert) {
          const certBuffer = await getFileBuffer({ localPath: cert.url, driveId: cert.driveId, url: cert.url });
          if (certBuffer && certBuffer.length > 0) {
            const certExt = path.extname(cert.url || '') || '.pdf';
            const certFileName = `Giay_Chung_Nhan_${app.certificate_id || 'CDC'}${certExt}`;
            zip.file(certFileName, certBuffer);
            fileCount++;
          }
        }
      } catch (e) {
        console.error('[DownloadAll] Lỗi thêm giấy chứng nhận vào zip:', e);
      }
    }

    // Thử lấy tệp từ Google Drive folder
    let targetFolderId = app.gdrive_folder_id;
    if (!targetFolderId && fileCount === 0) {
      try {
        const { findApplicationFolderOnDrive } = require('@/lib/drive');
        targetFolderId = await findApplicationFolderOnDrive(app.id);
        if (targetFolderId) {
          await db.run('UPDATE applications SET gdrive_folder_id = ? WHERE id = ?', targetFolderId, app.id);
        }
      } catch (e) {
        console.error('[DownloadAll] Lỗi auto-find Drive folder:', e.message);
      }
    }

    if (fileCount === 0 && targetFolderId) {
      try {
        const driveFiles = await listFilesInFolder(targetFolderId);
        for (let i = 0; i < driveFiles.length; i++) {
          const df = driveFiles[i];
          const stream = await downloadFileFromDrive(df.id);
          if (stream) {
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
              let zipFileName = `${i + 1}_${df.name}`;
              if (addedNames.has(zipFileName)) {
                zipFileName = `${i + 1}_${df.name}_${Date.now()}`;
              }
              addedNames.add(zipFileName);
              zip.file(zipFileName, buffer);
              fileCount++;
            }
          }
        }
      } catch (e) {
        console.error('[DownloadAll] Lỗi lấy danh sách tệp từ Drive folder:', e.message);
      }
    }

    // Nếu vẫn chưa tìm thấy file nào, tìm kiếm các file trên Drive có chứa tên mã hồ sơ
    if (fileCount === 0) {
      try {
        const { searchFilesInDriveByAppId } = require('@/lib/drive');
        const matchedFiles = await searchFilesInDriveByAppId(app.id);
        for (let i = 0; i < matchedFiles.length; i++) {
          const df = matchedFiles[i];
          const stream = await downloadFileFromDrive(df.id);
          if (stream) {
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            const buffer = Buffer.concat(chunks);
            if (buffer.length > 0) {
              let zipFileName = `${i + 1}_${df.name}`;
              if (addedNames.has(zipFileName)) {
                zipFileName = `${i + 1}_${df.name}_${Date.now()}`;
              }
              addedNames.add(zipFileName);
              zip.file(zipFileName, buffer);
              fileCount++;
            }
          }
        }
      } catch (e) {
        console.error('[DownloadAll] Lỗi tìm kiếm file trên Drive theo mã HS:', e.message);
      }
    }

    // Nếu vẫn không có tập tin vật lý nào trên đĩa hoặc Drive, tạo file thông báo ghi chú metadata
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

      textNotice += `\nGhi chú: Tệp tin đính kèm hiện tại chưa tìm thấy trên máy chủ local hoặc Google Drive liên kết.\n`;

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

