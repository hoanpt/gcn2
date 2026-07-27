import fs from 'fs';
import path from 'path';
import getDb from './db.js';

const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';

/**
 * Tạo bản backup JSON của DB
 * @param {string} triggeredBy - 'system' hoặc username admin
 */
export async function createBackup(triggeredBy = 'system') {
  const db = await getDb();

  const setting = await db.get("SELECT value FROM settings WHERE key = 'backup_keep_days'");
  const keepDays = parseInt(setting?.value || process.env.BACKUP_KEEP_DAYS || '30', 10);

  const backupDir = path.resolve(BACKUP_DIR);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `cdc_backup_${dateStr}.json`;
  const destPath = path.join(backupDir, filename);

  try {
    const accounts = await db.all('SELECT * FROM accounts');
    const applications = await db.all('SELECT * FROM applications');
    const status_logs = await db.all('SELECT * FROM status_logs');
    const settings = await db.all('SELECT * FROM settings');

    const dumpData = {
      version: '2.0.0',
      exportedAt: now.toISOString(),
      tables: {
        accounts,
        applications,
        status_logs,
        settings,
      },
    };

    fs.writeFileSync(destPath, JSON.stringify(dumpData, null, 2), 'utf8');
  } catch (err) {
    console.error('[Backup] Error creating JSON dump:', err);
    throw err;
  }

  const stat = fs.statSync(destPath);

  // Ghi log vào DB
  await db.run(`
    INSERT INTO backup_logs (filename, file_size, size_bytes, created_by, note)
    VALUES (?, ?, ?, ?, ?)
  `, 
    filename,
    stat.size,
    stat.size,
    triggeredBy,
    'Lưu JSON local'
  );

  // Xóa backup cũ hơn keepDays ngày
  cleanOldBackups(backupDir, keepDays);

  return {
    filename,
    path: destPath,
    size: stat.size,
  };
}

function cleanOldBackups(backupDir, keepDays) {
  const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
  try {
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('cdc_backup_'));
    files.forEach(f => {
      const filePath = path.join(backupDir, f);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        console.log('[Backup] Đã xóa backup cũ:', f);
      }
    });
  } catch (e) {
    console.warn('[Backup] Lỗi khi dọn backup cũ:', e.message);
  }
}

export function getBackupList() {
  const backupDir = path.resolve(BACKUP_DIR);
  if (!fs.existsSync(backupDir)) return [];

  return fs.readdirSync(backupDir)
    .filter(f => f.startsWith('cdc_backup_'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

let _schedulerStarted = false;

/**
 * Khởi động scheduler backup tự động mỗi 24h
 * Chỉ chạy 1 lần duy nhất trong process
 */
export function startBackupScheduler() {
  if (_schedulerStarted) return;
  _schedulerStarted = true;

  // Chạy backup lần đầu sau 5 phút khi server start
  setTimeout(async () => {
    console.log('[Backup] Chạy backup tự động lần đầu...');
    try {
      const result = await createBackup('system-auto');
      console.log('[Backup] Hoàn tất:', result.filename);
    } catch (e) {
      console.error('[Backup] Lỗi backup tự động:', e.message);
    }
  }, 5 * 60 * 1000);

  // Sau đó chạy mỗi 24h
  setInterval(async () => {
    console.log('[Backup] Chạy backup tự động định kỳ...');
    try {
      const result = await createBackup('system-auto');
      console.log('[Backup] Hoàn tất:', result.filename);
    } catch (e) {
      console.error('[Backup] Lỗi backup tự động:', e.message);
    }
  }, 24 * 60 * 60 * 1000);

  console.log('[Backup] Scheduler đã được khởi động. Backup mỗi 24h.');
}
