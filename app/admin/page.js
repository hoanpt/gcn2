'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Đăng nhập thất bại'); return; }
      router.push('/admin/dashboard');
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        {/* Logo */}
        <div className={styles.loginLogo}>
          <div className={styles.logoBadge}>
            <i className="fa-solid fa-shield-halved" />
          </div>
          <h1>Hệ thống Quản Trị</h1>
          <p>CDC Đà Nẵng — Cổng Tiếp Nhận Hồ Sơ</p>
        </div>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          {error && (
            <div className="alert alert-danger">
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input
              className="form-control"
              placeholder="admin"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><span className="spinner" /> Đang đăng nhập...</> : <><i className="fa-solid fa-right-to-bracket" /> Đăng nhập hệ thống</>}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <a href="/" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fa-solid fa-arrow-left" /> Quay lại Cổng tiếp nhận
          </a>
        </div>
      </div>
    </div>
  );
}
