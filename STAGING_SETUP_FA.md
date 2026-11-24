# راه‌اندازی مستقل staging برای YEREVANHUB

این راهنما برای **ایجاد محیط جدید** است؛ هیچ دستور این سند در VPS اجرا نشده است. تغییرات پروژه فقط در شاخهٔ `codex/01-staging-environment` آماده شده‌اند. مبنا: شاخهٔ پیش‌فرض واقعی `codex/fix-menu-desktop-site-20261124`، کامیت `fe1a6b3f7e55f71e51dfb23a694248826b434aa1`، بررسی‌شده در ۲۴ نوامبر ۲۰۲۶.

## معماری و تفاوت با تولید

پروژه React/TypeScript/Vite/Tailwind و Express/Node 24 با SQLite/libSQL است؛ ORM ندارد. `npm start` بیلد `dist` را سرو می‌کند. دیتابیس با migrationهای افزایشی در شروع برنامه آماده می‌شود؛ نشست‌ها در جدول `sessions` با digest توکن ذخیره می‌شوند و رمزها با الگوی scrypt موجود هش می‌شوند. فایل‌ها از مسیر `MEDIA_DIRECTORY` سرو می‌شوند. worker موجود، outbox اعلان و کارهای زمان‌بندی را پردازش می‌کند. در این مرحله دادهٔ واقعی تولید کپی نمی‌شود و fixture جدید وارد staging واقعی نمی‌کنیم؛ راه‌اندازی فعلی برنامه ممکن است محتوای نمونهٔ پیش‌فرض را به‌صورت پیش‌نویس ایجاد کند.

| مورد | staging جدید | تولید طبق لاگ‌های قبلی؛ روی VPS دوباره بررسی شود |
| --- | --- | --- |
| دامنه | `test.yerevanhub.ir` | `yerevanhub.ir` |
| کاربر لینوکس | `hostel2-staging` | `hostel2` |
| برنامه | `/opt/hostel2-staging/app` | `/opt/hostel2/app` |
| Node | `/opt/hostel2-staging/node` | `/opt/hostel2/node` |
| SQLite | `/opt/hostel2-staging/data/staging.db` | `/var/lib/hostel2/hostel.db` |
| آپلود | `/opt/hostel2-staging/data/uploads` | مسیر فعلی تولید بدون تغییر |
| سرویس | `hostel2-staging.service` | `hostel2.service` |
| پورت | **127.0.0.1:3002** | قبلاً **3001** |
| تنظیمات | `/etc/hostel2-staging/staging.env` | `.env` فعلی تولید، بدون تغییر |
| بکاپ | `/opt/hostel2-staging/backups` | بکاپ تولید، بدون تغییر |

پورت پیشنهادی ۳۰۰۱ برای staging مناسب نیست؛ طبق لاگ‌های قبلی تولید روی آن فعال بود. این بسته عمداً ۳۰۰۲ را الزام می‌کند. اگر ۳۰۰۲ هم اشغال است، ادامه ندهید؛ تغییر پورت باید هم‌زمان در اعتبارسنجی برنامه، قالب تنظیمات و Nginx بررسی شود.

SQLite نام کاربری/رمز دیتابیس جدا ندارد؛ جداسازی آن با فایل مستقل، مالک لینوکس، مجوز فایل و sandbox سرویس انجام می‌شود. `DATABASE_AUTH_TOKEN` در staging خالی و دیتابیس remote ممنوع است. **هیچ فایل `.env`، نشست، بکاپ، رمز ادمین، credential سرویس خارجی یا فایل دیتابیس تولید را به staging کپی نکنید.**

## کنترل‌های اضافه‌شده به برنامه

- `APP_ENV`: یکی از `development`، `testing`، `staging` و `production`. staging با `NODE_ENV=production` اجرا می‌شود؛ شناسایی محیط از APP_ENV است. نصب‌های قدیمی بدون APP_ENV رفتار قبلی NODE_ENV را حفظ می‌کنند.
- در staging مسیرهای canonical دیتابیس/مدیا/بکاپ الزام می‌شوند؛ مسیر تولید، remote DB، symlink خروجی، hard link دیتابیس، origin و پورت اشتباه، demo mode و credentialهای خارجی شناخته‌شده رد می‌شوند.
- دیتابیس جدید staging نشان محیط دارد. دیتابیس موجودِ بدون نشان یا متعلق به محیط دیگر پذیرفته نمی‌شود؛ این محافظ عمداً جلوی استفاده از کپی تولید را می‌گیرد. اطلاعات دیتابیس تولید تغییر نمی‌کند.
- کوکی staging: `__Host-yh_staging_session`، Secure/HttpOnly/SameSite=Lax و host-only، با نام متفاوت و نشست‌های مستقل. نام کوکی تولید تغییر نمی‌کند.
- `NOTIFICATION_DELIVERY=disabled`: ارسال outbox در staging/testing بدون تماس شبکه و بدون ثبت موفقیت جعلی متوقف می‌شود؛ حتی اگر بعداً کلید واقعی در محیط قرار بگیرد. داشتن کلید واقعی در تنظیمات staging نیز خطای راه‌اندازی است. ترجمهٔ آنلاین و ذخیره‌سازی blob در staging غیرفعال‌اند؛ عبارت‌نامهٔ محلی در دسترس می‌ماند. این پروژه اکنون ارسال SMS یا پرداخت واقعی پیاده‌سازی‌شده ندارد؛ افزودن آیندهٔ آن‌ها باید این سیاست را رعایت کند.
- نشان ثابت `STAGING · TEST ENVIRONMENT` فقط در HTML محیط staging درج می‌شود. هدر `X-Robots-Tag`، meta noindex، robots با Disallow و مسدودبودن sitemap از ایندکس جلوگیری می‌کنند؛ ناوبری React نیز noindex را حفظ می‌کند. این‌ها جایگزین احراز هویت نیستند.
- Nginx تمام صفحات و API را با Basic Auth و HTTPS محافظت می‌کند؛ فقط robots عمومیِ بدون اطلاعات و مسیر ACME استثنا هستند. Basic Auth جدا از حساب ادمین داخل برنامه است.
- سرویس کاربر staging به فایل‌های تولید دسترسی ندارد؛ فایروال مستقل مبتنی بر UID اتصال **جدید خروجی** آن را مسدود می‌کند، حتی به localhost تولید. پاسخ اتصال ورودی Nginx مجاز می‌ماند. هیچ rule عمومی یا rule تولید flush نمی‌شود. تا این سرویس حفاظتی موفق نشود، برنامه بالا نمی‌آید.
- CSP آزمایشی بارگذاری map iframe، عکس و فونت از میزبان خارجی و fetch خارجی مرورگر را مسدود می‌کند. بنابراین نقشه/عکس خارجی ممکن است در staging نمایش داده نشود؛ از آپلود محلی و دادهٔ ساختگی استفاده کنید. لینک‌های تماس را با مخاطب واقعی آزمایش نکنید.

## ۱. پیش‌نیاز و بررسی فقط‌خواندنی

این مراحل برای Ubuntu 22.04/24.04 با systemd، Nginx و Node 24 هستند. ابتدا PR را بررسی کنید. دستورات نصب فقط محیط staging را آماده می‌کنند؛ سرویس تولید را stop/restart نکنید و فایل vhost تولید را ویرایش نکنید.

```bash
sudo systemctl show hostel2 --no-pager -p User -p WorkingDirectory -p ExecStart
sudo ss -ltnp | grep -E ':(3001|3002)\b' || true
sudo nginx -t
sudo systemctl list-unit-files 'hostel2-staging*' --no-pager
ls -ld /opt/hostel2-staging /etc/hostel2-staging 2>/dev/null
```

اگر قبلاً staging با این نام‌ها وجود دارد، مرحلهٔ ساخت اولیه را اجرا نکنید؛ از بخش به‌روزرسانی استفاده کنید. رکورد DNS مستقل `test` را به IP VPS وصل کنید. صدور گواهی به دسترسی پورت ۸۰/۴۴۳ و DNS درست نیاز دارد. پورت ۳۰۰۲ را در فایروال عمومی باز نکنید. تنظیمات فعلی Cloudflare/فایروال تولید را بدون بررسی تغییر ندهید.

```bash
sudo apt-get update
sudo apt-get install -y git apache2-utils certbot python3 iptables
sudo useradd --system --user-group --home-dir /opt/hostel2-staging --shell /usr/sbin/nologin hostel2-staging
sudo install -d -o hostel2-staging -g hostel2-staging -m 750 /opt/hostel2-staging
sudo install -d -o hostel2-staging -g hostel2-staging -m 700 \
  /opt/hostel2-staging/data /opt/hostel2-staging/data/uploads \
  /opt/hostel2-staging/backups /opt/hostel2-staging/logs
sudo -u hostel2-staging bash -c 'umask 077; touch /opt/hostel2-staging/logs/app.log /opt/hostel2-staging/logs/error.log'
```

Node 24 باید **مستقل و قابل اجرای staging** باشد. اگر مسیر قبلی واقعاً فقط توزیع Node است، می‌توان همان runtime نصب‌شده را بدون تغییر منبع کپی کرد؛ این دستور پوشهٔ app یا دیتابیس تولید را کپی نمی‌کند:

```bash
sudo test -x /opt/hostel2/node/bin/node
sudo /opt/hostel2/node/bin/node --version
sudo cp -a /opt/hostel2/node /opt/hostel2-staging/node
sudo chown -R root:root /opt/hostel2-staging/node
sudo chmod -R go-w /opt/hostel2-staging/node
sudo -u hostel2-staging /opt/hostel2-staging/node/bin/node --version
```

اگر این runtime وجود ندارد یا نسخهٔ ۲۴ نیست، ابتدا توزیع رسمی و تأییدشدهٔ Node 24 را در مسیر مستقل نصب کنید. از لینک به runtime تولید استفاده نکنید، چون sandbox مسیر تولید را مسدود می‌کند.

## ۲. دریافت کد و بیلد، پیش از فعال‌کردن فایروال خروجی

```bash
sudo -u hostel2-staging -H git clone --single-branch \
  --branch codex/01-staging-environment \
  https://github.com/liiiiiiiit/hostel2.git /opt/hostel2-staging/app

sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
git log -1 --oneline
npm ci --include=dev
npm run lint
npm run build
SH
```

کامیت نمایش‌داده‌شده را با PR تأییدشده مقایسه و ثبت کنید. این نصب از branch جدید استفاده می‌کند، نه نسخهٔ در حال اجرای تولید. تست‌های دارای fixture را در CI اجرا کنید؛ `npm test` را با `.env` واقعی staging/تولید اجرا نکنید. ساخت اول قبل از ایجاد `.env` انجام می‌شود.

## ۳. ساخت اعتبارنامه‌های مستقل

مولد زیر فایل جدید می‌سازد و اگر فایل وجود داشته باشد آن را بازنویسی نمی‌کند. رمز ادمین و کلید بکاپ با randomness امن تولید می‌شوند و چاپ نمی‌شوند:

```bash
sudo python3 /opt/hostel2-staging/app/ops/staging/create-env.py
sudo ln -s /etc/hostel2-staging/staging.env /opt/hostel2-staging/app/.env
sudoedit /etc/hostel2-staging/staging.env
```

رمز ادمین تولیدشده برای حساب `admin@test.yerevanhub.ir` را در password manager مستقل نگه دارید. کلید `BACKUP_ENCRYPTION_KEY` را در جای امن خارج از VPS/پوشهٔ بکاپ هم نگه دارید؛ بدون آن بکاپ رمزگذاری‌شده قابل بازیابی نیست. رمزها را در Git، عکس ترمینال، پیام یا تیکت قرار ندهید. پس از ورود موفق اول می‌توانید مقدار ADMIN_PASSWORD را از فایل حذف کنید؛ حساب ذخیره‌شده و hash آن حفظ می‌شود. سایر تنظیمات ایزوله را حذف نکنید.

رمز ورود اولیهٔ Nginx **جدا** است؛ htpasswd تعاملی رمز را می‌پرسد:

```bash
sudo htpasswd -cB /etc/nginx/hostel2-staging.htpasswd staging
sudo chown root:www-data /etc/nginx/hostel2-staging.htpasswd
sudo chmod 640 /etc/nginx/hostel2-staging.htpasswd
```

گزینهٔ `-c` فقط برای ساخت اولیه است؛ برای افزودن کاربر بعدی حذفش کنید تا فایل قبلی پاک نشود.

## ۴. سرویس staging، حفاظت خروجی و بکاپ

```bash
sudo install -d -m 755 /usr/local/lib/hostel2-staging
sudo install -m 755 /opt/hostel2-staging/app/ops/staging/egress.sh /usr/local/lib/hostel2-staging/egress.sh
sudo install -m 644 /opt/hostel2-staging/app/ops/staging/hostel2-staging*.service /etc/systemd/system/
sudo install -m 644 /opt/hostel2-staging/app/ops/staging/hostel2-staging-backup.timer /etc/systemd/system/
sudo install -m 644 /opt/hostel2-staging/app/ops/staging/logrotate.conf /etc/logrotate.d/hostel2-staging
sudo systemctl daemon-reload
sudo systemd-analyze verify /etc/systemd/system/hostel2-staging*.service /etc/systemd/system/hostel2-staging-backup.timer
sudo systemctl enable --now hostel2-staging-egress.service
sudo systemctl enable --now hostel2-staging.service
sudo systemctl enable --now hostel2-staging-backup.timer
```

سرویس تولید در این دستورات وجود ندارد. برنامه migration را روی فایل staging جدید اعمال و ادمین مستقل می‌سازد. سرویس ارسال اعلان یا worker دائمی برای staging فعال نمی‌شود؛ حتی اجرای دستی worker هم سیاست عدم ارسال را رعایت می‌کند. قوانین UID پس از ریبوت از طریق سرویس egress دوباره اعمال می‌شوند. اگر kernel/container شما iptables owner/conntrack یا IPv6 filtering را پشتیبانی نکند، برنامه باید خاموش بماند؛ این وابستگی را حذف نکنید تا فقط راه بیفتد.

## ۵. HTTPS و vhost مستقل Nginx

فایل‌های `hostel2-staging` نباید قبلاً وجود داشته باشند. ویرایش فایل تولید و اجرای `certbot --nginx` لازم نیست. ابتدا فقط vhost مرحلهٔ صدور گواهی:

```bash
sudo install -d -m 755 /var/lib/hostel2-staging-acme
sudo install -m 644 /opt/hostel2-staging/app/ops/staging/nginx-http.conf /etc/nginx/sites-available/hostel2-staging
sudo ln -s /etc/nginx/sites-available/hostel2-staging /etc/nginx/sites-enabled/hostel2-staging
sudo nginx -t && sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/lib/hostel2-staging-acme -d test.yerevanhub.ir
```

سپس vhost HTTPS را جایگزین **همین فایل staging** کنید:

```bash
sudo install -m 644 /opt/hostel2-staging/app/ops/staging/nginx-https.conf /etc/nginx/sites-available/hostel2-staging
sudo nginx -t && sudo systemctl reload nginx
sudo install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
sudo install -m 755 /opt/hostel2-staging/app/ops/staging/cert-renew-hook.sh /etc/letsencrypt/renewal-hooks/deploy/hostel2-staging
sudo certbot renew --dry-run --cert-name test.yerevanhub.ir
```

Nginx مشترک برای فعال‌شدن vhost جدید reload می‌شود؛ فایل تولید تغییر نمی‌کند. اگر `nginx -t` خطا داد، reload نکنید. برای renewal باید reload پس از تمدید موفق تنظیم باشد؛ از hook موجود بررسی‌شده استفاده کنید یا یک deploy-hook جدا برای همین گواهی اضافه کنید که فقط پس از `nginx -t` موفق Nginx را reload کند. هیچ‌گاه Basic Auth را برای `/api/` یا فایل‌های JavaScript غیرفعال نکنید.

## ۶. بررسی راه‌اندازی

```bash
sudo systemctl status hostel2-staging hostel2-staging-egress --no-pager -l
sudo ss -ltnp | grep ':3002'
sudo tail -n 60 /opt/hostel2-staging/logs/error.log
sudo tail -n 30 /opt/hostel2-staging/logs/app.log
curl -fsS http://127.0.0.1:3002/api/environment
curl -I https://test.yerevanhub.ir/fa/services
curl -u staging -I https://test.yerevanhub.ir/fa/services
curl -fsS https://test.yerevanhub.ir/robots.txt
sudo systemctl start hostel2-staging-backup.service
sudo systemctl status hostel2-staging-backup.service --no-pager -l
sudo ls -lh /opt/hostel2-staging/backups
```

انتظار: listener فقط 127.0.0.1، نام محیط staging، پاسخ بدون رمز 401، پاسخ با رمز 200، هدر noindex، robots با `Disallow: /` و فایل بکاپ مستقل. curl با `-u staging` رمز را تعاملی می‌پرسد؛ رمز را در خط فرمان ننویسید. در مرورگر ابتدا Basic Auth و سپس ورود ادمین برنامه لازم است. نشان STAGING باید همیشه دیده شود.

بررسی کنترل خروجی (باید شکست اتصال باشد، نه پاسخ HTTP):

```bash
sudo -u hostel2-staging curl --max-time 3 http://127.0.0.1:3001/ -o /dev/null
sudo -u hostel2-staging curl --max-time 3 https://example.com/ -o /dev/null
sudo iptables -C OUTPUT -m owner --uid-owner "$(id -u hostel2-staging)" -j YH_STAGING_EGRESS
sudo ip6tables -C OUTPUT -m owner --uid-owner "$(id -u hostel2-staging)" -j YH_STAGING_EGRESS
```

تست اول نباید به سرویس تولید برسد؛ rule قبل از routing اتصال جدید را رد می‌کند. درخواست بدون credential و غیرتغییردهنده است. برای دیدن مرز فایل سرویس، `InaccessiblePaths` را با `systemctl cat hostel2-staging` بررسی کنید؛ کاربر سرویس production متفاوت است. برای health دیتابیس:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -e
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
npm run db:check
SH
```

یک رکورد آزمایشی **فقط در staging** بسازید؛ با refresh، خروج/ورود و `sudo systemctl restart hostel2-staging` ماندگاری‌اش را بررسی کنید. در زمان مناسب پس از بررسی enabled بودن سرویس‌ها، reboot کنترل‌شدهٔ VPS را جداگانه برنامه‌ریزی کنید؛ این راهنما reboot خودکار انجام نمی‌دهد. داده، uploads و env بیرون از app/dist هستند و با rebuild حذف نمی‌شوند.

## ۷. به‌روزرسانی staging و rollback بدون حذف داده

فایروال UID، دانلود npm/git را هم مسدود می‌کند. فقط در پنجرهٔ نگهداری که برنامه و timer متوقف‌اند، برای کاربر deploy دسترسی شبکه را موقتاً آزاد کنید. credential واقعی هیچ‌وقت در env staging وجود ندارد.

1. کامیت فعلی را با `git -C /opt/hostel2-staging/app rev-parse HEAD` ثبت کنید. timer بکاپ را stop کنید، برنامه را stop کنید و بکاپ رمزگذاری‌شدهٔ آفلاین بگیرید:

```bash
sudo systemctl stop hostel2-staging-backup.timer
sudo systemctl stop hostel2-staging.service
sudo systemctl start hostel2-staging-backup.service
```

2. موفقیت بکاپ را بررسی و کلید را جدا نگه دارید. سپس `sudo systemctl stop hostel2-staging-egress.service`؛ هیچ برنامه یا worker staging در این بازه اجرا نشود.
3. با کاربر hostel2-staging در پوشهٔ **staging app**، `git status` را بررسی کنید، کامیت بررسی‌شده را fetch و checkout کنید و `npm ci --include=dev`، `npm run lint` و `npm run build` اجرا کنید. اگر تغییر محلی وجود دارد، آن را بررسی کنید؛ `git reset --hard` یا `git clean` اجرا نکنید.
4. `sudo systemctl start hostel2-staging-egress.service`؛ با همان کاربر و PATH مستقل `npm run db:migrate` و `npm run db:check` اجرا کنید. سپس `sudo systemctl start hostel2-staging.service hostel2-staging-backup.timer` و health/HTTPS/رکورد قبلی را بررسی کنید. اگر در نصب خطا رخ داد، حفاظت خروجی را دوباره start کنید و برنامه را تا تصمیم بازیابی روشن نکنید.

برای rollback کد فقط همین سرویس staging را stop، یک بکاپ جدید بگیرید، به **کامیت سازگار قبلی staging** برگردید، وابستگی همان lockfile را نصب و rebuild کنید. دیتابیس فعلی را نگه دارید؛ migration معکوس یا جایگزینی بکاپ قدیمی روی درخواست‌های جدید انجام ندهید. نسخهٔ قدیمی‌تر از محافظ APP_ENV را با دیتابیس staging جدید اجرا نکنید؛ نشان محیط و کنترل‌های شبکه باید حفظ شوند.

اگر بازیابی دیتابیس لازم شد، ابتدا بکاپ را در هدف **جدا و خالی** مانند `/opt/hostel2-staging/data/recovery/check.db` و مدیای جدا بازیابی کنید. متغیرهای `RESTORE_DATABASE_URL` و `RESTORE_MEDIA_DIRECTORY` فقط زیر data staging و متفاوت از فایل/مدیای جاری مجازند؛ `RESTORE_DATABASE_AUTH_TOKEN` خالی باشد. ابزار موجود از overwrite دیتابیس موجود امتناع می‌کند. پس از کنترل integrity، تعلق به محیط staging و تطبیق رکوردهای پس از بکاپ، تعویض هدف اصلی فقط در یک برنامهٔ بازیابی صریح و آفلاین انجام شود. بکاپ تولید در این جریان پذیرفته نیست. پاک‌کردن staging.db برای رفع خطای migration راه‌حل نیست.

برای جمع‌کردن staging: سرویس/backup timer را disable و stop کنید، فقط symlink vhost staging را از sites-enabled حذف و پس از nginx -t موفق reload کنید. سپس حفاظت خروجی را stop کنید. داده، env و بکاپ را برای بازیابی نگه دارید. هیچ فایل یا سرویس تولید حذف نشود.

## عیب‌یابی

- **502:** وضعیت سرویس staging و فایل error.log، سپس listener ۳۰۰۲ و upstream vhost را بررسی کنید. به سرویس تولید دست نزنید.
- **Refusing an unmarked isolated database:** احتمال مسیر اشتباه یا کپی دیتابیس است؛ توقف و بررسی، نه حذف/mark کردن دستی فایل موجود.
- **Remove external credentials:** credential کپی‌شده را از env staging حذف کنید. کلید تولید را در خروجی خطا/تیکت چاپ نکنید.
- **ناموفق بودن egress.service:** پشتیبانی iptables/ip6tables/owner/conntrack و UID مستقل را بررسی کنید؛ محافظ را دور نزنید.
- **npm/git شبکه ندارد:** فایروال staging فعال است. فقط با برنامه/worker/timer خاموش و در پنجرهٔ نگهداری موقتاً stop کنید و قبل از اجرای برنامه دوباره start کنید.
- **401:** رمز Basic Auth با رمز ادمین برنامه متفاوت است.
- **ورود ادمین کار نمی‌کند:** HTTPS، cookie staging، ADMIN_EMAIL زیر test.yerevanhub.ir و hash حساب staging را بررسی کنید؛ حساب تولید به این محیط منتقل نشده است.
- **نقشه یا تصویر خارجی لود نمی‌شود:** محدودیت عمدی CSP/شبکه staging است؛ عکس محلی یا fixture استفاده کنید.
- **بکاپ رمزگشایی نمی‌شود:** کلید مستقل اولیه لازم است؛ تولید کلید جدید، بکاپ قبلی را باز نمی‌کند.

## تست‌ها و حدود اعتبارسنجی

`npm run test:isolation` با `APP_ENV=testing` اجرا می‌شود؛ تست‌های قدیمی در `npm test` سازگاری رفتار قبلی خود را حفظ می‌کنند. `server/environment.test.ts` محیط، config، URI/path، symlink، نشان دیتابیس و restart، حفظ credential، cookie namespace، عدم ارسال با credential تصادفی، HTML و ruleهای mock فایروال را بررسی می‌کند. تست HTTP اختصاصی `scripts/staging-smoke.mjs` فقط در runner موقت GitHub Actions اجازهٔ اجرا دارد؛ روی VPS اجرا نکنید. این تست، برنامهٔ staging واقعی با مسیرهای ثابت، Nginx با HTTPS گواهی self-signed محلی و Basic Auth، ادمین، cookie، ثبت رکورد و آپلود واقعی، rebuild و restart، worker، بکاپ رمزگذاری‌شده و بازیابی در هدف جدا و db:check را بررسی می‌کند. CI از گواهی Let's Encrypt یا شبکهٔ واقعی VPS استفاده نمی‌کند.

نتایج دقیق اجرای این شاخه در توضیح PR ثبت می‌شود. صحت DNS، گواهی عمومی، ruleهای kernel، مجوز UID و restart خودکار پس از reboot باید هنگام نصب واقعی با دستورات بالا تأیید شود. محیط فعلی sudo/Nginx نصب‌شده و systemd فعالِ VPS ندارد؛ اجرای واقعی unit و قوانین فایروال در اینجا ادعا نمی‌شود. هیچ اتصال یا تغییر روی دیتابیس و سرویس تولید انجام نشده است.
