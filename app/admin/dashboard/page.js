'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import styles from '../admin.module.css';

const STATUS_MAP = {
  pending:    { text: 'Chờ tiếp nhận', cls: 'badge-pending' },
  received:   { text: 'Đã tiếp nhận',  cls: 'badge-received' },
  processing: { text: 'Đang xử lý',    cls: 'badge-processing' },
  completed:  { text: 'Đã hoàn tất',   cls: 'badge-completed' },
};

function RenderDoughnutSVG({ stats }) {
  if (!stats || typeof stats !== 'object' || !stats.byStatus) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-pie" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có dữ liệu thống kê
      </div>
    );
  }

  const pending = stats?.byStatus?.pending || 0;
  const received = stats?.byStatus?.received || 0;
  const processing = stats?.byStatus?.processing || 0;
  const completed = stats?.byStatus?.completed || 0;
  const total = pending + received + processing + completed;

  if (total === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-pie" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có dữ liệu hồ sơ cho kỳ này
      </div>
    );
  }

  const items = [
    { label: 'Chờ tiếp nhận', count: pending, color: '#f59e0b', pct: stats?.pendingRatio || 0 },
    { label: 'Đã tiếp nhận', count: received, color: '#3b82f6', pct: stats?.receivedRatio || 0 },
    { label: 'Đang xử lý', count: processing, color: '#8b5cf6', pct: stats?.processingRatio || 0 },
    { label: 'Đã hoàn tất', count: completed, color: '#10b981', pct: stats?.completedRatio || 0 },
  ];

  const size = 150;
  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPct = 0;
  const segments = items.map((item) => {
    const strokeDasharray = `${(item.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPct / 100) * circumference);
    accumulatedPct += item.pct;
    return { ...item, strokeDasharray, strokeDashoffset };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '10px 0' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="butt"
              style={{ transition: 'all 0.5s ease' }}
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)' }}>{total}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Hồ sơ</span>
        </div>
      </div>
    </div>
  );
}

function RenderBarSVG({ stats }) {
  const days = (stats && Array.isArray(stats.last7Days)) ? stats.last7Days : [];
  const maxCount = Math.max(...days.map(d => d?.count || 0), 1);

  if (days.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--text-muted)', fontSize: 13 }}>
        <i className="fa-solid fa-chart-column" style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }} />
        Chưa có dữ liệu 7 ngày qua
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, gap: 10, padding: '10px 10px 0 10px' }}>
      {days.map((d, idx) => {
        const count = d?.count || 0;
        const dt = d?.day ? new Date(d.day) : new Date();
        const dayLabel = `${dt.getDate()}/${dt.getMonth() + 1}`;
        const heightPct = Math.round((count / maxCount) * 100);
        return (
          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{count}</span>
            <div style={{ width: '100%', maxWidth: 36, height: `${Math.max(heightPct, 6)}%`, background: count > 0 ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)' : '#e2e8f0', borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
            <span style={{ fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [comparePeriod, setComparePeriod] = useState('none');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backing, setBacking] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?period=${period}&comparePeriod=${comparePeriod}`);
      if (res.status === 401) { router.push('/admin'); return; }
      if (!res.ok) return;
      const data = await res.json();
      if (data && !data.error) {
        setStats(data);
      }
    } catch(e) { console.error(e); }
  }, [period, comparePeriod]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('q', search);
      const res = await fetch(`/api/applications?${params}`);
      if (res.status === 401) { router.push('/admin'); return; }
      if (!res.ok) { setApps([]); setTotal(0); return; }
      const data = await res.json();
      setApps(Array.isArray(data.data) ? data.data : []);
      setTotal(typeof data.total === 'number' ? data.total : 0);
    } catch(e) { console.error(e); setApps([]); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchApps();
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchApps(); }, [fetchApps]);

  async function fetchUser() {
    try {
      const res = await fetch('/api/accounts');
      if (res.status === 401) { router.push('/admin'); return; }
      const cookie = document.cookie || '';
      const match = cookie.match(/cdc_admin_token=([^;]+)/);
      if (match && match[1]) {
        const token = match[1];
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            setUser(JSON.parse(jsonPayload));
          }
        } catch (jwtErr) {
          try {
            setUser(JSON.parse(atob(token.split('.')[1])));
          } catch(e) {}
        }
      }
    } catch(e) {}
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  async function doBackup() {
    setBacking(true);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Backup thành công!\nFile: ${data.filename}\nKích thước: ${(data.size/1024).toFixed(1)} KB${data.driveFileId ? '\n☁️ Đã upload lên Google Drive' : ''}`);
      } else {
        alert('Backup thất bại: ' + data.error);
      }
    } catch(e) { alert('Lỗi: ' + e.message); }
    finally { setBacking(false); }
  }

  const filtered = (apps || []).filter(a => {
    if (!a) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = String(a.name || '').toLowerCase();
    const cccd = String(a.cccd || '').toLowerCase();
    const idStr = String(a.id || '').toLowerCase();
    const phone = String(a.phone || '').toLowerCase();
    return name.includes(q) || cccd.includes(q) || idStr.includes(q) || phone.includes(q);
  });

  function toggleSelect(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(a => a.id));
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`⚠️ XÁC NHẬN XÓA HÀNG LOẠT:\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedIds.length} hồ sơ đã chọn cùng tất cả file đính kèm?\nThao tác này KHÔNG THỂ HOÀN TÁC!`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/applications/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('⚠️ Lỗi xóa hồ sơ: ' + (data.error || 'Có lỗi xảy ra'));
        return;
      }
      alert(`✅ ${data.message || 'Đã xóa các hồ sơ được chọn'}`);
      setSelectedIds([]);
      fetchApps();
      fetchStats();
    } catch (e) {
      alert('Lỗi kết nối: ' + e.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteSingle(id, name) {
    if (!confirm(`⚠️ XÁC NHẬN XÓA:\n\nBạn có chắc muốn xóa hồ sơ ${id} (${name}) không?`)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert('⚠️ Lỗi xóa: ' + (data.error || 'Không thể xóa'));
        return;
      }
      alert('✅ Đã xóa hồ sơ thành công!');
      setSelectedIds(prev => prev.filter(i => i !== id));
      fetchApps();
      fetchStats();
    } catch (e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setDeleting(false);
    }
  }

  const [downloadingZipId, setDownloadingZipId] = useState(null);

  async function handleDownloadZip(appId, appName) {
    setDownloadingZipId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}/download-all`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`⚠️ KHÔNG THỂ TẢI TẬP TIN ZIP (Mã HS: ${appId}):\n\n${data.error || 'Tệp đính kèm không tồn tại.'}`);
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (appName || 'Citizen').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `${appId}_${safeName}_TatCaFile.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Lỗi tải file: ' + e.message);
    } finally {
      setDownloadingZipId(null);
    }
  }

  return (
    <div className={styles.adminLayout}>
      {/* Nav */}
      <nav className={styles.adminNav}>
        <div className={styles.adminNavLogo}>
          <i className="fa-solid fa-shield-halved" style={{ color: '#60a5fa' }} />
          CDC Admin
        </div>
        <div className={styles.adminNavUser}>
          <Link href="/admin/settings" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <i className="fa-solid fa-gear" /> Cấu hình
          </Link>
          <Link href="/admin/accounts" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
            <i className="fa-solid fa-users" /> Tài khoản
          </Link>
          {user && <span><i className="fa-solid fa-circle-user" /> {user.fullName || user.username}</span>}
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <i className="fa-solid fa-right-from-bracket" /> Thoát
          </button>
        </div>
      </nav>

      <div className={styles.adminContent}>
        {/* Header & Controls Thống Kê */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fa-solid fa-chart-line" style={{ color: 'var(--primary)' }} />
              Báo cáo Thống kê Hồ sơ ({stats?.periodLabel || 'Tuần này'})
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Tỷ lệ hồ sơ chờ tiếp nhận, đang xử lý & đã hoàn tất
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', gap: 6 }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--primary)', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>Thời gian:</span>
              <select 
                style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', outline: 'none', cursor: 'pointer' }}
                value={period} 
                onChange={e => setPeriod(e.target.value)}
              >
                <option value="week">Tuần này (Mặc định)</option>
                <option value="day">Hôm nay</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="all">Tất cả thời gian</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', gap: 6 }}>
              <i className="fa-solid fa-code-compare" style={{ color: '#8b5cf6', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>So sánh:</span>
              <select 
                style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: 'var(--gray-900)', outline: 'none', cursor: 'pointer' }}
                value={comparePeriod} 
                onChange={e => setComparePeriod(e.target.value)}
                disabled={period === 'all'}
              >
                <option value="none">Không so sánh</option>
                <option value="previous">So với kỳ trước ({stats?.compareLabel || 'Tuần trước'})</option>
              </select>
            </div>

            <button className="btn btn-outline btn-sm" onClick={doBackup} disabled={backing}>
              {backing ? <span className="spinner spinner-dark" style={{ width: 14, height: 14 }} /> : <i className="fa-solid fa-database" />}
              Backup DB
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          {/* Card 1: Tổng hồ sơ */}
          <div className={`${styles.statCard} ${styles.blue}`}>
            <div className={styles.label}>
              <i className="fa-solid fa-folder-open" style={{ marginRight: 6 }} />
              Tổng hồ sơ ({stats?.periodLabel || 'Tuần này'})
            </div>
            <div className={styles.value}>{stats?.total ?? '…'}</div>
            {comparePeriod === 'previous' && stats?.delta && (
              <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: stats.delta.totalDiff >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`fa-solid ${stats.delta.totalDiff >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
                {stats.delta.totalDiff >= 0 ? `+${stats.delta.totalDiff}` : stats.delta.totalDiff} ({stats.delta.totalPercent >= 0 ? '+' : ''}{stats.delta.totalPercent}%) so với {stats?.compareLabel}
              </div>
            )}
          </div>

          {/* Card 2: Chờ tiếp nhận */}
          <div className={`${styles.statCard} ${styles.amber}`}>
            <div className={styles.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><i className="fa-solid fa-clock" style={{ marginRight: 6 }} />Chờ tiếp nhận</span>
              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {stats?.pendingRatio ?? 0}%
              </span>
            </div>
            <div className={styles.value}>{stats?.byStatus?.pending ?? '…'}</div>
            {comparePeriod === 'previous' && stats?.delta ? (
              <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: stats.delta.pendingDiff <= 0 ? '#10b981' : '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`fa-solid ${stats.delta.pendingDiff <= 0 ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up'}`} />
                {stats.delta.pendingDiff >= 0 ? `+${stats.delta.pendingDiff}` : stats.delta.pendingDiff} ({stats.delta.pendingRatioDiff >= 0 ? '+' : ''}{stats.delta.pendingRatioDiff}% tỷ lệ) so với {stats?.compareLabel}
              </div>
            ) : (
              <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Chiếm {stats?.pendingRatio ?? 0}% tổng hồ sơ</div>
            )}
          </div>

          {/* Card 3: Đang xử lý */}
          <div className={`${styles.statCard} ${styles.purple}`}>
            <div className={styles.label}>
              <i className="fa-solid fa-gears" style={{ marginRight: 6 }} />Đã tiếp nhận & Đang xử lý
            </div>
            <div className={styles.value}>{(stats?.byStatus?.received || 0) + (stats?.byStatus?.processing || 0)}</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
              Đã tiếp nhận: {stats?.byStatus?.received || 0} | Đang xử lý: {stats?.byStatus?.processing || 0}
            </div>
          </div>

          {/* Card 4: Đã hoàn tất / Đã xử lý */}
          <div className={`${styles.statCard} ${styles.green}`}>
            <div className={styles.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><i className="fa-solid fa-circle-check" style={{ marginRight: 6 }} />Đã xử lý xong</span>
              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#047857', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                {stats?.completedRatio ?? 0}%
              </span>
            </div>
            <div className={styles.value}>{stats?.resolved ?? '…'}</div>
            {comparePeriod === 'previous' && stats?.delta ? (
              <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: stats.delta.completedRatioDiff >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className={`fa-solid ${stats.delta.completedRatioDiff >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
                {stats.delta.completedDiff >= 0 ? `+${stats.delta.completedDiff}` : stats.delta.completedDiff} ({stats.delta.completedRatioDiff >= 0 ? '+' : ''}{stats.delta.completedRatioDiff}% tỷ lệ) so với {stats?.compareLabel}
              </div>
            ) : (
              <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Tỷ lệ hoàn tất: {stats?.completedRatio ?? 0}%</div>
            )}
          </div>
        </div>

        {/* Charts Panel */}
        <div className={styles.chartsPanel}>
          <div className={styles.chartsGrid}>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <i className="fa-solid fa-chart-pie" style={{ color: '#f59e0b', marginRight: 6 }} />
                  Biểu đồ tỷ lệ trạng thái ({stats?.periodLabel || 'Tuần này'})
                </span>
                {comparePeriod === 'previous' && (
                  <span style={{ fontSize: 11, background: '#f3e8ff', color: '#6b21a8', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                    Kỳ trước: {stats?.compareLabel}
                  </span>
                )}
              </div>

              {/* Biểu đồ Doughnut SVG */}
              <RenderDoughnutSVG stats={stats} />

              {/* Chi tiết tỷ lệ % */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                  <span><strong>Chờ tiếp nhận:</strong> {stats?.byStatus?.pending || 0} ({stats?.pendingRatio || 0}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                  <span><strong>Đã tiếp nhận:</strong> {stats?.byStatus?.received || 0} ({stats?.receivedRatio || 0}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
                  <span><strong>Đang xử lý:</strong> {stats?.byStatus?.processing || 0} ({stats?.processingRatio || 0}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span><strong>Đã hoàn tất:</strong> {stats?.byStatus?.completed || 0} ({stats?.completedRatio || 0}%)</span>
                </div>
              </div>
            </div>

            <div className={styles.chartBox}>
              <div className={styles.chartTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <i className="fa-solid fa-chart-column" style={{ color: '#3b82f6', marginRight: 6 }} />
                  Hồ sơ tiếp nhận 7 ngày gần nhất
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Theo từng ngày</span>
              </div>

              {/* Biểu đồ Cột SVG */}
              <RenderBarSVG stats={stats} />
            </div>
          </div>
        </div>

        {/* Table Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}>
            <i className="fa-solid fa-folder-open" style={{ color: 'var(--primary)' }} />
            Danh sách hồ sơ <span style={{ font: 'normal 14px Inter', color: 'var(--text-muted)', marginLeft: 6 }}>({total})</span>
          </div>
          <div className={styles.toolbarActions}>
            <select className={styles.searchInput} style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ tiếp nhận</option>
              <option value="received">Đã tiếp nhận</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Đã hoàn tất</option>
            </select>
            <input className={styles.searchInput} placeholder="Tìm theo tên, CCCD, mã HS…" value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-outline btn-sm" onClick={fetchApps}>
              <i className="fa-solid fa-rotate-right" /> Làm mới
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportCSV} style={{ color: 'var(--success)', borderColor: 'var(--success)' }}>
              <i className="fa-solid fa-file-csv" /> CSV
            </button>
          </div>
        </div>

        {/* Thanh tác vụ hàng loạt khi đã chọn tickbox */}
        {selectedIds.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            background: '#eff6ff',
            border: '1px solid #93c5fd',
            borderRadius: 8,
            marginBottom: 16,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
              <i className="fa-solid fa-square-check" style={{ fontSize: 18, color: '#2563eb' }} />
              <span>Đã chọn <strong>{selectedIds.length}</strong> / {filtered.length} hồ sơ</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btn-sm"
                onClick={() => setSelectedIds([])}
                style={{ background: 'white', border: '1px solid var(--border)', color: 'var(--gray-700)' }}
              >
                Bỏ chọn
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={handleBatchDelete}
                disabled={deleting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
              >
                {deleting ? <span className="spinner" /> : <i className="fa-solid fa-trash-can" />}
                Xóa {selectedIds.length} hồ sơ đã chọn
              </button>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                    title="Chọn tất cả hồ sơ hiển thị"
                  />
                </th>
                <th>Mã Hồ Sơ</th>
                <th>Họ và Tên / CCCD</th>
                <th>Ngày Nộp</th>
                <th>Nhận KQ</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner spinner-dark" style={{ width: 28, height: 28 }} />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon"><i className="fa-solid fa-inbox" /></div>
                    <h3>Không có hồ sơ nào</h3>
                    <p>Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                  </div>
                </td></tr>
              ) : filtered.map(app => {
                const st = STATUS_MAP[app.status] || STATUS_MAP.pending;
                const isSelected = selectedIds.includes(app.id);
                return (
                  <tr key={app.id} style={{ background: isSelected ? '#f0f9ff' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(app.id)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{app.id || '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.name || '—'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.cccd || '—'}</div>
                    </td>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {app.submitted_at ? new Date(app.submitted_at).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ fontSize: 13 }}>{METHOD_MAP[app.receive_method] || app.receive_method || '—'}</td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleDownloadZip(app.id, app.name)}
                          disabled={downloadingZipId === app.id}
                          className="btn btn-outline btn-sm"
                          title="Tải nén toàn bộ file (.ZIP)"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {downloadingZipId === app.id ? <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} /> : <i className="fa-solid fa-file-zipper" style={{ color: 'var(--primary)' }} />} Tải file
                        </button>
                        <Link href={`/admin/cases/${app.id}`} className="btn btn-primary btn-sm">
                          <i className="fa-solid fa-eye" /> Xử lý
                        </Link>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDeleteSingle(app.id, app.name)}
                          title="Xóa hồ sơ này"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  function exportCSV() {
    const headers = ['Mã HS', 'Họ Tên', 'CCCD', 'SĐT', 'Ngày Nộp', 'Nhận KQ', 'Trạng thái'];
    const rows = filtered.map(a => [
      a.id, a.name, a.cccd, a.phone,
      new Date(a.submitted_at).toLocaleString('vi-VN'),
      METHOD_MAP[a.receive_method] || a.receive_method,
      STATUS_MAP[a.status]?.text || a.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `CDC_DanhSachHS_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }
}
