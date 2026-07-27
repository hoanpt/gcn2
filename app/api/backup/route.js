import { NextResponse } from 'next/server';
import { createBackup, getBackupList } from '@/lib/backup';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

// GET: Danh sách backup
export async function GET(request) {
  const token = getTokenFromReq(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const backups = getBackupList();
  return NextResponse.json({ backups });
}

// POST: Tạo backup thủ công
export async function POST(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await createBackup(token.username);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error('[Backup POST]', err);
    return NextResponse.json({ error: 'Lỗi tạo backup: ' + err.message }, { status: 500 });
  }
}
