'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import styles from './track.module.css';

const STATUS_STEPS = [
  { key: 'pending', icon: 'fa-paper-plane', label: 'Chưa tiếp nhận', desc: 'Hồ sơ đã được gửi thành công, đang chờ cán bộ tiếp nhận.' },
  { key: 'received', icon: 'fa-inbox', label: 'Đã tiếp nhận', desc: 'Cán bộ đã tiếp nhận và xác nhận hồ sơ hợp lệ.' },
  { key: 'processing', icon: 'fa-gears', label: 'Đang xử lý', desc: 'Hồ sơ đang được rà soát, đối chiếu thông tin tiêm chủng.' },
  { key: 'completed', icon: 'fa-certificate', label: 'Đã có kết quả', desc: 'Quá trình phê duyệt hoàn tất. Giấy chứng nhận đã sẵn sàng.' },
];

const STATUS_IDX = { pending: 0, received: 1, processing: 2, completed: 3 };

function TrackContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setQuery(id); doSearch(id); }
  }, []);

  async function doSearch(id) {
    const q = (id || query).trim();
    if (!q) { setError('Vui lòng nhập mã hồ sơ hoặc số CCCD'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Không tìm thấy hồ sơ'); return; }
      setResult(data);
      // cập nhật URL
      const url = new URL(window.location);
      url.searchParams.set('id', q);
      window.history.replaceState({}, '', url);
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentIdx = result ? (STATUS_IDX[result.application.status] ?? 0) : -1;

  const methodLabel = {
    email: 'Nhận qua Email',
    postal: 'Nhận qua Bưu điện',
    direct: 'Nhận trực tiếp tại CDC',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />

      <div className={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, marginBottom: 8 }}>Tra cứu tình trạng hồ sơ</h2>
          <p>Nhập mã hồ sơ (CDC-XXXXXX) hoặc số CCCD để kiểm tra tiến độ xử lý</p>
        </div>

        {/* Search Box */}
        <div className="card" style={{ marginBottom: 28 }}>
          <div className="card-body">
            <div className={styles.searchBox}>
              <input
                className="form-control"
                placeholder="Nhập mã hồ sơ (VD: CDC-123456) hoặc số CCCD"
                value={query}
                onChange={e => { setQuery(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && doSearch()}
                style={{ fontSize: 16 }}
              />
              <button className="btn btn-primary" onClick={() => doSearch()} disabled={loading} style={{ flexShrink: 0 }}>
                {loading ? <span className="spinner" /> : <i className="fa-solid fa-magnifying-glass" />}
                Tra cứu
              </button>
            </div>
            {error && (
              <div className="alert alert-danger" style={{ marginTop: 14 }}>
                <i className="fa-solid fa-circle-exclamation" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="card">
            <div className="card-header">
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>Kết quả tra cứu</div>
                <h3 style={{ fontSize: 20, color: 'var(--primary)' }}>{result.application.id}</h3>
              </div>
              <span className={`badge badge-${result.application.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                {STATUS_STEPS[currentIdx]?.label}
              </span>
            </div>

            <div className="card-body">
              {/* Info Grid */}
              <div className={styles.infoGrid}>
                {[
                  ['Người nộp', result.application.name],
                  ['Thời gian nộp', new Date(result.application.submitted_at).toLocaleString('vi-VN')],
                  ['Hình thức nhận KQ', methodLabel[result.application.receive_method] || result.application.receive_method],
                ].map(([label, value]) => (
                  <div key={label} className={styles.infoItem}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <h4 style={{ fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-route" style={{ color: 'var(--text-muted)' }} />
                Lộ trình xử lý hồ sơ
              </h4>

              <div className="timeline">
                {STATUS_STEPS.map((step, i) => {
                  const isDone = i < currentIdx;
                  const isActive = i === currentIdx;
                  const logEntry = result.statusLogs?.find(l => l.new_status === step.key);

                  return (
                    <div key={step.key} className={`timeline-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                      <div className="timeline-dot">
                        {isDone ? <i className="fa-solid fa-check" style={{ fontSize: 9 }} /> :
                         isActive ? <i className={`fa-solid ${step.icon}`} style={{ fontSize: 9 }} /> :
                         <span style={{ fontSize: 10 }}>{i + 1}</span>}
                      </div>
                      <div className="timeline-content">
                        <h4>{step.label}</h4>
                        <p>{step.desc}</p>
                        {logEntry && (
                          <p style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                            <i className="fa-regular fa-clock" /> {new Date(logEntry.changed_at).toLocaleString('vi-VN')}
                            {logEntry.note && ` — ${logEntry.note}`}
                          </p>
                        )}
                        {isActive && (
                          <span className={`badge badge-${step.key}`} style={{ marginTop: 6 }}>
                            Đang ở bước này
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Completed message */}
              {result.application.status === 'completed' && (
                <div className="alert alert-success" style={{ marginTop: 24 }}>
                  <i className="fa-solid fa-circle-check" />
                  <div>
                    <strong>Hồ sơ đã hoàn tất!</strong>
                    <p style={{ margin: '4px 0 0', color: 'inherit' }}>
                      {result.application.receive_method === 'email' && 'Giấy chứng nhận đã được gửi qua email của bạn.'}
                      {result.application.receive_method === 'postal' && 'Giấy chứng nhận đang được gửi qua bưu điện đến địa chỉ của bạn.'}
                      {result.application.receive_method === 'direct' && 'Vui lòng đến nhận trực tiếp tại CDC Đà Nẵng — 118 Lê Đình Lý.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="pub-footer" style={{ marginTop: 'auto' }}>
        <p><strong>CDC Đà Nẵng</strong> — Cần hỗ trợ? Gọi <strong>0236 382 2779</strong></p>
      </footer>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><span className="spinner spinner-dark" style={{ width: 36, height: 36 }} /></div>}>
      <TrackContent />
    </Suspense>
  );
}
