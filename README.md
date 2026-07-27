# CDC Portal v2 — Hệ thống Tiếp nhận & Cấp Giấy Chứng Nhận Tiêm Chủng

## Mô tả
Hệ thống quản lý hồ sơ tiếp nhận và cấp giấy chứng nhận tiêm chủng theo cơ chế 1 cửa, phục vụ CDC Đà Nẵng.

## Yêu cầu hệ thống
- Node.js >= 20
- npm >= 9

## Khởi chạy

```bash
# Cài đặt lần đầu
npm install

# Chạy môi trường dev
npm run dev
# → http://localhost:3002
```

## Cấu hình (.env.local)
Tham khảo file `.env.example` để cấu hình:
- **Google Drive**: Thêm file key JSON Service Account và Folder ID
- **Email (SMTP)**: Cấu hình SMTP để gửi thông báo tự động
- **JWT Secret**: Thay bằng chuỗi ngẫu nhiên mạnh trước khi deploy

## Tài khoản mặc định
- **Admin**: `admin` / `123456`
- ⚠️ Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

## Cấu trúc thư mục
```
cdc-portal-v2/
├── app/
│   ├── page.js              # Trang chủ công dân
│   ├── submit/              # Nộp hồ sơ
│   ├── track/               # Tra cứu hồ sơ
│   ├── admin/               # Cổng quản trị
│   │   ├── page.js          # Đăng nhập
│   │   ├── dashboard/       # Dashboard + thống kê
│   │   ├── cases/[id]/      # Chi tiết + xử lý hồ sơ
│   │   └── accounts/        # Quản lý tài khoản
│   └── api/                 # API Routes
│       ├── auth/login        # Đăng nhập
│       ├── auth/logout       # Đăng xuất
│       ├── applications/     # CRUD hồ sơ
│       ├── track/[id]        # Tra cứu public
│       ├── stats/            # Thống kê
│       ├── backup/           # Backup DB
│       ├── accounts/         # Quản lý tài khoản
│       └── drive/[fileId]    # Download file từ Drive
├── lib/
│   ├── db.js                # SQLite database
│   ├── drive.js             # Google Drive integration
│   ├── email.js             # Nodemailer email service
│   ├── backup.js            # Auto backup scheduler
│   └── auth.js              # JWT authentication
├── components/
│   └── PublicHeader.js      # Header chung
├── public/brand/            # ← Đặt logo/icon tại đây
├── data/                    # Database & backups (tự tạo)
│   ├── cdc_portal.db        # SQLite database
│   └── backups/             # Backup files
└── config/                  # Google Drive key (tự tạo)
    └── google-drive-key.json
```

## Tích hợp Google Drive
1. Vào https://console.cloud.google.com
2. Tạo Project → Enable Google Drive API
3. Tạo Service Account → Tải JSON key → Lưu vào `config/google-drive-key.json`
4. Tạo thư mục Google Drive → Share với email Service Account (Editor)
5. Copy Folder ID → Điền vào `.env.local`

## Thêm logo CDC
Đặt file logo vào `public/brand/`:
- `logo.png` — Logo chính
- `favicon.ico` — Favicon

Sau đó cập nhật `components/PublicHeader.js` để dùng logo thật.

## Backup
- **Tự động**: Mỗi 24h (backup đầu tiên sau 5 phút khởi động)
- **Thủ công**: Nút "Backup DB" trên Admin Dashboard
- Backup lưu tại `data/backups/` và upload lên Google Drive (nếu đã cấu hình)
- Tự động xóa backup cũ hơn 30 ngày
