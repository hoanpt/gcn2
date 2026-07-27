'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function PublicHeader() {
  const pathname = usePathname();

  return (
    <header className="pub-header">
      <div className="pub-header-inner">
        <Link href="/" className="pub-logo">
          <Image
            src="/brand/logo.png"
            width={44}
            height={44}
            alt="CDC Đà Nẵng Logo"
            style={{ objectFit: 'contain', flexShrink: 0 }}
          />
          <div className="pub-logo-text">
            <h1>CDC Đà Nẵng</h1>
            <p>Phòng bệnh chủ động, vươn rộng tương lai</p>
          </div>
        </Link>

        <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/submit" className={`btn btn-sm ${pathname === '/submit' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-file-signature" />
            Nộp hồ sơ
          </Link>
          <Link href="/track" className={`btn btn-sm ${pathname === '/track' ? 'btn-primary' : 'btn-ghost'}`}>
            <i className="fa-solid fa-magnifying-glass" />
            Tra cứu
          </Link>
          <Link href="/admin" className="btn btn-sm btn-outline" style={{ marginLeft: 4 }}>
            <i className="fa-solid fa-lock" />
            <span style={{ display: 'none' }} className="md-show">Quản trị</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
