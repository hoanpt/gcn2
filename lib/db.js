import pkg from 'pg';
const { Pool } = pkg;
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

function normalizeParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

class PgDbAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async get(sql, ...params) {
    const flatParams = normalizeParams(params);
    const pgSql = convertPlaceholders(sql);
    const res = await this.pool.query(pgSql, flatParams);
    return res.rows[0];
  }

  async all(sql, ...params) {
    const flatParams = normalizeParams(params);
    const pgSql = convertPlaceholders(sql);
    const res = await this.pool.query(pgSql, flatParams);
    return res.rows;
  }

  async run(sql, ...params) {
    const flatParams = normalizeParams(params);
    const pgSql = convertPlaceholders(sql);
    const res = await this.pool.query(pgSql, flatParams);
    return {
      changes: res.rowCount,
      rowCount: res.rowCount,
      rows: res.rows,
    };
  }

  async exec(sql) {
    return await this.pool.query(sql);
  }
}

class SqliteDbAdapter {
  constructor(db) {
    this.db = db;
  }

  get(sql, ...params) {
    const flatParams = normalizeParams(params);
    return new Promise((resolve, reject) => {
      this.db.get(sql, flatParams, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  all(sql, ...params) {
    const flatParams = normalizeParams(params);
    return new Promise((resolve, reject) => {
      this.db.all(sql, flatParams, (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  }

  run(sql, ...params) {
    const flatParams = normalizeParams(params);
    return new Promise((resolve, reject) => {
      this.db.run(sql, flatParams, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, rowCount: this.changes, lastID: this.lastID });
      });
    });
  }

  exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  }
}

let dbAdapterInstance = null;
let initPromise = null;

export default async function getDb() {
  if (dbAdapterInstance) return dbAdapterInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Thử kết nối PostgreSQL trước
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      try {
        const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
        const pool = new Pool({
          connectionString,
          connectionTimeoutMillis: 2000,
          ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
        });
        await pool.query('SELECT 1');
        const adapter = new PgDbAdapter(pool);
        await initTables(adapter, 'pg');
        dbAdapterInstance = adapter;
        return adapter;
      } catch (err) {
        console.warn('⚠️ PostgreSQL connection failed, falling back to SQLite:', err.message);
      }
    }

    // Fallback SQLite
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'cdc_portal.db');
    const sqliteDb = new sqlite3.Database(dbPath);
    const adapter = new SqliteDbAdapter(sqliteDb);
    await initTables(adapter, 'sqlite');
    dbAdapterInstance = adapter;
    return adapter;
  })();

  return initPromise;
}

async function initTables(adapter, type) {
  if (type === 'pg') {
    await adapter.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role VARCHAR(50) DEFAULT 'staff',
        is_active INT DEFAULT 1,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT NOT NULL,
        cccd VARCHAR(255) NOT NULL,
        dob TEXT,
        gender TEXT,
        phone VARCHAR(255) NOT NULL,
        email TEXT,
        address TEXT,
        receive_method VARCHAR(255) NOT NULL,
        notes TEXT,
        gdrive_folder_id TEXT,
        status VARCHAR(255) DEFAULT 'pending',
        certificate_id TEXT,
        certificate_json TEXT,
        files_json TEXT,
        package_date TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS status_logs (
        id SERIAL PRIMARY KEY,
        application_id VARCHAR(255) NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        note TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        size_bytes BIGINT,
        drive_file_id TEXT,
        created_by TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    await adapter.exec(`
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
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
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
  }

  const checkAdmin = await adapter.get("SELECT count(*) as c FROM accounts WHERE username = 'admin'");
  const adminCount = parseInt(checkAdmin?.c || checkAdmin?.count || '0', 10);
  if (adminCount === 0) {
    const hash = bcrypt.hashSync('123456', 10);
    await adapter.run("INSERT INTO accounts (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')", 'admin', hash, 'Quản trị hệ thống');
  }
}
