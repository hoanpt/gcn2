'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import styles from './submit.module.css';

import { paymentConfig as fallbackConfig } from '@/lib/paymentConfig';

const STEPS = ['Thông tin cá nhân', 'Giấy tờ đính kèm', 'Hình thức nhận KQ', 'Thanh toán lệ phí', 'Xác nhận & Gửi'];

export default function SubmitPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [appId, setAppId] = useState(() => 'CDC-' + Math.floor(100000 + Math.random() * 900000));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [paymentConfig, setPaymentConfig] = useState(fallbackConfig);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => { if (data.bankId) setPaymentConfig(data); })
      .catch(console.error);
  }, []);

  const [form, setForm] = useState({
    name: '', cccd: '', dob: '', gender: '', phone: '', email: '', address: '',
    receive_method: 'direct', notes: '',
  });
  const [files, setFiles] = useState({ file_cccd: null, file_vaccine: null, file_payment: null });

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  function validateStep() {
    if (step === 0) {
      if (!form.name.trim()) return 'Vui lòng nhập họ và tên';
      
      const cccd = form.cccd.trim();
      if (!cccd) return 'Vui lòng nhập số CCCD/Hộ chiếu';
      if (cccd.length < 6 || cccd.length > 15) return 'Số CCCD/Hộ chiếu phải từ 6 đến 15 ký tự';
      if (!/^[a-zA-Z0-9]+$/.test(cccd)) return 'Số CCCD/Hộ chiếu không hợp lệ (chỉ chứa chữ cái và số)';

      const phone = form.phone.trim();
      if (!phone) return 'Vui lòng nhập số điện thoại';
      if (!/^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''))) return 'Số điện thoại không hợp lệ (9-15 số, có thể có dấu +)';

      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email không hợp lệ';
    }
    if (step === 1) {
      if (!files.file_cccd) return 'Vui lòng đính kèm file CCCD/Hộ chiếu';
      if (!files.file_vaccine) return 'Vui lòng đính kèm file Sổ/Chứng nhận tiêm chủng';
    }
    if (step === 3) {
      if (!files.file_payment) return 'Vui lòng đính kèm Ảnh chụp biên lai thanh toán';
    }
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('id', appId);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (files.file_cccd) fd.append('file_cccd', files.file_cccd);
      if (files.file_vaccine) fd.append('file_vaccine', files.file_vaccine);
      if (files.file_payment) fd.append('file_payment', files.file_payment);

      const res = await fetch('/api/applications', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra');
        return;
      }

      setResult(data);
    } catch (e) {
      setError('Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PublicHeader />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
          <div className="card" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 48 }}>
              <div style={{ fontSize: 64, color: 'var(--success)', marginBottom: 20 }}>
                <i className="fa-solid fa-circle-check" />
              </div>
              <h2 style={{ fontSize: 24, marginBottom: 10 }}>Nộp hồ sơ thành công!</h2>
              <p style={{ marginBottom: 28 }}>Hệ thống đã ghi nhận hồ sơ của bạn. Vui lòng lưu lại mã theo dõi:</p>
              <div className={styles.trackingCode}>{result.id}</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '16px 0 28px' }}>
                {form.email ? (
                  result.emailSent 
                    ? <span style={{ color: 'var(--success)' }}>📧 Email xác nhận đã được gửi tự động đến {form.email}</span>
                    : <span style={{ color: 'var(--warning)' }}>⚠️ Đã ghi nhận email {form.email} nhưng tính năng gửi tự động đang tắt. CDC sẽ liên hệ hoặc gửi kết quả thủ công cho bạn.</span>
                ) : ''}
                <br /><br />Thời gian xử lý dự kiến: <strong>3–5 ngày làm việc</strong>
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => router.push('/track?id=' + result.id)}>
                  <i className="fa-solid fa-magnifying-glass" /> Theo dõi hồ sơ
                </button>
                <button className="btn btn-outline" onClick={() => { 
                  setResult(null); 
                  setStep(0); 
                  setForm({ name:'',cccd:'',dob:'',gender:'',phone:'',email:'',address:'',receive_method:'direct',notes:'' }); 
                  setFiles({ file_cccd: null, file_vaccine: null, file_payment: null }); 
                  setAppId('CDC-' + Math.floor(100000 + Math.random() * 900000));
                }}>
                  Nộp hồ sơ khác
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />

      <div className={styles.container}>
        {/* Stepper */}
        <div className={styles.stepper}>
          {STEPS.map((s, i) => (
            <div key={i} className={`${styles.stepItem} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
              <div className={styles.stepNum}>
                {i < step ? <i className="fa-solid fa-check" /> : i + 1}
              </div>
              <span className={styles.stepLabel}>{s}</span>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        <div className="card" style={{ maxWidth: 700, margin: '0 auto 60px', width: '100%' }}>
          <div className="card-header">
            <h3 style={{ fontSize: 18 }}>
              <i className="fa-solid fa-file-signature" style={{ color: 'var(--primary)', marginRight: 10 }} />
              {STEPS[step]}
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bước {step + 1} / {STEPS.length}</span>
          </div>

          <div className="card-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                <i className="fa-solid fa-triangle-exclamation" />
                {error}
              </div>
            )}

            {/* STEP 0: Thông tin cá nhân */}
            {step === 0 && (
              <div className={styles.formGrid}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Họ và tên <span className="required">*</span></label>
                  <input className="form-control" placeholder="Nguyễn Văn A" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">CCCD / Hộ chiếu <span className="required">*</span></label>
                  <input className="form-control" placeholder="Số giấy tờ" value={form.cccd} onChange={e => set('cccd', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại <span className="required">*</span></label>
                  <input className="form-control" placeholder="0901234567" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày sinh</label>
                  <input className="form-control" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Giới tính</label>
                  <select className="form-control" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">— Chọn —</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Email (để nhận thông báo)</label>
                  <input className="form-control" type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Địa chỉ</label>
                  <input className="form-control" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 1: Giấy tờ */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { key: 'file_cccd', label: 'CCCD / Hộ chiếu', icon: 'fa-id-card', desc: 'Mặt trước & mặt sau CCCD, hoặc trang thông tin Hộ chiếu. Chấp nhận: JPG, PNG, PDF (tối đa 10MB).' },
                  { key: 'file_vaccine', label: 'Sổ / Chứng nhận tiêm chủng', icon: 'fa-syringe', desc: 'Trang ghi nhận các mũi tiêm hợp lệ. Chấp nhận: JPG, PNG, PDF (tối đa 10MB).' },
                ].map(({ key, label, icon, desc }) => (
                  <div key={key} className="file-drop" onClick={() => document.getElementById(key).click()}>
                    <input id={key} type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, [key]: e.target.files[0] })); setError(''); }} />
                    {files[key] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                        <i className="fa-solid fa-file-circle-check" style={{ fontSize: 28, color: 'var(--success)' }} />
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files[key].name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files[key].size / 1024).toFixed(1)} KB — Click để thay đổi</div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className={`fa-solid ${icon}`} style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 10 }} />
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label} <span style={{ color: 'var(--danger)' }}>*</span></div>
                        <p style={{ fontSize: 13 }}>{desc}</p>
                        <div className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
                          <i className="fa-solid fa-upload" /> Chọn file
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* STEP 2: Hình thức nhận */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { value: 'email', icon: 'fa-envelope', label: 'Nhận qua Email', desc: 'Giấy chứng nhận PDF sẽ được gửi đến email đã đăng ký.', disabled: !form.email },
                  { value: 'postal', icon: 'fa-truck', label: 'Gửi qua Bưu điện', desc: 'Giấy chứng nhận gốc sẽ được gửi đến địa chỉ của bạn qua đường bưu điện.' },
                  { value: 'direct', icon: 'fa-building', label: 'Nhận trực tiếp tại CDC', desc: 'Đến nhận trực tiếp tại bộ phận Một cửa — CDC Đà Nẵng, 118 Lê Đình Lý.' },
                ].map(opt => (
                  <label key={opt.value} className={`${styles.receiveOption} ${form.receive_method === opt.value ? styles.receiveSelected : ''} ${opt.disabled ? styles.receiveDisabled : ''}`}>
                    <input type="radio" name="receive_method" value={opt.value} checked={form.receive_method === opt.value} onChange={() => !opt.disabled && set('receive_method', opt.value)} disabled={opt.disabled} style={{ display: 'none' }} />
                    <div className={styles.receiveIcon}><i className={`fa-solid ${opt.icon}`} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{opt.desc}</div>
                      {opt.disabled && <div style={{ fontSize: 12, color: 'var(--warning)', marginTop: 3 }}>⚠ Cần điền Email ở bước 1</div>}
                    </div>
                    {form.receive_method === opt.value && <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)', fontSize: 20 }} />}
                  </label>
                ))}
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label">Ghi chú thêm (nếu có)</label>
                  <textarea className="form-control" rows={3} placeholder="Yêu cầu đặc biệt hoặc thông tin bổ sung..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
            )}

            {/* STEP 3: Thanh toán */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                <div className="alert alert-warning" style={{ width: '100%' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--warning)' }} />
                  <strong>Lưu ý quan trọng:</strong> Bạn phải thanh toán lệ phí <strong>{paymentConfig.fee.toLocaleString()} VNĐ</strong> và chụp lại màn hình giao dịch chuyển khoản thành công để đính kèm vào hồ sơ.
                </div>
                
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center', width: '100%', maxWidth: 400 }}>
                  <h4 style={{ marginBottom: 16, color: 'var(--primary)', fontSize: 18 }}>Quét mã để thanh toán</h4>
                  <img 
                    src={`https://img.vietqr.io/image/${paymentConfig.bankId}-${paymentConfig.accountNo}-compact2.jpg?amount=${paymentConfig.fee}&addInfo=${encodeURIComponent(appId)}&accountName=${encodeURIComponent(paymentConfig.accountName)}`} 
                    alt="VietQR"
                    style={{ width: '100%', maxWidth: 250, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                  />
                  <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                    <div>Ngân hàng: <strong>{paymentConfig.bankId.toUpperCase()}</strong></div>
                    <div>Số TK: <strong>{paymentConfig.accountNo}</strong></div>
                    <div>Chủ TK: <strong>{paymentConfig.accountName}</strong></div>
                    <div>Nội dung CK: <strong style={{ color: 'var(--primary)' }}>{appId}</strong></div>
                    <div>Số tiền: <strong style={{ color: 'var(--danger)' }}>{paymentConfig.fee.toLocaleString()} VNĐ</strong></div>
                  </div>
                </div>

                <div className="file-drop" onClick={() => document.getElementById('file_payment').click()} style={{ width: '100%', marginTop: 10, borderColor: files.file_payment ? 'var(--success)' : 'var(--border)' }}>
                  <input id="file_payment" type="file" accept="image/jpeg,image/png,application/pdf" onChange={e => { setFiles(f => ({ ...f, file_payment: e.target.files[0] })); setError(''); }} />
                  {files.file_payment ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                      <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 28, color: 'var(--success)' }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{files.file_payment.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(files.file_payment.size / 1024).toFixed(1)} KB — Click để đổi ảnh khác</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 10 }} />
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Tải lên Ảnh chụp biên lai <span style={{ color: 'var(--danger)' }}>*</span></div>
                      <p style={{ fontSize: 13 }}>Chấp nhận: JPG, PNG, PDF</p>
                      <div className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>Chọn ảnh</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Xác nhận */}
            {step === 4 && (
              <div>
                <div className="alert alert-info" style={{ marginBottom: 24 }}>
                  <i className="fa-solid fa-info-circle" />
                  Vui lòng kiểm tra lại thông tin trước khi gửi. Sau khi nộp, mọi thay đổi cần liên hệ trực tiếp CDC Đà Nẵng.
                </div>
                <div className={styles.confirmGrid}>
                  {[
                    ['Họ và tên', form.name],
                    ['CCCD/Hộ chiếu', form.cccd],
                    ['Ngày sinh', form.dob || 'Chưa cung cấp'],
                    ['Giới tính', form.gender || 'Chưa cung cấp'],
                    ['Điện thoại', form.phone],
                    ['Email', form.email || 'Không có'],
                    ['Địa chỉ', form.address || 'Không có'],
                    ['Hình thức nhận KQ', form.receive_method === 'email' ? 'Qua Email' : form.receive_method === 'postal' ? 'Bưu điện' : 'Nhận trực tiếp'],
                    ['File CCCD', files.file_cccd?.name || 'Chưa đính kèm'],
                    ['File Tiêm chủng', files.file_vaccine?.name || 'Chưa đính kèm'],
                    ['Biên lai thanh toán', files.file_payment?.name || 'Chưa đính kèm'],
                  ].map(([label, value]) => (
                    <div key={label} className={styles.confirmRow}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 20, lineHeight: 1.6 }}>
                  Bằng việc nhấn "Gửi hồ sơ", bạn xác nhận tất cả thông tin cung cấp là đúng sự thật và đồng ý để CDC Đà Nẵng xử lý hồ sơ theo quy trình.
                </p>
              </div>
            )}
          </div>

          <div className="card-footer" style={{ justifyContent: 'space-between' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>
                <i className="fa-solid fa-arrow-left" /> Quay lại
              </button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" onClick={next}>
                Tiếp theo <i className="fa-solid fa-arrow-right" />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={submit} disabled={loading}>
                {loading ? <><span className="spinner" /> Đang gửi...</> : <><i className="fa-solid fa-paper-plane" /> Gửi hồ sơ đăng ký</>}
              </button>
            )}
          </div>
        </div>
      </div>

      <footer className="pub-footer">
        <p><strong>CDC Đà Nẵng</strong> — Mọi thông tin sẽ được bảo mật và chỉ sử dụng cho mục đích cấp giấy chứng nhận.</p>
      </footer>
    </div>
  );
}
