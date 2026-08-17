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

const METHOD_MAP = { email: '📧 Email', postal: '🚛 Bưu điện', direct: '🏢 Trực tiếp' };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [backing, setBacking] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const pieRef = useRef(null);
  const barRef = useRef(null);
  const pieChart = useRef(null);
  const barChart = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?period=${period}`);
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setStats(data);
      drawCharts(data);
    } catch(e) { console.error(e); }
  }, [period]);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('q', search);
      const res = await fetch(`/api/applications?${params}`);
      if (res.status === 401) { router.push('/admin'); return; }
      const data = await res.json();
      setApps(data.data || []);
      setTotal(data.total || 0);
    } catch(e) { console.error(e); }
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
      if (res.status === 401) { router.push('/admin'); }
      const cookie = document.cookie;
      const token = cookie.match(/cdc_admin_token=([^;]+)/)?.[1];
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      }
    } catch(e) {}
  }

  function drawCharts(data) {
    if (typeof window === 'undefined') return;
    if (!window.Chart) {
      setTimeout(() => drawCharts(data), 200);
      return;
    }

    setTimeout(() => {
      if (!window.Chart) return;
      if (pieChart.current) pieChart.current.destroy();
      if (barChart.current) barChart.current.destroy();

      if (pieRef.current) {
        pieChart.current = new window.Chart(pieRef.current, {
          type: 'doughnut',
          data: {
            labels: ['Đã giải quyết', 'Chưa giải quyết'],
            datasets: [{ data: [data.resolved, data.unresolved], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 6 }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Inter', size: 11 } } } }, cutout: '72%' },
        });
      }

      if (barRef.current) {
        const days = data.last7Days || [];
        barChart.current = new window.Chart(barRef.current, {
          type: 'bar',
          data: {
            labels: days.map(d => { const dt = new Date(d.day); return `${dt.getDate()}/${dt.getMonth()+1}`; }),
            datasets: [{ label: 'Hồ sơ mới', data: days.map(d => d.count), backgroundColor: '#3b82f6', borderRadius: 4, barPercentage: 0.65 }],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Inter', size: 10 } }, grid: { color: '#f1f5f9' } }, x: { ticks: { font: { family: 'Inter', size: 10 } }, grid: { display: false } } } },
        });
      }
    }, 100);
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

  const filtered = apps.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.cccd.includes(q) || a.id.toLowerCase().includes(q);
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
        {/* Stats */}
        <div className={styles.statsRow}>
          {[
            { label: 'Tổng hồ sơ', value: stats?.total ?? '…', cls: 'blue', icon: 'fa-folder-open' },
            { label: 'Đã giải quyết', value: stats?.resolved ?? '…', cls: 'green', icon: 'fa-circle-check' },
            { label: 'Chưa giải quyết', value: stats?.unresolved ?? '…', cls: 'amber', icon: 'fa-clock' },
            { label: 'Đang xử lý', value: stats?.byStatus?.processing ?? '…', cls: 'purple', icon: 'fa-gears' },
          ].map(s => (
            <div key={s.label} className={`${styles.statCard} ${styles[s.cls]}`}>
              <div className={styles.label}><i className={`fa-solid ${s.icon}`} style={{ marginRight: 6 }} />{s.label}</div>
              <div className={styles.value}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className={styles.chartsPanel}>
          <div className={styles.chartPanelHeader}>
            <h3><i className="fa-solid fa-chart-pie" style={{ color: 'var(--primary)' }} /> Báo cáo thống kê</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none' }} value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="day">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="year">Năm nay</option>
                <option value="all">Tất cả</option>
              </select>
              <button className="btn btn-outline btn-sm" onClick={doBackup} disabled={backing}>
                {backing ? <span className="spinner spinner-dark" style={{ width: 14, height: 14 }} /> : <i className="fa-solid fa-database" />}
                Backup DB
              </button>
            </div>
          </div>
          <div className={styles.chartsGrid}>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>Tỷ lệ giải quyết</div>
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <canvas ref={pieRef} />
              </div>
            </div>
            <div className={styles.chartBox}>
              <div className={styles.chartTitle}>Hồ sơ 7 ngày gần nhất</div>
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <canvas ref={barRef} />
              </div>
            </div>
          </div>
          <Script src="https://cdn.jsdelivr.net/npm/chart.js/auto/auto.min.js" strategy="afterInteractive" onLoad={() => { if (stats) drawCharts(stats); else fetchStats(); }} />
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
                    <td style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{app.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{app.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{app.cccd}</div>
                    </td>
                    <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                      {new Date(app.submitted_at).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ fontSize: 13 }}>{METHOD_MAP[app.receive_method] || app.receive_method}</td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <a
                          href={`/api/applications/${app.id}/download-all`}
                          download
                          className="btn btn-outline btn-sm"
                          title="Tải nén toàn bộ file (.ZIP)"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <i className="fa-solid fa-file-zipper" style={{ color: 'var(--primary)' }} /> Tải file
                        </a>
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
