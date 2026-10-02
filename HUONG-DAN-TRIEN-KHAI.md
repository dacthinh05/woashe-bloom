# HƯỚNG DẪN TRIỂN KHAI & QUẢN TRỊ WEBSITE WOASHE BLOOM

Tài liệu hướng dẫn chi tiết cách đưa website **Woashe Bloom** lên mạng Internet để khách hàng đặt hoa và chủ shop quản lý bán hàng 24/7.

---

## 1. TỔNG QUAN HỆ THỐNG
* **Website này KHÔNG cần WordPress:** Hệ thống đã được lập trình sẵn toàn bộ:
  * **Trang khách:** Giao diện mua hoa, giỏ hàng, đặt hàng trực tuyến.
  * **Backend (`server.js`):** Xử lý API đặt hàng, kiểm tra đăng nhập, tải ảnh.
  * **Bảng quản trị (`/admin`):** Thêm/sửa/xoá mẫu hoa, cập nhật giá, đổi ảnh đại diện, duyệt và quản lý đơn hàng.
  * **Lưu trữ dữ liệu:** Thư mục `data/` (`products.json`, `orders.json`, `users.json`).

---

## 2. CHUẨN BỊ TRƯỚC KHI LÊN MẠNG
1. **Tên miền (Domain):** Mua tại Tenten, Matbao, PA Vietnam, Cloudflare hoặc Namecheap (VD: `woashebloom.vn` hoặc `woashebloom.com`).
2. **Máy chủ ảo (Cloud VPS):**
   * Cấu hình tối thiểu: 1 CPU, 1GB RAM, 20GB SSD (hệ điều hành **Ubuntu 22.04 LTS** hoặc **Ubuntu 24.04 LTS**).
   * Nhà cung cấp gợi ý: Vietnix, TinoHost, AZDIGI (trong nước, thanh toán VNĐ) hoặc Hetzner, DigitalOcean (quốc tế).
   * Chi phí: khoảng 60.000 – 120.000 đ/tháng.

---

## 3. CÁCH TRIỂN KHAI 1: SỬ DỤNG PM2 + NGINX (KHUYÊN DÙNG)

Đây là chuẩn triển khai ổn định và phổ biến nhất cho ứng dụng Node.js trên Linux VPS.

### Bước 3.1: Kết nối vào VPS qua SSH
Mở Terminal (trên máy tính hoặc PowerShell) và gõ:
```bash
ssh root@<IP_CỦA_VPS>
```

### Bước 3.2: Cài đặt Node.js và các công cụ cần thiết
Chạy lần lượt các lệnh sau trên VPS:
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Node.js LTS (v20+)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx

# Cài đặt PM2 (trình quản lý tiến trình Node.js)
sudo npm install -g pm2
```

### Bước 3.3: Đưa mã nguồn lên VPS
Tạo thư mục chứa dự án:
```bash
mkdir -p /var/www/woashe-bloom
cd /var/www/woashe-bloom
```
* **Cách A (Dùng Git):** Đẩy code lên GitHub (chế độ Private) rồi chạy `git clone <link_repo> .`
* **Cách B (Dùng FileZilla / WinSCP):** Đăng nhập SFTP bằng IP và mật khẩu root của VPS, kéo thả toàn bộ thư mục dự án vào `/var/www/woashe-bloom`.

### Bước 3.4: Chạy Website bằng PM2
Tại thư mục `/var/www/woashe-bloom`:
```bash
# Khởi chạy bằng file cấu hình có sẵn
pm2 start ecosystem.config.js --env production

# Cấu hình PM2 tự động bật lại khi VPS khởi động lại
pm2 save
pm2 startup
```

### Bước 3.5: Cấu hình Nginx làm cổng đón khách (Reverse Proxy)
1. Tạo file cấu hình Nginx:
```bash
sudo nano /etc/nginx/sites-available/woashe-bloom
```
2. Dán nội dung sau vào (thay `yourdomain.com` bằng tên miền thật của bạn):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    client_max_body_size 20M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:9090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
3. Kích hoạt cấu hình và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/woashe-bloom /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Bước 3.6: Cài đặt chứng chỉ SSL miễn phí (HTTPS ổ khoá xanh)
Chạy lệnh Certbot:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
*Nhập email của bạn và chọn đồng ý. Certbot sẽ tự động gia hạn SSL vĩnh viễn.*

---

## 4. CÁCH TRIỂN KHAI 2: DÙNG DOCKER (1 DÒNG LỆNH)

Nếu máy chủ của bạn đã cài sẵn Docker & Docker Compose:
1. Đặt code vào máy chủ.
2. Tại thư mục dự án, chạy:
```bash
docker compose up -d --build
```
Dữ liệu đơn hàng (`data/`) và ảnh mới tải lên (`assets/img/`) đã được gắn vào volumes độc lập, không sợ bị mất khi cập nhật code hoặc restart container.

---

## 5. HƯỚNG DẪN QUẢN TRỊ VÀ BẢO MẬT HÀNG NGÀY

### 5.1. Đăng nhập trang quản trị
* Truy cập: `https://yourdomain.com/admin`
* Tài khoản mặc định: `admin` / Mật khẩu mặc định: `woashe2026@`

### 5.2. Đổi mật khẩu Admin ngay lập tức
* Sau khi đăng nhập, tại thanh điều hướng trên cùng, bấm vào mục **Đổi mật khẩu**.
* Đặt mật khẩu mới dài trên 8 ký tự bao gồm chữ hoa, chữ thường và số để đảm bảo an toàn.

### 5.3. Sao lưu (Backup) dữ liệu định kỳ
Tất cả dữ liệu quan trọng của shop nằm ở hai nơi:
1. Thư mục `data/` (chứa file danh sách hoa, đơn đặt của khách, thông tin admin).
2. Thư mục `assets/img/` (chứa các hình ảnh hoa mới tải lên từ trang admin).

**Cách backup nhanh bằng 1 lệnh trên VPS:**
```bash
tar -czvf backup-$(date +%F).tar.gz /var/www/woashe-bloom/data /var/www/woashe-bloom/assets/img
```
*Tải file `.tar.gz` này về máy tính cá nhân hoặc lưu lên Google Drive mỗi tuần một lần.*
