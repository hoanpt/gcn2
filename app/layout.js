import './globals.css';

export const metadata = {
  title: 'Cổng Dịch Vụ Công — CDC Đà Nẵng',
  description: 'Hệ thống tiếp nhận và cấp Giấy Chứng Nhận Tiêm Chủng — Trung tâm Kiểm soát Bệnh tật TP. Đà Nẵng',
  keywords: 'CDC Đà Nẵng, tiêm chủng, chứng nhận, hồ sơ trực tuyến',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
