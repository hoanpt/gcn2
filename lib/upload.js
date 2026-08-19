import path from 'path';
import fs from 'fs';

/**
 * Lấy thư mục upload chuẩn trên máy chủ
 */
export function getUploadDir() {
  const customDir = process.env.UPLOAD_DIR;
  if (customDir) {
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    return customDir;
  }

  const mainDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(mainDir)) {
    try {
      fs.mkdirSync(mainDir, { recursive: true });
    } catch (e) {
      const fallback = path.join('/tmp', 'cdc_uploads');
      if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
      return fallback;
    }
  }
  return mainDir;
}

/**
 * Tìm file vật lý trên tất cả các đường dẫn candidate khả thi của máy chủ
 */
export function findFileOnDisk(filename) {
  if (!filename) return null;
  const safeFilename = path.basename(filename);

  const candidates = [
    path.join(process.cwd(), 'public', 'uploads', safeFilename),
    path.join(process.cwd(), 'uploads', safeFilename),
    path.join(process.cwd(), '.next', 'standalone', 'public', 'uploads', safeFilename),
    path.join('/tmp', 'cdc_uploads', safeFilename),
    path.resolve('./public/uploads', safeFilename),
    path.resolve('./uploads', safeFilename),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Lưu file upload vào đĩa
 */
export async function saveUploadedFile(filename, buffer) {
  const uploadDir = getUploadDir();
  const destPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(destPath, buffer);

  // Ghi thêm bản sao dự phòng vào /tmp/cdc_uploads nếu có thể
  try {
    const backupDir = path.join('/tmp', 'cdc_uploads');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    await fs.promises.writeFile(path.join(backupDir, filename), buffer);
  } catch (e) {}

  return destPath;
}
