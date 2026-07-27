import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { clearDriveCache } from '@/lib/drive';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

export async function GET(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const rows = await db.all('SELECT key, value FROM settings');
    const settings = {};
    
    rows.forEach(r => {
      // Obscure sensitive data
      if (r.key === 'smtp_pass' && r.value) {
        settings[r.key] = '********';
      } else if (r.key === 'gdrive_service_account_json' && r.value) {
        settings[r.key] = '********';
      } else {
        settings[r.key] = r.value;
      }
    });

    return NextResponse.json(settings);
  } catch (err) {
    console.error('[Settings GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Only admin can update settings' }, { status: 403 });
    }

    const body = await request.json();
    const db = await getDb();

    for (const [key, value] of Object.entries(body)) {
      if (key === 'smtp_pass' && value === '********') continue;
      if (key === 'gdrive_service_account_json' && value === '********') continue;
      
      const existing = await db.get('SELECT key FROM settings WHERE key = ?', key);
      if (existing) {
        await db.run('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', String(value), key);
      } else {
        await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', key, String(value));
      }
    }

    // Clear Google Drive cache so new settings are applied immediately
    clearDriveCache();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Settings PUT]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}
