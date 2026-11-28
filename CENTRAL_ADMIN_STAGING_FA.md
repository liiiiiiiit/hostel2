# استقرار TASK 11 فقط در staging اوبونتو

این دستورها فقط سرویس مستقل `hostel2-staging` و مسیر `/opt/hostel2-staging` را هدف می‌گیرند. هیچ دستور تغییر production، ادغام PR یا seed روی production وجود ندارد. مبنای مورد تأیید مالک `e172386ad60a0fcae1b9d4313bfd894ef3312544` است. نسخهٔ آزموده‌شده برای نصب `fe37a2c28a6b3cc73c983c435a0f078a1b0fb4db` است. هر هشت job این نسخه موفق شدند؛ نتیجهٔ اجرای واقعی و محدودیت‌ها در CENTRAL_ADMIN_TEST_RESULTS.md ثبت شده است. تنها پس از موفقیت همان نسخه و بازبینی مالک استقرار staging انجام شود.

## پیش‌نیاز

staging باید مطابق STAGING_SETUP_FA.md با کاربر مستقل، Node 24، env خصوصی، HTTPS و Basic Auth، noindex، سرویس بکاپ و محافظ egress آماده باشد. دیتابیس production را برای آزمایش کپی نکنید.

اگر staging هنوز وجود ندارد، ابتدا مرحلهٔ ساخت کاربر/مسیر/runtime و سپس env، egress، HTTPS و سرویس مستقل همان سند را آماده کنید. برای دریافت کد اولیه از شاخهٔ این تسک استفاده کنید:

```bash
sudo -u hostel2-staging -H git clone --single-branch \
  --branch codex/11-central-admin-dashboard \
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
git rev-parse HEAD > /opt/hostel2-staging/backups/qa11-previous-release.txt
REPORT=$(mktemp /opt/hostel2-staging/backups/qa11-preupgrade-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Backup failed");console.log(r.file);' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2-staging/backups/qa11-current-backup.path
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
git fetch origin refs/heads/codex/11-central-admin-dashboard
git switch --detach fe37a2c28a6b3cc73c983c435a0f078a1b0fb4db
npm ci --include=dev
npm run lint
npm run build
SH
ROOT
```

تست‌های مخرب و npm test را با env واقعی VPS اجرا نکنید. آزمون‌ها از محیط CI یک‌بارمصرف استفاده می‌کنند.

## ۳. مهاجرت افزایشی با guard بکاپ

```bash
sudo systemctl start hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa11-current-backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
SH
```

انتظار: centralAdmin=true، serviceProviders=true، rentalOwners=true، moderation=true، schemaReady=true، foreignKeyViolations=0 و integrity برابر ok. مهاجرت central-admin-v1 سه جدول و سه ایندکس اضافه می‌کند؛ داده‌های قبلی تغییر نمی‌کنند. در شکست fingerprint، migration یا integrity سرویس خاموش بماند؛ guard را دور نزنید.

پس از bootstrap و مهاجرت موفق، REQUIRE_MIGRATION_BACKUP=true را در همان env نگه دارید. متغیر محیطی یا dependency جدیدی برای این تسک لازم نیست.

## ۴. شروع و پذیرش

```bash
sudo systemctl start hostel2-staging.service
sudo systemctl start hostel2-staging-backup.timer
sudo systemctl status hostel2-staging --no-pager -l
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3002/api/environment
curl -u staging -I https://test.yerevanhub.ir/fa/
```

باید staging، Basic Auth، HTTPS، نشان محیط آزمایش و noindex برقرار باشند. با حساب مدیر ساختگی وارد شوید؛ شمار فهرست‌ها و نمای کلی را تطبیق دهید. جست‌وجو/صفحه‌بندی، خروجی کمینه، پیش‌نمایش ورود دسته‌بندی، آرشیو و بازگشت به صف، یادداشت و گزارش خصوصی، سلامت و تنظیمات را امتحان کنید. کاربر عادی و ارائه‌دهنده نباید به endpointهای مرکزی دسترسی داشته باشند. پس از restart یادداشت، رویداد و دسته‌بندی باید باقی بمانند. حذف رسانه به worker اختصاصی staging نیاز دارد؛ زمان‌بندی موجود را حفظ کنید.

## دادهٔ آزمایشی اختیاری

فقط در staging مشخص‌شده و با DEMO_TOOLS_ENABLED=true و پوشهٔ خصوصی demo مطابق DEMO_DATA_MANAGER_FA.md:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
npm run demo:seed -- --seed task11-central-admin
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
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa11-current-backup.path)
RECOVERY=$(mktemp -d /opt/hostel2-staging/data/qa11-recovery-XXXXXX)
export RESTORE_DATABASE_URL="file:$RECOVERY/check.db"
export RESTORE_MEDIA_DIRECTORY="$RECOVERY/uploads"
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
node --import tsx scripts/backup.ts restore "$BACKUP_FILE"
printf 'Separate recovery target: %s\n' "$RECOVERY"
SH
```

این مرحله دیتابیس فعلی را overwrite نمی‌کند و سرویس را به recovery متصل نمی‌کند. integrity، مالکیت‌ها، درخواست‌ها، مدارک و عکس‌ها را پیش از تغییر مسیر سرویس بررسی کنید. هر دادهٔ بعد از بکاپ برای reconciliation حفظ شود.

این مهاجرت افزایشی است؛ کد پایهٔ TASK 10 جدول‌های تازه را حذف نمی‌کند، اما یادداشت‌ها/گزارش‌ها، اعلان داخلی، نظارت مرکزی و تأیید خروجی جدید را نمایش نمی‌دهد. مسیر ترجیحی اصلاح رو به جلو است. هیچ down-migration یا db:rollback برای حذف جدول‌ها اجرا نکنید. برای بازگشت آزمایشی کد، writerهای staging را متوقف، بکاپ جدید ثبت، نسخهٔ qa11-previous-release.txt را در checkout جدا build و روی کپی بازیابی‌شده آزمایش کنید. پیش از تغییر مسیر سرویس، داده‌های پس از بکاپ و تاریخچهٔ جدید را برای reconciliation نگه دارید. بازیابی قدیمی مستقیماً روی DB جاری ممنوع است؛ این سند هیچ جابه‌جایی خودکار سرویس به مقصد recovery انجام نمی‌دهد.

برای بازسازی نسخهٔ قبلی در مسیر جدا (بدون تغییر سرویس):

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
PREVIOUS=$(cat /opt/hostel2-staging/backups/qa11-previous-release.txt)
ROLLBACK_DIR=$(mktemp -d /opt/hostel2-staging/qa11-code-review-XXXXXX)
git worktree add --detach "$ROLLBACK_DIR" "$PREVIOUS"
cd "$ROLLBACK_DIR"
npm ci --include=dev
npm run lint
npm run build
SH
ROOT
```

دانلود dependency فقط با writerهای خاموش و همان رویهٔ توقف موقت egress و trap مرحلهٔ۲ انجام شود. سرویس فعلی تا بررسی مسیر بازیابی خاموش بماند؛ فعال‌سازی سرویس جدا با env recovery به تصمیم مالک نیاز دارد. از کلید و فایل بکاپ فعلی نسخهٔ خصوصی مستقل نگه دارید.
