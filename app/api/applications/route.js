import { NextResponse } from 'next/server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import getDb from '@/lib/db';
import { sendSubmitConfirmEmail } from '@/lib/email';

export const config = { api: { bodyParser: false } };

function generateId() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `CDC-${num}`;
}

// GET: Lấy danh sách hồ sơ (chỉ admin)
export async function GET(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `SELECT id, submitted_at, name, cccd, dob, gender, phone, email, address, receive_method, status, notes, certificate_id, package_date, gdrive_folder_id, created_at, updated_at FROM applications WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (q) {
      sql += ` AND (name LIKE ? OR cccd LIKE ? OR id LIKE ? OR phone LIKE ?)`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const countSql = sql.replace('SELECT id, submitted_at, name, cccd, dob, gender, phone, email, address, receive_method, status, notes, certificate_id, package_date, gdrive_folder_id, created_at, updated_at', 'SELECT COUNT(*) as total');
    const countResult = await db.get(countSql, ...params);
    const total = countResult?.total || 0;

    sql += ` ORDER BY submitted_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = await db.all(sql, ...params);

    return NextResponse.json({ data: rows, total, page, limit });
  } catch (err) {
    console.error('[Applications GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST: Nộp hồ sơ mới (public)
export async function POST(request) {
  try {
    // Parse multipart form
    const formData = await request.formData();

    const name = formData.get('name')?.trim();
    const cccd = formData.get('cccd')?.trim();
    const dob = formData.get('dob');
    const gender = formData.get('gender');
    const phone = formData.get('phone')?.trim();
    const email = formData.get('email')?.trim();
    const address = formData.get('address')?.trim();
    const receiveMethod = formData.get('receive_method') || 'direct';
    const notes = formData.get('notes')?.trim() || '';

    if (!name || !cccd || !phone) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // Kiểm tra trùng CCCD đang xử lý
    const db = await getDb();
    const existing = await db.get(
      `SELECT id FROM applications WHERE cccd = ? AND status NOT IN ('completed') LIMIT 1`
    , cccd);

    if (existing) {
      return NextResponse.json({
        error: `CCCD này đã có hồ sơ đang xử lý (Mã: ${existing.id}). Vui lòng tra cứu hồ sơ cũ trước.`,
        existingId: existing.id,
      }, { status: 409 });
    }

    const id = formData.get('id') || generateId();
    const submittedAt = new Date().toISOString();

    // Lưu files vào local storage
    const filesInfo = [];
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filesToUpload = [];

    // CCCD Mặt trước
    const fileCccdFront = formData.get('file_cccd_front') || formData.get('file_cccd');
    if (fileCccdFront && typeof fileCccdFront !== 'string' && fileCccdFront.name) {
      filesToUpload.push(['CCCD_MatTruoc', fileCccdFront, 'CCCD / Hộ chiếu (Mặt trước)']);
    }

    // CCCD Mặt sau
    const fileCccdBack = formData.get('file_cccd_back');
    if (fileCccdBack && typeof fileCccdBack !== 'string' && fileCccdBack.name) {
      filesToUpload.push(['CCCD_MatSau', fileCccdBack, 'CCCD (Mặt sau)']);
    }

    // Sổ tiêm chủng (nhiều trang)
    const vaccineFiles = formData.getAll('files_vaccine');
    let vIdx = 1;
    for (const f of vaccineFiles) {
      if (f && typeof f !== 'string' && f.name) {
        filesToUpload.push([`SoTiemChung_Trang_${vIdx}`, f, `Sổ tiêm chủng (Trang ${vIdx})`]);
        vIdx++;
      }
    }
    // Check indexed entries file_vaccine_0, file_vaccine_1...
    for (let i = 0; i < 20; i++) {
      const f = formData.get(`file_vaccine_${i}`);
      if (f && typeof f !== 'string' && f.name) {
        filesToUpload.push([`SoTiemChung_Trang_${vIdx}`, f, `Sổ tiêm chủng (Trang ${vIdx})`]);
        vIdx++;
      }
    }
    // Fallback single file_vaccine
    if (vIdx === 1) {
      const singleVaccine = formData.get('file_vaccine');
      if (singleVaccine && typeof singleVaccine !== 'string' && singleVaccine.name) {
        filesToUpload.push(['SoTiemChung_Trang_1', singleVaccine, 'Sổ tiêm chủng (Trang 1)']);
      }
    }

    // Biên lai thanh toán
    const filePayment = formData.get('file_payment');
    if (filePayment && typeof filePayment !== 'string' && filePayment.name) {
      filesToUpload.push(['BienLaiThanhToan', filePayment, 'Biên lai thanh toán']);
    }

    // Tùy chọn upload lên Google Drive nếu đã cấu hình
    let gdriveFolderId = null;
    let driveEnabled = false;
    try {
      const { isDriveEnabled, createApplicationFolder, uploadFileToDrive } = require('@/lib/drive');
      driveEnabled = await isDriveEnabled();
      if (driveEnabled) {
        gdriveFolderId = await createApplicationFolder(id);
      }

      for (const [key, file, displayTitle] of filesToUpload) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Str = buffer.toString('base64');
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${id}_${Date.now()}_${key}_${safeName}`;
        const destPath = path.join(uploadDir, filename);
        
        await fs.promises.writeFile(destPath, buffer);
        
        let driveId = null;
        let driveViewLink = null;

        if (driveEnabled && gdriveFolderId) {
          const driveRes = await uploadFileToDrive(buffer, filename, file.type || 'application/octet-stream', gdriveFolderId);
          if (driveRes) {
            driveId = driveRes.id;
            driveViewLink = driveRes.webViewLink;
          }
        }
        
        filesInfo.push({
          label: key,
          displayTitle: displayTitle || key,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          localPath: `/uploads/${filename}`,
          driveId: driveId,
          driveViewLink: driveViewLink,
          base64: base64Str
        });
      }
    } catch (gErr) {
      console.error('[Applications POST] Lỗi upload Drive:', gErr);
      // Tiếp tục lưu local & DB nếu upload Drive gặp sự cố
      if (filesInfo.length === 0) {
        for (const [key, file, displayTitle] of filesToUpload) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const base64Str = buffer.toString('base64');
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filename = `${id}_${Date.now()}_${key}_${safeName}`;
          const destPath = path.join(uploadDir, filename);
          await fs.promises.writeFile(destPath, buffer);
          filesInfo.push({
            label: key,
            displayTitle: displayTitle || key,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            localPath: `/uploads/${filename}`,
            driveId: null,
            driveViewLink: null,
            base64: base64Str
          });
        }
      }
    }

    // Lưu vào DB
    await db.run(`
      INSERT INTO applications (id, submitted_at, name, cccd, dob, gender, phone, email, address, receive_method, notes, files_json, gdrive_folder_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, 
      id, submittedAt, name, cccd, dob || null, gender || null, phone,
      email || null, address || null, receiveMethod, notes,
      JSON.stringify(filesInfo), gdriveFolderId
    );

    // Log trạng thái ban đầu
    await db.run(`
      INSERT INTO status_logs (application_id, old_status, new_status, changed_by, note)
      VALUES (?, null, 'pending', 'system', 'Hồ sơ mới được nộp trực tuyến')
    `, id);

    // Gửi email xác nhận
    const appForEmail = { id, name, cccd, email, submitted_at: submittedAt, receive_method: receiveMethod };
    const emailResult = await sendSubmitConfirmEmail(appForEmail);

    return NextResponse.json({
      success: true,
      id,
      message: 'Hồ sơ đã được tiếp nhận thành công',
      driveEnabled: driveEnabled,
      emailSent: emailResult.sent
    }, { status: 201 });
  } catch (err) {
    console.error('[Applications POST]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}
