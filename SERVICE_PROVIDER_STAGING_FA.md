# استقرار TASK 10 فقط در staging اوبونتو

این دستورها فقط سرویس مستقل `hostel2-staging` و مسیر `/opt/hostel2-staging` را هدف می‌گیرند. هیچ دستور تغییر production، ادغام PR یا seed روی production وجود ندارد. مبنای مورد تأیید مالک `a2062b8a9f323beeb2c636617bdda70a562f12a4` است. برای نصب نسخهٔ آزموده‌شده، SHA نهایی در بخش دریافت کد این سند ثبت می‌شود؛ تا ثبت نتیجهٔ موفق و رفع همهٔ شکست‌ها نصب نکنید.

## پیش‌نیاز

staging باید مطابق STAGING_SETUP_FA.md با کاربر مستقل، Node 24، env خصوصی، HTTPS و Basic Auth، noindex، سرویس بکاپ و محافظ egress آماده باشد. دیتابیس production را برای آزمایش کپی نکنید.

اگر staging هنوز وجود ندارد، ابتدا مرحلهٔ ساخت کاربر/مسیر/runtime و سپس env، egress، HTTPS و سرویس مستقل همان سند را آماده کنید. برای دریافت کد اولیه از شاخهٔ این تسک استفاده کنید:

```bash
sudo -u hostel2-staging -H git clone --single-branch \
  --branch codex/10-service-provider-dashboard \
  https://github.com/liiiiiiiit/hostel2.git /opt/hostel2-staging/app
```

برای مسیر موجود دوباره clone نکنید. پیش از ارتقا:

```bash
sudo systemctl show hostel2-staging --no-pager -p User -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl status hostel2-staging-egress --no-pager -l
sudo -u hostel2-staging -H git -C /opt/hostel2-staging/app status --short --branch
sudo ss -ltnp | grep -E ':3001\b|:3002\b'
```

انتظار: کاربر hostel2-staging، برنامه /opt/hostel2-staging/app، env در /etc/hostel2-staging/staging.env، SQLite در /opt/hostel2-staging/data/staging.db، رسانه در /opt/hostel2-staging/data/uploads، بکاپ در /opt/hostel2-staging/backups و پورت 3002. پورت 3001 را تصاحب نکنید. APP_ENV=staging، NODE_ENV=production و NOTIFICATION_DELIVERY=disabled باید برقرار باشند؛ secretهای سرویس خارجی خالی و محافظ خروجی فعال باشد. env کامل، کلیدها و manifest را چاپ نکنید.

برای staging تازه، bootstrap اولیه را فقط با همان روش مستند STAGING_SETUP_FA.md و مسیر خالی انجام دهید. مراحل ارتقای زیر به دیتابیس موجود نیاز دارند. برای عبور از guard هیچ دیتابیسی را حذف نکنید.

## ۱. توقف writerهای staging و بکاپ تأییدشده

هر worker/cron اختصاصی staging را نیز متوقف کنید. سرویس production را دست نزنید.

```bash
sudo systemctl stop hostel2-staging-backup.timer
sudo systemctl stop hostel2-staging-backup.service hostel2-staging.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export DOTENV_CONFIG_QUIET=true
export BACKUP_RETENTION_DAYS=
cd /opt/hostel2-staging/app
test -z "$(git status --porcelain)"
git rev-parse HEAD > /opt/hostel2-staging/backups/qa10-previous-release.txt
REPORT=$(mktemp /opt/hostel2-staging/backups/qa10-preupgrade-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Backup failed");console.log(r.file);' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2-staging/backups/qa10-current-backup.path
SH
```

اگر بکاپ یا verification شکست خورد ادامه ندهید. کلید فعلی بکاپ را خصوصی نگه دارید؛ آن را جایگزین نکنید. کپی سادهٔ فایل SQLite فعال، جایگزین بکاپ WAL-safe پروژه نیست.

## ۲. دریافت کد و build با برنامهٔ خاموش

محافظ خروجی فقط هنگام دانلود Git/npm و با writerهای متوقف موقتاً خاموش می‌شود. trap در پایان یا خطا آن را دوباره روشن می‌کند.

```bash
sudo bash <<'ROOT'
set -euo pipefail
if systemctl is-active --quiet hostel2-staging.service; then exit 1; fi
trap 'systemctl start hostel2-staging-egress.service' EXIT
systemctl stop hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
test -z "$(git status --porcelain)"
git fetch origin refs/heads/codex/10-service-provider-dashboard
git switch --detach TASK10_VERIFIED_SHA
npm ci --include=dev
npm run lint
npm run build
SH
ROOT
```

`TASK10_VERIFIED_SHA` در نسخهٔ نهایی این سند با SHA واقعیِ آزموده‌شده جایگزین می‌شود. تست‌های مخرب و npm test را با env واقعی VPS اجرا نکنید. آزمون‌ها از محیط CI یک‌بارمصرف استفاده می‌کنند.

## ۳. مهاجرت افزایشی با guard بکاپ

```bash
sudo systemctl start hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa10-current-backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
SH
```

انتظار: serviceProviders=true، rentalOwners=true، moderation=true، schemaReady=true، foreignKeyViolations=0 و integrity برابر ok. service-provider-v1 شش جدول و پنج ایندکس اضافه می‌کند؛ رکورد قدیمی را به صاحب حسابی منتسب نمی‌کند. اگر fingerprint، migration یا integrity شکست خورد، سرویس خاموش بماند؛ guard را دور نزنید.

پس از bootstrap و مهاجرت موفق، REQUIRE_MIGRATION_BACKUP=true را در همان env نگه دارید. متغیر محیطی یا dependency جدیدی برای این تسک لازم نیست.

## ۴. شروع و پذیرش

```bash
sudo systemctl start hostel2-staging.service
sudo systemctl start hostel2-staging-backup.timer
sudo systemctl status hostel2-staging --no-pager -l
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3002/api/environment
curl -u staging -I https://test.yerevanhub.ir/fa/
```

باید staging، Basic Auth، HTTPS، نشان محیط آزمایش و noindex برقرار باشند. حساب ساختگی بسازید، با ورود اصلی وارد پنل کسب‌وکار شوید، پیش‌نویس و عکس ذخیره کنید و به صف بفرستید. پیش از انتشار مدیر، لینک عمومی نباید قابل مشاهده باشد. نشان کسب‌وکار فقط با شواهد مدیر ایجاد می‌شود. دو درخواست با رضایت روشن و خاموش بسازید؛ فقط اولی نزد ارائه‌دهنده دیده شود. تغییر وضعیت و پیگیری مشتری را بررسی کنید. پس از تعویض مالک، درخواست قبلی نباید به مالک جدید برسد. تعلیق حساب باید نمایش عمومی و دسترسی آن را متوقف کند. restart باید اطلاعات را حفظ کند.

## دادهٔ آزمایشی اختیاری

فقط در staging مشخص‌شده و با DEMO_TOOLS_ENABLED=true و پوشهٔ خصوصی demo مطابق DEMO_DATA_MANAGER_FA.md:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
npm run demo:seed -- --seed task10-service-businesses
npm run demo:status
npm run db:check
SH
```

نسخهٔ۶ مولد موجود به‌کار می‌رود؛ واردکردن دوبارهٔ همان seed idempotent است. batchهای قدیمی نسخه‌های۱ تا۵ خودکار تغییر نمی‌کنند. manifest رمزهای تصادفی خصوصی است؛ آن را منتشر نکنید. این فرمان یک اکوسیستم ساختگی کامل اضافه می‌کند؛ فقط در صورت نیاز اجرا شود. برای پاک‌سازی انتخابی از فرمان محافظت‌شدهٔ demo:cleanup مستند موجود استفاده کنید، نه SQL عمومی.

## بکاپ و بازگشت

همان بکاپ رمزگذاری‌شده، جدول‌های جدید، شواهد و عکس‌ها را نیز ذخیره می‌کند. محدودیت BACKUP_MAX_BYTES و فضای دیسک را با رشد داده پایش کنید. در شکست migration، تغییرات همان تراکنش rollback می‌شوند؛ DB موجود را پاک نکنید.

بازیابی فقط در مقصد خالی و جداگانه:

```bash
sudo systemctl stop hostel2-staging-backup.timer
sudo systemctl stop hostel2-staging-backup.service hostel2-staging.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa10-current-backup.path)
RECOVERY=$(mktemp -d /opt/hostel2-staging/data/qa10-recovery-XXXXXX)
export RESTORE_DATABASE_URL="file:$RECOVERY/check.db"
export RESTORE_MEDIA_DIRECTORY="$RECOVERY/uploads"
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
node --import tsx scripts/backup.ts restore "$BACKUP_FILE"
printf 'Separate recovery target: %s\n' "$RECOVERY"
SH
```

این مرحله دیتابیس فعلی را overwrite نمی‌کند و سرویس را به recovery متصل نمی‌کند. integrity، مالکیت‌ها، درخواست‌ها، مدارک و عکس‌ها را پیش از تغییر مسیر سرویس بررسی کنید. هر دادهٔ بعد از بکاپ برای reconciliation حفظ شود.

پس از استفاده از TASK 10، بازگرداندن صرف کد به TASK 09 امن نیست: کد قدیمی تعلیق ارائه‌دهنده، مالکیت خدمات، رضایت مشتری و الزام شواهد تأیید را نمی‌فهمد. مسیر ترجیحی اصلاح رو به جلو است. هیچ down-migration یا db:rollback برای حذف جدول‌های این قابلیت اجرا نکنید. در صورت ضرورت بازگشت، نسخهٔ قبلی از qa10-previous-release.txt و بکاپ هم‌زمان آن باید در مقصد و سرویس جداگانه بررسی شوند؛ فعال‌کردن آن روی مسیر زنده نیازمند بازبینی داده‌های جدید و تصمیم مالک است.
