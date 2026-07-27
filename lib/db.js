import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/cdc_portal';

let pool;
if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
}
pool = global._pgPool;

function convertPlaceholders(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

function normalizeParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  }
  return args;
}

class DbAdapter {
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
    const res = await this.pool.query(sql);
    return res;
  }
}

let dbAdapterInstance = null;
let initPromise = null;

export default async function getDb() {
  if (dbAdapterInstance) return dbAdapterInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const adapter = new DbAdapter(pool);

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

    const checkAdmin = await adapter.get("SELECT count(*) as c FROM accounts WHERE username = 'admin'");
    const adminCount = parseInt(checkAdmin?.c || checkAdmin?.count || '0', 10);
    if (adminCount === 0) {
      const hash = bcrypt.hashSync('123456', 10);
      await adapter.run("INSERT INTO accounts (username, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')", 'admin', hash, 'Quản trị hệ thống');
    }

    dbAdapterInstance = adapter;
    return adapter;
  })();

  return initPromise;
}
