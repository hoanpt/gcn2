import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

function getTokenFromReq(request) {
  const { verifyToken } = require('@/lib/auth');
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/cdc_admin_token=([^;]+)/);
  if (match) return verifyToken(match[1]);
  return null;
}

function getDateRange(period, offset = 0) {
  const now = new Date();
  let start, end;

  if (period === 'day') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  } else if (period === 'week') {
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const mondayThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1);
    const mondayTarget = new Date(mondayThisWeek.getFullYear(), mondayThisWeek.getMonth(), mondayThisWeek.getDate() - offset * 7);
    start = new Date(mondayTarget.getFullYear(), mondayTarget.getMonth(), mondayTarget.getDate(), 0, 0, 0, 0);
    end = new Date(mondayTarget.getFullYear(), mondayTarget.getMonth(), mondayTarget.getDate() + 6, 23, 59, 59, 999);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth() - offset, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(now.getFullYear() - offset, 0, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear() - offset, 11, 31, 23, 59, 59, 999);
  } else {
    return { start: null, end: null };
  }

  return { start, end };
}

async function getStatsForRange(db, start, end) {
  let whereClause = '';
  const params = [];
  if (start && end) {
    whereClause = 'WHERE submitted_at >= ? AND submitted_at <= ?';
    params.push(start.toISOString(), end.toISOString());
  }

  const rows = await db.all(`SELECT status, receive_method FROM applications ${whereClause}`, ...params);
  const total = rows.length;

  const byStatus = { pending: 0, received: 0, processing: 0, completed: 0 };
  const byMethod = { email: 0, postal: 0, direct: 0 };

  rows.forEach(r => {
    if (byStatus.hasOwnProperty(r.status)) byStatus[r.status]++;
    if (byMethod.hasOwnProperty(r.receive_method)) byMethod[r.receive_method]++;
  });

  const resolved = byStatus.completed;
  const unresolved = total - resolved;

  const pendingRatio = total > 0 ? parseFloat(((byStatus.pending / total) * 100).toFixed(1)) : 0;
  const receivedRatio = total > 0 ? parseFloat(((byStatus.received / total) * 100).toFixed(1)) : 0;
  const processingRatio = total > 0 ? parseFloat(((byStatus.processing / total) * 100).toFixed(1)) : 0;
  const completedRatio = total > 0 ? parseFloat(((byStatus.completed / total) * 100).toFixed(1)) : 0;

  return {
    total,
    resolved,
    unresolved,
    byStatus,
    byMethod,
    pendingRatio,
    receivedRatio,
    processingRatio,
    completedRatio,
  };
}

const PERIOD_LABELS = {
  week: { current: 'Tuần này', compare: 'Tuần trước' },
  day: { current: 'Hôm nay', compare: 'Hôm qua' },
  month: { current: 'Tháng này', compare: 'Tháng trước' },
  year: { current: 'Năm nay', compare: 'Năm ngoái' },
  all: { current: 'Tất cả thời gian', compare: 'Kỳ trước' },
};

export async function GET(request) {
  try {
    const token = getTokenFromReq(request);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';
    const comparePeriod = searchParams.get('comparePeriod') || 'none';

    const { start, end } = getDateRange(period, 0);
    const currentStats = await getStatsForRange(db, start, end);

    let delta = null;
    let compareStats = null;

    if (comparePeriod === 'previous' && period !== 'all') {
      const { start: compStart, end: compEnd } = getDateRange(period, 1);
      compareStats = await getStatsForRange(db, compStart, compEnd);

      const totalDiff = currentStats.total - compareStats.total;
      const totalPercent = compareStats.total > 0
        ? parseFloat(((totalDiff / compareStats.total) * 100).toFixed(1))
        : (currentStats.total > 0 ? 100 : 0);

      const pendingDiff = currentStats.byStatus.pending - compareStats.byStatus.pending;
      const completedDiff = currentStats.byStatus.completed - compareStats.byStatus.completed;
      const completedRatioDiff = parseFloat((currentStats.completedRatio - compareStats.completedRatio).toFixed(1));
      const pendingRatioDiff = parseFloat((currentStats.pendingRatio - compareStats.pendingRatio).toFixed(1));

      delta = {
        totalDiff,
        totalPercent,
        pendingDiff,
        pendingRatioDiff,
        completedDiff,
        completedRatioDiff,
      };
    }

    // Thống kê 7 ngày gần nhất (Cross-DB compatible)
    const sevenDaysAgo = new Date(Date.now() - 6 * 86400000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const rowsLast7 = await db.all(
      `SELECT submitted_at FROM applications WHERE submitted_at >= ?`,
      sevenDaysAgo.toISOString()
    );

    const dayMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayStr = d.toISOString().slice(0, 10);
      dayMap[dayStr] = 0;
    }
    rowsLast7.forEach(r => {
      if (r.submitted_at) {
        const dayStr = r.submitted_at.slice(0, 10);
        if (dayMap.hasOwnProperty(dayStr)) {
          dayMap[dayStr]++;
        }
      }
    });

    const last7Days = Object.entries(dayMap).map(([day, count]) => ({ day, count }));

    // Backup logs
    const recentBackups = await db.all(
      `SELECT filename, size_bytes, created_at, created_by FROM backup_logs ORDER BY created_at DESC LIMIT 5`
    );

    const labels = PERIOD_LABELS[period] || PERIOD_LABELS.week;

    return NextResponse.json({
      period,
      comparePeriod,
      periodLabel: labels.current,
      compareLabel: labels.compare,
      ...currentStats,
      compareStats,
      delta,
      last7Days,
      recentBackups,
    });
  } catch (err) {
    console.error('[Stats GET]', err);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + err.message }, { status: 500 });
  }
}

