# آزمایش موقت روی Ubuntu VPS با IP و HTTP

این روش برای نصب آزمایشی است. HTTP رمز و اطلاعات را رمزگذاری نمی‌کند؛ فقط حساب اختصاصی آزمایش و دادهٔ ساختگی استفاده کنید. نصب تازه پایگاه‌دادهٔ تازه می‌سازد؛ اطلاعات سایت قبلی خودکار منتقل نمی‌شود. این دستورها روی VPS کاربر اجرا نشده‌اند.

## پیش‌نیاز

Ubuntu 24.04، Node.js 24، npm، Git و Nginx نصب باشند. کد شاخهٔ `codex/property-management-workflow` در `/opt/yerevanhub/app` و کاربر سرویس `hostelhub` باشد. فایل‌های ساخته‌شده با `npm run build` و API با `npm start` اجرا می‌شوند؛ `npm run preview` به‌تنهایی API ندارد.

## تنظیم محیط

در `/opt/yerevanhub/app/.env` موارد زیر را با IP، ایمیل آزمایشی و رمز اختصاصی خودتان قرار دهید:

```env
NODE_ENV=production
PORT=3000
DEMO_MODE=false
APP_URL=http://YOUR_SERVER_IP
HTTP_TEST_MODE=true
TRUST_PROXY=loopback
DATABASE_URL=file:/var/lib/yerevanhub/hostel.db
MEDIA_STORAGE=local
MEDIA_DIRECTORY=/var/lib/yerevanhub/uploads
ADMIN_EMAIL=YOUR_TEST_ADMIN_EMAIL
ADMIN_PASSWORD=YOUR_UNIQUE_TEST_PASSWORD
```

رمز اولیه حداقل ۱۲ کاراکتر باشد. فایل `.env` با مجوز `600` و مالک سرویس نگهداری شود. `HTTP_TEST_MODE` کوکی ورود را برای HTTP قابل استفاده می‌کند؛ به‌صورت پیش‌فرض غیرفعال است. صرف تغییر `APP_URL` باعث غیرفعال‌شدن کوکی امن نمی‌شود. این حالت در Vercel مجاز نیست.

پوشهٔ پایگاه‌داده و رسانه باید قبل از شروع ساخته و در اختیار کاربر سرویس باشند:

```bash
sudo install -d -m 700 -o hostelhub -g hostelhub /var/lib/yerevanhub
sudo install -d -m 700 -o hostelhub -g hostelhub /var/lib/yerevanhub/uploads
```

## سرویس برنامه

فایل `/etc/systemd/system/yerevanhub.service`:

```ini
[Unit]
Description=YEREVANHUB website
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=hostelhub
Group=hostelhub
WorkingDirectory=/opt/yerevanhub/app
EnvironmentFile=/opt/yerevanhub/app/.env
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now yerevanhub
sudo systemctl status yerevanhub --no-pager
```

## Nginx

فایل `/etc/nginx/sites-available/yerevanhub` را با IP واقعی پر کنید:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;
    client_max_body_size 5m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

```bash
sudo ln -sfn /etc/nginx/sites-available/yerevanhub /etc/nginx/sites-enabled/yerevanhub
sudo nginx -t
sudo systemctl reload nginx
```

پورت SSH را پیش از فعال‌کردن فایروال باز نگه دارید. پورت ۸۰ در فایروال Ubuntu و پنل شرکت VPS باز باشد؛ ۳۰۰۰ را عمومی باز نکنید. `TRUST_PROXY=loopback` فقط برای Nginx محلی است و Nginx باید هدر `X-Forwarded-For` را مطابق تنظیم بالا بازنویسی کند.

سایت را با `http://YOUR_SERVER_IP` باز کنید؛ با ایمیل و رمز تعیین‌شده در `.env` وارد شوید. نشست پس از تازه‌سازی باید باقی بماند. حساب‌های نمونهٔ توسعه فعال نیستند. بعد از ورود موفق، `ADMIN_PASSWORD` را از فایل حذف و سرویس را restart کنید؛ حساب ساخته‌شده حذف نمی‌شود.

Worker برای انقضا و یادآوری همچنان لازم است؛ تنظیم آن در راهنمای عملیات آمده است. سرویس worker نیز باید `NODE_ENV=production` داشته باشد. بازیابی رمز و تأیید ایمیل تا تنظیم HTTPS و فرستندهٔ واقعی قابل اتکا نیستند؛ کد برای لینک حساب، APP_URL دارای HTTPS می‌خواهد.

## اضافه‌کردن دامنه و HTTPS در آینده

1. رکورد A دامنه را به IP سرور وصل کنید.
2. `server_name` را به دامنه تغییر دهید؛ Nginx را بررسی و reload کنید.
3. پورت ۴۴۳ را باز و با Certbot گواهی دریافت کنید.
4. `APP_URL=https://YOUR_DOMAIN` قرار دهید و `HTTP_TEST_MODE` را از `.env` حذف کنید.
5. سایت و worker را restart کنید؛ دوباره وارد حساب شوید. کوکی امن HTTPS دوباره فعال می‌شود.
6. داده و عکس‌ها روی همان مسیر می‌مانند؛ پایگاه‌داده را حذف یا دوباره ایجاد نکنید.

## عیب‌یابی

```bash
sudo journalctl -u yerevanhub -n 80 --no-pager
sudo nginx -t
curl -I http://127.0.0.1:3000/
```

اگر ورود موفق نشان داده می‌شود ولی حساب باز نمی‌ماند، `HTTP_TEST_MODE=true`، آدرس دقیق APP_URL و راه‌اندازی مجدد سرویس را بررسی کنید. تغییر ADMIN_PASSWORD رمز مدیر موجود را عوض نمی‌کند.
