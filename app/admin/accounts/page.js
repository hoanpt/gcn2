'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'staff' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const token = document.cookie.match(/cdc_admin_token=([^;]+)/)?.[1];
    if (token) {
      try { setCurrentUser(JSON.parse(atob(token.split('.')[1]))); } catch(e) {}
    }
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    const res = await fetch('/api/accounts');
    if (res.status === 403) { alert('Chỉ Admin mới có quyền xem trang này'); router.push('/admin/dashboard'); return; }
    if (res.status === 401) { router.push('/admin'); return; }
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  }

  function openCreate() {
    setEditAcc(null);
    setForm({ username: '', password: '', fullName: '', role: 'staff' });
    setError('');
    setShowModal(true);
  }

  function openEdit(acc) {
    setEditAcc(acc);
    setForm({ username: acc.username, password: '', fullName: acc.full_name, role: acc.role, id: acc.id });
    setError('');
    setShowModal(true);
  }

  async function save() {
    setError('');
    if (!editAcc && (!form.username || !form.password)) { setError('Cần nhập tên đăng nhập và mật khẩu'); return; }
    setSaving(true);
    try {
      const method = editAcc ? 'PUT' : 'POST';
      const body = editAcc ? { id: editAcc.id, fullName: form.fullName, password: form.password || undefined, role: form.role } : form;
      const res = await fetch('/api/accounts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setShowModal(false);
      loadAccounts();
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(acc) {
    if (!confirm(`${acc.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản "${acc.username}"?`)) return;
    const res = await fetch('/api/accounts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: acc.id, isActive: !acc.is_active }),
    });
    if (res.ok) loadAccounts();
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin');
  }

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>Quản lý Tài khoản Cán bộ</span>
        </div>
        <div className={styles.adminNavUser}>
          <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            <i className="fa-solid fa-right-from-bracket" /> Thoát
          </button>
        </div>
      </nav>

      <div className={styles.adminContent} style={{ maxWidth: 860 }}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTitle}><i className="fa-solid fa-users" style={{ color: 'var(--primary)' }} /> Danh sách cán bộ ({accounts.length})</div>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-user-plus" /> Thêm tài khoản
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên đăng nhập</th>
                <th>Họ tên</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Đăng nhập cuối</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner spinner-dark" style={{ width: 24, height: 24 }} /></td></tr>
              ) : accounts.map(acc => (
                <tr key={acc.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{acc.username}</td>
                  <td>{acc.full_name || '—'}</td>
                  <td>
                    <span className={`badge ${acc.role === 'admin' ? 'badge-processing' : 'badge-gray'}`}>
                      {acc.role === 'admin' ? '👑 Admin' : '👤 Cán bộ'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${acc.is_active ? 'badge-completed' : 'badge-danger'}`}>
                      {acc.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {acc.last_login ? new Date(acc.last_login).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(acc)}>
                        <i className="fa-solid fa-pen" /> Sửa
                      </button>
                      {acc.username !== 'admin' && acc.id !== currentUser?.id && (
                        <button className={`btn btn-sm ${acc.is_active ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleActive(acc)}>
                          <i className={`fa-solid ${acc.is_active ? 'fa-ban' : 'fa-circle-check'}`} />
                          {acc.is_active ? 'Khóa' : 'Kích hoạt'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Password change hint for own account */}
        <div className="alert alert-info" style={{ marginTop: 20 }}>
          <i className="fa-solid fa-info-circle" />
          <span>Để đổi mật khẩu của bạn: click <strong>Sửa</strong> vào tài khoản của mình và nhập mật khẩu mới.</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h3>{editAcc ? `Chỉnh sửa: ${editAcc.username}` : 'Thêm tài khoản mới'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {!editAcc && (
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập <span className="required">*</span></label>
                    <input className="form-control" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="admin2" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-control" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="Nguyễn Văn A" />
                </div>
                <div className="form-group">
                  <label className="form-label">{editAcc ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu *'}</label>
                  <input className="form-control" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vai trò</label>
                  <select className="form-control" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                    <option value="staff">Cán bộ tiếp nhận</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
