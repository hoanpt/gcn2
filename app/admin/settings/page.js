'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../admin.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    app_url: 'http://localhost:3000',
    backup_keep_days: '30',
    gdrive_folder_id: '',
    gdrive_service_account_json: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: 'false',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '"CDC Đà Nẵng" <noreply@cdc-danang.gov.vn>',
    bank_id: '',
    bank_account: '',
    bank_name: '',
    payment_fee: '85000',
    payment_desc: 'CDC '
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.status === 401 || res.status === 403) { router.push('/admin'); return; }
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('✅ Đã lưu cấu hình thành công!');
    } catch(e) {
      alert('Lỗi: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className={styles.adminLayout}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
      </div>
    </div>
  );

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
            <i className="fa-solid fa-gear" style={{ marginRight: 8, color: '#60a5fa' }} />
            Cấu hình hệ thống
          </span>
        </div>
      </nav>

      <div className={styles.adminContent} style={{ maxWidth: 800 }}>
        
        {/* Hệ thống */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fa-solid fa-server" style={{ color: 'var(--primary)', marginRight: 10 }} /> Cấu hình Hệ thống Chung</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Các thiết lập cốt lõi của ứng dụng</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Domain ứng dụng (App URL)</label>
                <input className="form-control" value={settings.app_url} onChange={e => setSettings({...settings, app_url: e.target.value})} placeholder="VD: https://cdc.domain.com" required />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Dùng để tạo link tra cứu hồ sơ gửi qua email. Không có dấu / ở cuối.</span>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Số ngày giữ file Backup Database</label>
                <input className="form-control" type="number" value={settings.backup_keep_days} onChange={e => setSettings({...settings, backup_keep_days: e.target.value})} placeholder="30" required />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Google Drive */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-brands fa-google-drive" style={{ color: '#0F9D58', marginRight: 10 }} /> Cấu hình Google Drive</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lưu trữ hồ sơ và backup dữ liệu lên cloud</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Google Drive Folder ID</label>
                <input className="form-control" value={settings.gdrive_folder_id} onChange={e => setSettings({...settings, gdrive_folder_id: e.target.value})} placeholder="VD: 1B2a... XYZ" />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Lấy ID thư mục từ link Google Drive của bạn.</span>
              </div>
              <div className="form-group">
                <label className="form-label">Service Account JSON (Nội dung file JSON)</label>
                <textarea 
                  className="form-control" 
                  rows={5} 
                  value={settings.gdrive_service_account_json === '********' ? '' : settings.gdrive_service_account_json} 
                  onChange={e => setSettings({...settings, gdrive_service_account_json: e.target.value})} 
                  placeholder={settings.gdrive_service_account_json === '********' ? 'Đã lưu JSON key (Nhập mới để thay đổi)' : 'Paste toàn bộ nội dung file JSON vào đây...'} 
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Nội dung file JSON được cấp bởi Google Cloud Service Account.</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Email */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-envelope" style={{ color: 'var(--primary)', marginRight: 10 }} /> Cấu hình Gửi Email (SMTP)</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cấu hình tài khoản để tự động gửi thông báo</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tên hiển thị người gửi</label>
                <input className="form-control" value={settings.smtp_from} onChange={e => setSettings({...settings, smtp_from: e.target.value})} placeholder='"CDC Đà Nẵng" <email_cua_ban@gmail.com>' required />
              </div>

              <div className="form-group">
                <label className="form-label">Máy chủ SMTP (Host)</label>
                <input className="form-control" value={settings.smtp_host} onChange={e => setSettings({...settings, smtp_host: e.target.value})} placeholder="VD: smtp.gmail.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Cổng (Port)</label>
                <input className="form-control" value={settings.smtp_port} onChange={e => setSettings({...settings, smtp_port: e.target.value})} placeholder="VD: 587" />
              </div>

              <div className="form-group">
                <label className="form-label">Tài khoản Email (User)</label>
                <input className="form-control" value={settings.smtp_user} onChange={e => setSettings({...settings, smtp_user: e.target.value})} placeholder="email_cua_ban@gmail.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu (App Password)</label>
                <input className="form-control" type="password" value={settings.smtp_pass === '********' ? '' : settings.smtp_pass} onChange={e => setSettings({...settings, smtp_pass: e.target.value})} placeholder={settings.smtp_pass === '********' ? '********' : ''} />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Kết nối bảo mật (Secure SSL/TLS)</label>
                <select className="form-control" value={settings.smtp_secure} onChange={e => setSettings({...settings, smtp_secure: e.target.value})}>
                  <option value="false">Không (Thường dùng với Port 587)</option>
                  <option value="true">Có (Thường dùng với Port 465)</option>
                </select>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Ghi chú: Nếu bạn sử dụng Gmail, hãy bật bảo mật 2 lớp (2FA) và tạo <strong>Mật khẩu ứng dụng (App Password)</strong> để điền vào ô Mật khẩu. KHÔNG sử dụng mật khẩu đăng nhập Gmail thông thường.
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Thanh toán */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3><i className="fa-solid fa-building-columns" style={{ color: 'var(--success)', marginRight: 10 }} /> Cấu hình Thanh toán VietQR</h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tài khoản nhận lệ phí cấp chứng nhận</span>
          </div>
          <div className="card-body">
            <form onSubmit={saveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Ngân hàng (Mã BIN/Tên viết tắt)</label>
                <input className="form-control" value={settings.bank_id} onChange={e => setSettings({...settings, bank_id: e.target.value})} placeholder="VD: VCB, MB, BIDV" />
              </div>

              <div className="form-group">
                <label className="form-label">Số tài khoản</label>
                <input className="form-control" value={settings.bank_account} onChange={e => setSettings({...settings, bank_account: e.target.value})} placeholder="VD: 1903000000" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tên chủ tài khoản</label>
                <input className="form-control" value={settings.bank_name} onChange={e => setSettings({...settings, bank_name: e.target.value})} placeholder="VD: NGUYEN VAN A" />
              </div>

              <div className="form-group">
                <label className="form-label">Mức phí (VNĐ)</label>
                <input className="form-control" type="number" value={settings.payment_fee} onChange={e => setSettings({...settings, payment_fee: e.target.value})} placeholder="85000" />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: 13, color: 'var(--primary)', marginTop: 6, background: 'var(--primary-light)', padding: '10px 16px', borderRadius: 8 }}>
                  <i className="fa-solid fa-circle-info" /> <strong>Lưu ý:</strong> Nội dung chuyển khoản trên mã QR sẽ tự động được gán thành <strong>Mã số hồ sơ</strong> (VD: CDC-123456) để hệ thống dễ dàng đối soát tự động.
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Lưu cấu hình</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
