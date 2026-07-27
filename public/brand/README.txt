# Thư mục Brand — CDC Đà Nẵng
# Đặt các file sau vào đây:
# - logo.png       → Logo CDC Đà Nẵng (khuyến nghị 200x200px, nền trong suốt)
# - logo-white.png → Logo nền trắng/trong suốt cho header tối
# - favicon.ico    → Favicon cho tab trình duyệt
# - icon-192.png   → Icon cho PWA/mobile (192x192px)
# - icon-512.png   → Icon cho PWA/mobile (512x512px)
#
# Sau khi thêm logo, cập nhật component PublicHeader.js:
#   Thay phần <div> placeholder bằng:
#   <Image src="/brand/logo.png" width={44} height={44} alt="CDC logo" />
#
# Và trong app/layout.js thêm:
#   <link rel="icon" href="/brand/favicon.ico" />
