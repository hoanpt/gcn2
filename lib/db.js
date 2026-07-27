import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'cdc_portal.db');

let dbPromise;

export default async function getDb() {
  if (dbPromise) return dbPromise;

  dbPromise = open({
    filename: DB_PATH,
    driver: sqlite3.Database
  }).then(async (db) => {
    await db.exec('PRAGMA journal_mode = WAL');

    await db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'staff',
        is_active INTEGER DEFAULT 1,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cccd TEXT NOT NULL,
        dob TEXT,
        gender TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        receive_method TEXT NOT NULL,
        notes TEXT,
        gdrive_folder_id TEXT,
        status TEXT DEFAULT 'pending',
        certificate_id TEXT,
        certificate_json TEXT,
        files_json TEXT,
        package_date TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS status_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        note TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id)
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        size_bytes INTEGER,
        drive_file_id TEXT,
        created_by TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const checkAdmin = await db.get("SELECT count(*) as c FROM accounts WHERE username = 'admin'");
    if (checkAdmin.c === 0) {
      const hash = bcrypt.hashSync('123456', 10);
      await db.run("INSERT INTO accounts (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')", 'admin', hash, 'Quản trị hệ thống');
    }

    return db;
  });

  return dbPromise;
}
