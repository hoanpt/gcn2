'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../admin.module.css';

const STATUS_OPTS = [
  { value: 'pending',    label: 'Chờ tiếp nhận',  cls: 'badge-pending' },
  { value: 'received',   label: 'Đã tiếp nhận',    cls: 'badge-received' },
  { value: 'processing', label: 'Đang xử lý',      cls: 'badge-processing' },
  { value: 'completed',  label: 'Đã hoàn tất',     cls: 'badge-completed' },
];

const METHOD_MAP = { email: 'Qua Email', postal: 'Bưu điện', direct: 'Nhận trực tiếp' };

export default function CaseDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showIssuer, setShowIssuer] = useState(false);

  const [certFile, setCertFile] = useState(null);
  const [certNotes, setCertNotes] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadApp();
  }, [id]);

  async function loadApp() {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (res.status === 401) { router.push('/admin'); return; }
      if (!res.ok) { setError('Không tìm thấy hồ sơ'); setLoading(false); return; }
      const data = await res.json();
      setApp(data);
      setNewStatus(data.status);
      // No auto-fill needed anymore since we upload file
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNote }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      
      const emailMsg = data.emailSent 
        ? '\n📧 Đã gửi email thông báo cho người dân.' 
        : '\n⚠️ Không gửi được email tự động (Hệ thống SMTP chưa được cấu hình).';
        
      alert('✅ Đã cập nhật trạng thái!' + emailMsg);
      loadApp();
    } catch (e) { alert(e.message); }
    finally { setUpdating(false); setStatusNote(''); }
  }

  async function uploadCertificate() {
    if (!certFile) { alert('Vui lòng đính kèm file bản scan chứng nhận (PDF/JPG/PNG)'); return; }
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append('file_certificate', certFile);
      fd.append('notes', certNotes);

      const res = await fetch(`/api/applications/${id}/certificate`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); setGenerating(false); return; }

      await loadApp();
      
      const emailMsg = data.emailSent 
        ? '\n📧 Đã gửi file chứng nhận qua email cho người dân.' 
        : '\n⚠️ Không gửi được email tự động (Hệ thống SMTP chưa được cấu hình).';
        
      alert('✅ Đã upload chứng nhận và cập nhật hồ sơ thành công!' + emailMsg);
      setShowIssuer(false);
      setCertFile(null);
      setCertNotes('');
    } catch (e) {
      alert('Lỗi upload: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return (
    <div className={styles.adminLayout}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <span className="spinner spinner-dark" style={{ width: 40, height: 40 }} />
      </div>
    </div>
  );

  if (error) return (
    <div className={styles.adminLayout}>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: 'var(--danger)', fontSize: 18 }}>{error}</p>
        <Link href="/admin/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>← Quay lại</Link>
      </div>
    </div>
  );

  const statusInfo = STATUS_OPTS.find(s => s.value === app.status) || STATUS_OPTS[0];

  return (
    <div className={styles.adminLayout}>
      <nav className={styles.adminNav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/dashboard" className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span style={{ color: 'white', fontWeight: 600, fontSize: 15 }}>
            Chi tiết Hồ sơ — <span style={{ color: '#60a5fa' }}>{app.id}</span>
          </span>
        </div>
        <span className={`badge ${statusInfo.cls}`} style={{ fontSize: 13, padding: '6px 14px' }}>
          {statusInfo.label}
        </span>
      </nav>

      <div className={styles.adminContent} style={{ maxWidth: 900 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          {/* Thông tin người nộp */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h3><i className="fa-solid fa-user" style={{ color: 'var(--primary)', marginRight: 10 }} />Thông tin người nộp hồ sơ</h3>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                <i className="fa-regular fa-clock" /> {new Date(app.submitted_at).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  ['Họ và tên', app.name],
                  ['CCCD/Hộ chiếu', app.cccd],
                  ['Ngày sinh', app.dob ? new Date(app.dob).toLocaleDateString('vi-VN') : '—'],
                  ['Giới tính', app.gender || '—'],
                  ['Điện thoại', app.phone],
                  ['Email', app.email || '—'],
                  ['Nhận kết quả', METHOD_MAP[app.receive_method] || app.receive_method],
                  ['Địa chỉ', app.address || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cập nhật trạng thái */}
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-list-check" style={{ color: 'var(--primary)', marginRight: 8 }} />Cập nhật trạng thái</h3></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Trạng thái mới</label>
                <select className="form-control" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú (sẽ gửi qua email)</label>
                <textarea className="form-control" rows={3} placeholder="Thêm ghi chú cho người dân..." value={statusNote} onChange={e => setStatusNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={updateStatus} disabled={updating || newStatus === app.status}>
                {updating ? <><span className="spinner" /> Đang lưu...</> : <><i className="fa-solid fa-save" /> Cập nhật trạng thái</>}
              </button>
            </div>
          </div>

          {/* File đính kèm */}
          <div className="card">
            <div className="card-header"><h3><i className="fa-solid fa-paperclip" style={{ color: 'var(--primary)', marginRight: 8 }} />File đính kèm</h3></div>
            <div className="card-body">
              {(app.files_json && app.files_json.length > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {app.files_json.map((f, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <i className="fa-solid fa-file" style={{ color: 'var(--primary)', fontSize: 18 }} />
                      <span style={{ flex: 1, fontSize: 13 }}><strong>{f.label}:</strong> {f.originalName}</span>
                      <a href={f.localPath} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                        <i className="fa-solid fa-eye" /> Xem / Tải
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="alert alert-warning">
                  <i className="fa-solid fa-triangle-exclamation" />
                  Không có file đính kèm nào.
                </div>
              )}
            </div>
          </div>

          {/* Audit Log */}
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header"><h3><i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--primary)', marginRight: 8 }} />Lịch sử xử lý</h3></div>
            <div className="card-body">
              {(app.statusLogs || []).length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có lịch sử.</p>
              ) : (
                <div className="timeline">
                  {[...app.statusLogs].reverse().map((log, i) => (
                    <div key={i} className="timeline-item done">
                      <div className="timeline-dot"><i className="fa-solid fa-check" style={{ fontSize: 8 }} /></div>
                      <div className="timeline-content">
                        <h4>{STATUS_OPTS.find(s => s.value === log.new_status)?.label || log.new_status}</h4>
                        <p>
                          {log.changed_by !== 'system' && `Bởi: ${log.changed_by} — `}
                          {new Date(log.changed_at).toLocaleString('vi-VN')}
                          {log.note && <em> — "{log.note}"</em>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cấp chứng nhận */}
          <div className="card" style={{ gridColumn: '1 / -1', border: '2px solid var(--primary)' }}>
            <div className="card-header" style={{ background: 'var(--primary-light)' }}>
              <h3 style={{ color: 'var(--primary)' }}><i className="fa-solid fa-certificate" style={{ marginRight: 10 }} />
                {app.certificate_id ? `Đã cấp: ${app.certificate_id}` : 'Cấp Giấy Chứng Nhận (Bản Scan)'}
              </h3>
              <button className="btn btn-primary" onClick={() => setShowIssuer(!showIssuer)}>
                {showIssuer ? <><i className="fa-solid fa-chevron-up" /> Đóng</> : <><i className="fa-solid fa-upload" /> {app.certificate_id ? 'Cập nhật bản mới' : 'Tải lên chứng nhận'}</>}
              </button>
            </div>

            {/* Hiển thị chứng nhận đã cấp */}
            {app.certificate_json && app.certificate_json.url && !showIssuer && (
              <div className="card-body" style={{ background: '#f8fafc', textAlign: 'center', padding: '30px 20px' }}>
                <i className="fa-solid fa-file-circle-check" style={{ fontSize: 40, color: 'var(--success)', marginBottom: 16 }} />
                <h4 style={{ color: 'var(--gray-900)' }}>Hồ sơ đã được cấp chứng nhận bản scan</h4>
                <a href={app.certificate_json.url} target="_blank" rel="noreferrer" className="btn btn-success" style={{ marginTop: 16 }}>
                  <i className="fa-solid fa-eye" /> Xem &amp; Tải file chứng nhận
                </a>
              </div>
            )}

            {/* Form upload */}
            {showIssuer && (
              <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <i className="fa-solid fa-info-circle" />
                  Bạn tự điền chứng nhận theo mẫu, ký tên, đóng dấu đỏ, sau đó scan hoặc chụp ảnh lại và tải lên hệ thống. Người dân sẽ nhận được bản scan này.
                </div>
                
                <div className="form-group">
                  <label className="form-label">Chọn file bản scan chứng nhận (PDF, JPG, PNG) <span className="required">*</span></label>
                  <input className="form-control" type="file" accept="application/pdf,image/*" onChange={e => setCertFile(e.target.files[0])} />
                </div>
                
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label">Ghi chú (Tùy chọn, sẽ gửi kèm email cho người dân)</label>
                  <textarea className="form-control" rows={3} value={certNotes} onChange={e => setCertNotes(e.target.value)} placeholder="Ví dụ: Chứng nhận đã được cấp..." />
                </div>

                <button className="btn btn-success btn-lg" onClick={uploadCertificate} disabled={generating}>
                  {generating ? <><span className="spinner" /> Đang tải lên...</> : <><i className="fa-solid fa-upload" /> Tải lên &amp; Cấp chứng nhận</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


