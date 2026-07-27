import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

function getDateRange(period) {
  const now = new Date();
  let start, end;

  if (period === 'day') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(start.getTime() + 86400000 - 1);
  } else if (period === 'week') {
    const day = now.getDay() || 7;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
    end = new Date(start.getTime() + 7 * 86400000 - 1);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  return { start, end };
}

export async function GET(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    let whereClause = '';
    const params = [];

    if (period !== 'all') {
      const { start, end } = getDateRange(period);
      whereClause = `WHERE submitted_at >= ? AND submitted_at <= ?`;
      params.push(start.toISOString(), end.toISOString());
    }

    const rows = await db.all(`SELECT status, receive_method FROM applications ${whereClause}`, ...params);

    const total = rows.length;
    const byStatus = {
      pending: 0, received: 0, processing: 0, completed: 0,
    };
    const byMethod = { email: 0, postal: 0, direct: 0 };

    rows.forEach(r => {
      if (byStatus.hasOwnProperty(r.status)) byStatus[r.status]++;
      if (byMethod.hasOwnProperty(r.receive_method)) byMethod[r.receive_method]++;
    });

    const resolved = byStatus.completed;
    const unresolved = total - resolved;

    // Lấy thống kê theo ngày (7 ngày gần nhất)
    const last7Days = await db.all(`
      SELECT TO_CHAR(submitted_at::timestamp, 'YYYY-MM-DD') as day, COUNT(*)::int as count
      FROM applications
      WHERE submitted_at >= NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(submitted_at::timestamp, 'YYYY-MM-DD')
      ORDER BY day
    `);

    // Backup logs
    const recentBackups = await db.all(
      `SELECT filename, size_bytes, created_at, created_by FROM backup_logs ORDER BY created_at DESC LIMIT 5`
    );

    return NextResponse.json({
      total, resolved, unresolved,
      byStatus, byMethod,
      last7Days,
      recentBackups,
    });
  } catch (err) {
    console.error('[Stats GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
