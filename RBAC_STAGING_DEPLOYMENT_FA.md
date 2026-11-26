# استقرار staging مرحلهٔ ۵ — فقط پس از بازبینی و موفقیت CI

این سند دستورات دستی است؛ هیچ فرمان آن خودکار روی VPS اجرا نشده است. نام‌های زیر فقط برای نصب staging مطابق مراحل قبلی هستند. اگر مسیر/کاربر متفاوت است، ابتدا تطبیق دهید. سرویس production را stop/restart نکنید. هیچ دستور `demo:seed` در ارتقا لازم نیست.

## نصب نخستین staging

راهنمای `STAGING_SETUP_FA.md` را با شاخهٔ `codex/05-rbac-authorization` و commit بررسی‌شدهٔ همین PR اجرا کنید؛ به‌جای شاخهٔ مرحلهٔ ۱، کد مرحلهٔ ۵ را بگیرید. Node مستقل 24، پورت 127.0.0.1:3002، DNS/HTTPS و Basic Auth مخصوص test.yerevanhub.ir، کاربر hostel2-staging، فایروال UID، env جدید بدون credential تولید و داده در `/opt/hostel2-staging` را حفظ کنید. از کپی `.env` یا دیتابیس production استفاده نکنید. دیتابیس تازه در شروع علامت staging می‌گیرد. برای دادهٔ تازه فقط پس از نصب کامل، راهنمای `DEMO_DATA_MANAGER_FA.md` را اجرا کنید. VPS با دادهٔ واقعی، هدف نصب اولیهٔ خالی نیست.

### بلوک دریافت کد برای staging تازه

در نصب نخست، بعد از ساخت کاربر/مسیرها/Node مستقل طبق بخش ۱ راهنمای staging، بلوک دریافت کد بخش ۲ را دقیقاً با این جایگزین کنید؛ پوشهٔ app باید هنوز وجود نداشته باشد:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
test ! -e /opt/hostel2-staging/app
git clone --no-checkout --single-branch --branch codex/05-rbac-authorization https://github.com/liiiiiiiit/hostel2.git /opt/hostel2-staging/app
cd /opt/hostel2-staging/app
git checkout --detach a44498d2a3de50678e70aaafe0c4772cd48d3751
npm ci --include=dev
npm run lint
npm run build
SH
```

سپس بخش‌های ۳ تا ۶ `STAGING_SETUP_FA.md` را برای env جدید، سرویس و egress و HTTPS/Basic Auth اجرا کنید. برای فعال‌کردن مدیریت دمو، طبق `DEMO_DATA_MANAGER_FA.md` پوشهٔ خصوصی `/opt/hostel2-staging/demo` را با مالکیت hostel2-staging و مجوز 0700 بسازید و DEMO_TOOLS_ENABLED=true را در env مستقل فعال کنید. از دستور smoke مختص CI روی VPS استفاده نکنید. این مرحله به ساخت یا کپی دیتابیس production نیاز ندارد.

## ارتقای staging موجود

اول فقط بررسی کنید:

```bash
sudo systemctl show hostel2-staging --no-pager -p User -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl status hostel2-staging-egress --no-pager -l
sudo -u hostel2-staging git -C /opt/hostel2-staging/app status --short --branch
```

انتظار: User=hostel2-staging، کد در `/opt/hostel2-staging/app`، env در `/etc/hostel2-staging/staging.env` و محافظ egress فعال. اگر نصب وجود ندارد، این بخش ارتقا را اجرا نکنید. worker/cron اختصاصی staging اگر اضافه کرده‌اید نیز باید متوقف شود. دستورات بعد با اولین خطا متوقف می‌شوند؛ بعد از خطا به مرحلهٔ بعد نروید.

### توقف writerها و بکاپ با کد فعلی

```bash
sudo systemctl stop hostel2-staging-backup.timer hostel2-staging.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export DOTENV_CONFIG_QUIET=true
export BACKUP_RETENTION_DAYS=
cd /opt/hostel2-staging/app
test -z "$(git status --porcelain)"
git rev-parse HEAD > /opt/hostel2-staging/backups/qa05-previous-release.txt
REPORT=$(mktemp /opt/hostel2-staging/backups/qa05-preupgrade-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs"; const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); if(r.verified!==true||!r.file)throw Error("Backup failed"); console.log(r.file);' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2-staging/backups/qa05-current-backup.path
SH
```

بکاپ و کلید قبلی را نگه دارید؛ کلید جدید تولید نکنید. receipt و آرشیو باید موجود باشند. اگر بکاپ ناموفق است، ارتقا را ادامه ندهید.

### دریافت و build فقط با برنامهٔ خاموش

فایروال خروجی UID دانلود Git/npm را هم می‌بندد. فقط در این فاصله که برنامه، worker و timer خاموش‌اند، آن را موقتاً متوقف کنید:

```bash
sudo systemctl stop hostel2-staging-egress.service
```

کد زیر به نسخهٔ مشخص `a44498d2a3de50678e70aaafe0c4772cd48d3751` پین می‌شود. هر سه workflow این نسخه موفق‌اند؛ پیوند نتایج در `RBAC_TEST_RESULTS.md` است. پس از بازبینی مالک، بلوک دریافت/build:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
test -z "$(git status --porcelain)"
git fetch origin refs/heads/codex/05-rbac-authorization
git switch --detach a44498d2a3de50678e70aaafe0c4772cd48d3751
npm ci --include=dev
npm run lint
npm run build
SH
```

اگر دانلود/build شکست خورد، محافظ را دوباره فعال کنید و برنامه خاموش بماند:

```bash
sudo systemctl start hostel2-staging-egress.service
```

### migration با همان بکاپ و پیکربندی

پیش از هر اجرای برنامه، محافظ خروجی باید دوباره فعال باشد:

```bash
sudo systemctl start hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa05-current-backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
SH
```

باید authorization=true، schemaReady=true، foreignKeyViolations=0 و integrity_check=ok باشد. اگر fingerprint با بکاپ برابر نیست، writer یا مسیر/env متفاوت است؛ guard را خاموش نکنید و فایل DB را پاک نکنید.

### شروع و پذیرش

```bash
sudo systemctl start hostel2-staging.service
sudo systemctl start hostel2-staging-backup.timer
sudo systemctl status hostel2-staging --no-pager -l
sudo tail -n 40 /opt/hostel2-staging/logs/error.log
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3002/api/environment
curl -u staging -I https://test.yerevanhub.ir/fa/
```

رمز Basic Auth را تعاملی بدهید؛ در فرمان ننویسید. محیط باید staging، TLS معتبر، پاسخ بدون رمز 401 و با رمز 200 باشد. با مدیر staging وارد «نقش‌ها و دسترسی‌ها» شوید؛ روی یک حساب آزمایشی نقش را تغییر دهید و خروج نشست قبلی/ورود مجدد/عدم دسترسی به پنل نامرتبط را بررسی کنید. رمز، hash، کلید یا فایل manifest را در خروجی عمومی نفرستید. بکاپ بعد از پذیرش را نیز بگیرید:

```bash
sudo systemctl start hostel2-staging-backup.service
sudo systemctl status hostel2-staging-backup.service --no-pager -l
```

## rollback و بازیابی

در خطای migration یا مجوزها، فقط staging را خاموش نگه دارید؛ سرویس تولید تغییر نکند. DDL و backfill این migration در یک تراکنش است و شکست آن rollback می‌شود. فایل‌های بکاپ، کلید، SHA قبلی و DB فعلی را نگه دارید. بررسی recovery فقط در مقصد DB جدید مثل `/opt/hostel2-staging/data/recovery/qa05.db` و پوشهٔ خالی و مستقل مدیا انجام شود؛ `PERSISTENCE_BACKUP_RECOVERY_FA.md` مراحل verify/restore را دارد. هیچ restore روی فایل جاری مجاز نیست.

بازگشت ساده به مرحلهٔ ۴ بعد از لغو نقش امن نیست؛ آن کد دوباره دسترسی را از مالکیت آگهی حدس می‌زند. جدول/marker را حذف نکنید. ابتدا نسخهٔ سازگار با سیاست جدید یا forward-fix آماده و آزمایش شود. بازگرداندن بکاپ پیش از پذیرش ترافیک نیز عملیات آفلاین جدا با حفظ مبدأ و تطبیق نوشته‌های جدید است، نه دستور خودکار رفع 502.
