import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import styles from './page.module.css';

export const metadata = {
  title: 'Cổng Dịch Vụ Công — CDC Đà Nẵng',
  description: 'Nộp hồ sơ và tra cứu Giấy Chứng Nhận Tiêm Chủng trực tuyến',
};

export default function HomePage() {
  return (
    <div className={styles.page}>
      <PublicHeader />

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className={styles.heroBadge}>
            <i className="fa-solid fa-shield-halved" />
            Cơ chế một cửa — Minh bạch & Nhanh chóng
          </div>
          <h2>Cổng Xét Duyệt<br />Chứng Nhận Tiêm Chủng</h2>
          <p>Hệ thống phục vụ người dân đăng ký, nộp hồ sơ và tra cứu kết quả trực tuyến nhanh chóng, thuận tiện tại Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng.</p>

          <div className={styles.heroActions}>
            <Link href="/submit" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              <i className="fa-solid fa-file-signature" />
              Nộp hồ sơ ngay
            </Link>
            <Link href="/track" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.5)' }}>
              <i className="fa-solid fa-magnifying-glass" />
              Tra cứu hồ sơ
            </Link>
          </div>

          {/* 4 bước quy trình */}
          <div className="steps">
            {[
              { icon: 'fa-file-arrow-up', label: 'Nộp hồ sơ' },
              { icon: 'fa-inbox', label: 'Tiếp nhận' },
              { icon: 'fa-gears', label: 'Xét duyệt' },
              { icon: 'fa-certificate', label: 'Cấp chứng nhận' },
            ].map((s, i) => (
              <div key={i} className="step">
                <div className="step-icon"><i className={`fa-solid ${s.icon}`} /></div>
                <span className="step-label">Bước {i + 1}<br />{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cards */}
      <main className={styles.main}>
        <div className={styles.cardGrid}>
          <Link href="/submit" className={styles.portalCard}>
            <div className={styles.cardIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <i className="fa-solid fa-file-signature" />
            </div>
            <h3>Nộp hồ sơ trực tuyến</h3>
            <p>Khởi tạo và gửi hồ sơ đề nghị cấp mới chứng nhận hoặc xác nhận các mũi tiêm chủng trước đó.</p>
            <div className={styles.cardBtn}>
              Bắt đầu nộp <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>

          <Link href="/track" className={styles.portalCard}>
            <div className={styles.cardIcon} style={{ background: '#ecfdf5', color: 'var(--success)' }}>
              <i className="fa-solid fa-magnifying-glass-chart" />
            </div>
            <h3>Tra cứu tiến độ hồ sơ</h3>
            <p>Kiểm tra cập nhật quá trình xét duyệt của hồ sơ đã nộp thông qua mã số giao dịch hoặc số CCCD.</p>
            <div className={styles.cardBtn}>
              Tra cứu ngay <i className="fa-solid fa-arrow-right" />
            </div>
          </Link>
        </div>

        {/* Info section */}
        <div className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Thành phần hồ sơ cần chuẩn bị</h2>
          <div className={styles.docGrid}>
            {[
              { icon: 'fa-id-card', title: 'CCCD / Hộ chiếu', desc: 'Bản chụp/scan mặt trước và mặt sau CCCD hoặc trang thông tin cá nhân trên Hộ chiếu còn hiệu lực.' },
              { icon: 'fa-syringe', title: 'Sổ/Chứng nhận tiêm chủng', desc: 'Bản chụp các trang ghi nhận các mũi tiêm chủng đã được ghi nhận hợp lệ trước đó.' },
              { icon: 'fa-envelope', title: 'Email liên hệ (nếu có)', desc: 'Để nhận thông báo tự động về trạng thái hồ sơ và kết quả qua email.' },
            ].map((d, i) => (
              <div key={i} className={styles.docCard}>
                <div className={styles.docIcon}><i className={`fa-solid ${d.icon}`} /></div>
                <div>
                  <h4>{d.title}</h4>
                  <p>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className={styles.contactBar}>
          <i className="fa-solid fa-headset" style={{ fontSize: 24, color: 'var(--primary)' }} />
          <div>
            <strong>Cần hỗ trợ?</strong>
            <span>Liên hệ CDC Đà Nẵng: <a href="tel:1900988975">1900 988 975</a> — Địa chỉ: 118 Lê Đình Lý, Thanh Khê, Đà Nẵng</span>
          </div>
        </div>
      </main>

      <footer className="pub-footer">
        <p><strong>Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng (CDC Đà Nẵng)</strong></p>
        <p>118 Lê Đình Lý, Quận Thanh Khê, TP. Đà Nẵng &nbsp;|&nbsp; ĐT: 1900 988 975</p>
        <p style={{ marginTop: 8, opacity: 0.6 }}>© 2026 CDC Đà Nẵng. Hệ thống tiếp nhận hồ sơ trực tuyến.</p>
      </footer>
    </div>
  );
}
