import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import getDb from './db.js';

let _drive = null;
let _enabled = false;
let _folderId = null;

export function clearDriveCache() {
  _drive = null;
  _enabled = false;
  _folderId = null;
}

async function getDrive() {
  if (_drive) return { drive: _drive, enabled: _enabled, folderId: _folderId };

  const db = await getDb();
  const rows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'gdrive_%'");
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);

  const keyFile = process.env.GOOGLE_DRIVE_KEY_FILE;
  const keyJson = settings.gdrive_service_account_json;
  const folderId = settings.gdrive_folder_id || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if ((!keyFile && !keyJson) || !folderId || folderId === 'your_google_drive_folder_id_here') {
    console.warn('[GoogleDrive] Chưa cấu hình. File sẽ không được upload lên Drive.');
    _enabled = false;
    return { drive: null, enabled: false, folderId: null };
  }

  try {
    let auth;
    if (keyJson) {
      const credentials = JSON.parse(keyJson);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } else {
      const keyPath = path.resolve(keyFile);
      if (!fs.existsSync(keyPath)) {
        console.warn('[GoogleDrive] Không tìm thấy file key:', keyPath);
        _enabled = false;
        return { drive: null, enabled: false, folderId: null };
      }
      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    }

    _drive = google.drive({ version: 'v3', auth });
    _enabled = true;
    _folderId = folderId;
    console.log('[GoogleDrive] Kết nối thành công.');
  } catch (err) {
    console.error('[GoogleDrive] Lỗi khởi tạo:', err.message);
    _enabled = false;
    _folderId = null;
  }

  return { drive: _drive, enabled: _enabled, folderId: _folderId };
}

/**
 * Tạo thư mục con trên Drive cho một hồ sơ
 */
export async function createApplicationFolder(applicationId) {
  const { drive, enabled, folderId: parentId } = await getDrive();
  if (!enabled) return null;

  try {
    const res = await drive.files.create({
      requestBody: {
        name: applicationId,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id, name',
    });
    return res.data.id;
  } catch (err) {
    console.error('[GoogleDrive] Lỗi tạo folder:', err.message);
    return null;
  }
}

/**
 * Upload file lên thư mục của hồ sơ
 * @param {Buffer|string} fileContent - nội dung file hoặc đường dẫn
 * @param {string} filename - tên file
 * @param {string} mimeType - MIME type
 * @param {string} folderId - ID thư mục Drive của hồ sơ
 * @returns {{ id, name, webViewLink }}
 */
export async function uploadFileToDrive(fileContent, filename, mimeType, folderId) {
  const { drive, enabled } = await getDrive();
  if (!enabled) return null;

  try {
    let body;
    if (typeof fileContent === 'string' && fs.existsSync(fileContent)) {
      body = fs.createReadStream(fileContent);
    } else if (Buffer.isBuffer(fileContent)) {
      body = Readable.from(fileContent);
    } else {
      body = Readable.from(Buffer.from(fileContent));
    }

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: { mimeType, body },
      fields: 'id, name, webViewLink, webContentLink',
    });

    return {
      id: res.data.id,
      name: res.data.name,
      webViewLink: res.data.webViewLink,
      webContentLink: res.data.webContentLink,
    };
  } catch (err) {
    console.error('[GoogleDrive] Lỗi upload file:', err.message);
    return null;
  }
}

/**
 * Lấy danh sách file trong thư mục Drive của hồ sơ
 */
export async function listFilesInFolder(folderId) {
  const { drive, enabled } = await getDrive();
  if (!enabled || !folderId) return [];

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, size)',
    });
    return res.data.files || [];
  } catch (err) {
    console.error('[GoogleDrive] Lỗi list files:', err.message);
    return [];
  }
}

/**
 * Tải file từ Drive (trả về stream)
 */
export async function downloadFileFromDrive(fileId) {
  const { drive, enabled } = await getDrive();
  if (!enabled) return null;

  try {
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return res.data;
  } catch (err) {
    console.error('[GoogleDrive] Lỗi download file:', err.message);
    return null;
  }
}

/**
 * Upload DB backup lên Drive
 */
export async function uploadBackupToDrive(filePath, filename) {
  const { drive, enabled, folderId: parentId } = await getDrive();
  if (!enabled) return null;

  try {
    // Tìm hoặc tạo thư mục _BACKUPS
    let backupFolderId = null;
    const search = await drive.files.list({
      q: `name = '_BACKUPS' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id)',
    });

    if (search.data.files.length > 0) {
      backupFolderId = search.data.files[0].id;
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: '_BACKUPS',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      });
      backupFolderId = folder.data.id;
    }

    const res = await drive.files.create({
      requestBody: {
        name: filename,
        parents: [backupFolderId],
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(filePath),
      },
      fields: 'id, name, webViewLink',
    });

    return res.data;
  } catch (err) {
    console.error('[GoogleDrive] Lỗi upload backup:', err.message);
    return null;
  }
}

export async function isDriveEnabled() {
  const { enabled } = await getDrive();
  return enabled;
}
