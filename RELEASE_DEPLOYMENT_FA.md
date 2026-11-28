# انتشار مشروط TASK 12 روی Ubuntu VPS

**اکنون production را اجرا نکنید.** ابتدا RELEASE_READINESS_REPORT_FA.md و RELEASE_CHECKLIST_FA.md را بازبینی کنید. این فرمان‌ها برای مرحلهٔ پس از تأیید صریح مالک و رفع موارد باز آماده شده‌اند؛ این تحویل هیچ فرمان استقرار روی سرور شما اجرا نکرده است. برای آزمایش، RELEASE_STAGING_FA.md را اجرا کنید.

نسخهٔ کاندیدای آزمون: `72c5f3a65c3922f4e1de03e53c238d8da6bd1926`؛ شاخه `codex/12-production-readiness`. در صورت اصلاح کد، فقط SHA ثبت‌شده در نتیجهٔ نهایی تست جایگزین شود، نه HEAD نامشخص.

## ۱. شناسایی بدون تغییر و بدون نمایش اسرار

این دستورها را با SSH روی VPS اجرا کنید:

```bash
sudo systemctl show hostel2 --no-pager -p User -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl status hostel2 --no-pager -l
sudo -u hostel2 -H git -C /opt/hostel2/app status --short --branch
sudo -u hostel2 -H git -C /opt/hostel2/app log -1 --oneline
sudo systemctl list-timers --all --no-pager
sudo ss -ltnp
```

فرمان‌های بعدی فقط برای سرویس `hostel2`، کاربر `hostel2`، برنامه `/opt/hostel2/app` و runtime `/opt/hostel2/node/bin` هستند. مسیرهای DB/media را تغییر نمی‌دهند. اگر سرویس مسیر/کاربر دیگری دارد یا checkout تغییر محلی دارد، ادامه ندهید. خروجی env کامل، journal شامل دادهٔ مشتری، کلید یا manifest را ارسال نکنید.

فایل env باید دقیقاً همان فایل مورد استفادهٔ سرویس باشد. در نصب قدیمی ممکن است `/opt/hostel2/app/.env` و در نصب managed ممکن است `/opt/hostel2/config/production.env` باشد. وجود هر دو به‌معنای یکسان‌بودن آن‌ها نیست. مسیر درست را از EnvironmentFiles و روش اجرای واقعی مشخص کنید. فرمان زیر فایل مشخص‌شده را فقط خصوصی ثبت می‌کند؛ مسیر production را با staging عوض نکنید:

```bash
sudo install -d -m 700 -o hostel2 -g hostel2 /opt/hostel2/release-task12
sudo bash <<'ROOT'
set -euo pipefail
read -r -p 'Exact existing production env file: ' RELEASE_ENV </dev/tty
test -f "$RELEASE_ENV"
case "$RELEASE_ENV" in
  /opt/hostel2/app/.env|/opt/hostel2/config/production.env|/etc/hostel2/production.env) ;;
  *) echo 'Unrecognized layout: review the actual service before continuing'; exit 1 ;;
esac
printf '%s\n' "$RELEASE_ENV" > /opt/hostel2/release-task12/env.path
chown hostel2:hostel2 /opt/hostel2/release-task12/env.path
chmod 600 /opt/hostel2/release-task12/env.path
ROOT
```

در همان env واقعی، APP_ENV=production، NODE_ENV=production، APP_URL=https://yerevanhub.ir، HOST=127.0.0.1، TRUST_PROXY=loopback، DEMO_MODE=false، DEMO_TOOLS_ENABLED=false، REQUIRE_MIGRATION_BACKUP=true و HTTP_TEST_MODE غیرفعال لازم است. مقدار DATABASE_URL، MEDIA_DIRECTORY و کلید بکاپ فعلی را حفظ کنید. اگر نیاز به تغییر env است، آن را با مجوز 600 و مطابق systemd و مالکیت فعلی به‌صورت خصوصی بازبینی کنید. این سند env را خودکار بازنویسی یا کلید را تعویض نمی‌کند.

## ۲. تأیید مالک و توقف writerها

فقط پس از تأیید صریح مالک اجرا شود:

```bash
sudo bash <<'ROOT'
set -euo pipefail
read -r -p 'Type APPROVE_TASK12_RELEASE after owner approval: ' RELEASE_APPROVAL </dev/tty
test "$RELEASE_APPROVAL" = APPROVE_TASK12_RELEASE
test "$(systemctl show hostel2 -p User --value)" = hostel2
test "$(systemctl show hostel2 -p WorkingDirectory --value)" = /opt/hostel2/app
for unit in hostel2-backup.timer hostel2-backup.service; do
  if systemctl cat "$unit" >/dev/null 2>&1; then systemctl stop "$unit"; fi
done
systemctl stop hostel2.service
ROOT
```

worker/cron اختصاصیِ هر نصب نیز writer است؛ پیش از ادامه آن را متوقف کنید و نام/وضعیت قبلی را ثبت کنید. قالب repository worker خارجی/cron ممکن است service جدا نداشته باشد؛ فقط stop وب برای تضمین توقف همهٔ writerها کافی نیست. تا تعیین تکلیف آن‌ها ادامه ندهید. سرویس staging، Nginx و دیتابیس را حذف نکنید.

## ۳. بکاپ سازگار با WAL، تأیید و آزمایش بازیابی

این مرحله به CLI بکاپ موجود در نسخهٔ نصب‌شده نیاز دارد؛ در نبود آن توقف و رویهٔ مهاجرت نسخهٔ قبلی را بررسی کنید.

```bash
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH="$(cat /opt/hostel2/release-task12/env.path)"
export DOTENV_CONFIG_QUIET=true
export BACKUP_RETENTION_DAYS=
cd /opt/hostel2/app
test -z "$(git status --porcelain)"
test -f scripts/backup.ts
git rev-parse HEAD > /opt/hostel2/release-task12/previous.sha
REPORT=$(mktemp /opt/hostel2/release-task12/backup-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Verified backup required");console.log(r.file)' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2/release-task12/backup.path
RECOVERY=$(mktemp -d /opt/hostel2/release-task12/recovery-XXXXXX)
RESTORE_DATABASE_URL="file:$RECOVERY/check.db" RESTORE_MEDIA_DIRECTORY="$RECOVERY/uploads" \
  node --import tsx scripts/backup.ts restore "$BACKUP_FILE"
printf '%s\n' "$RECOVERY" > /opt/hostel2/release-task12/recovery.path
SH
```

بازیابی به مقصد خالی جدا انجام می‌شود؛ دیتابیس فعلی overwrite نمی‌شود. بررسی کنید snapshot شامل حساب‌ها، درخواست‌ها، عکس‌ها و کنترل‌های قبلی است؛ integrity/FK در CLI بازیابی کنترل می‌شود. حجم بکاپ/فضای آزاد و BACKUP_MAX_BYTES باید کافی باشد. کلید فعلی را خصوصی و جدا از آرشیو نگه دارید. شکست verify یا restore یعنی توقف انتشار.

## ۴. نصب فقط کد، build و مهاجرت guarded

هیچ فایل data/uploads/env/session از staging کپی نشود. اگر خروجی شبکهٔ کاربر production با firewall محدود است، دانلود Git/npm را طبق رویهٔ میزبان و فقط با writerهای خاموش انجام دهید؛ محافظ staging را به production تعمیم ندهید.

```bash
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
cd /opt/hostel2/app
test -z "$(git status --porcelain)"
git fetch origin refs/heads/codex/12-production-readiness
git switch --detach 72c5f3a65c3922f4e1de03e53c238d8da6bd1926
npm ci --include=dev
npm run lint
npm run build
SH

sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH="$(cat /opt/hostel2/release-task12/env.path)"
export DOTENV_CONFIG_QUIET=true
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2/app
BACKUP_FILE=$(cat /opt/hostel2/release-task12/backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
npm run release:check
SH
```

انتظار: schemaReady و releaseReadiness برابر true، integrity=ok و FK violations صفر؛ هیچ fail در release:check نباشد. manualهای MFA، مالک، میزبان و بکاپ باید با شواهد مستقل رسیدگی شوند. اگر guard fingerprint شکست خورد، writer فعال یا بکاپ اشتباه/قدیمی را بررسی کنید؛ guard را خاموش نکنید. فایل DB را پاک یا جایگزین نکنید.

npm test، test:release-load، demo:seed و staging-smoke را با env واقعی production اجرا نکنید. تست‌های کاندیدا در CI و محیط موقت ثبت شده‌اند.

## ۵. شروع و smoke بدون دادهٔ ساختگی

```bash
sudo systemctl start hostel2.service
sudo systemctl status hostel2 --no-pager -l
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3000/api/health
curl -fsSI https://yerevanhub.ir/fa/
curl -fsS https://yerevanhub.ir/robots.txt
curl -fsS https://yerevanhub.ir/sitemap.xml | head -c 2000
```

پورت 3000 فقط برای نصب قبلی همین سرویس است؛ اگر PORT واقعی متفاوت است، مقدار درست از config بررسی‌شده استفاده شود. health باید JSON حداقلی status:ok برگرداند؛ HTML / و /fa/ باید canonical/metadata واقعی داشته باشند؛ CSP، HSTS روی HTTPS، nosniff، no-store HTML و immutable assetهای hashدار را بررسی کنید. Nginx/CDN نباید هدرها را حذف یا HTML را برخلاف سیاست cache کند.

با حساب واقعیِ مجاز، ورود/خروج و پنل مناسب را مرور کنید؛ یک لینک عمومیِ ازقبل تأییدشده در هر زبان باز شود، محتوای منتشرنشده 404/noindex باشد، تماس/نشانی خصوصی در source عمومی نباشد. برای smoke رزرو تولیدی درخواست ساختگی نسازید؛ گردش کامل با synthetic فقط در staging و قبل از انتشار آزمایش می‌شود. برنامهٔ پایش واقعی خطا، صف worker و بکاپ را دنبال کنید.

writer/cronهایی که متوقف کرده بودید را فقط پس از smoke موفق با وضعیت قبلی روشن کنید. اگر timer استاندارد بکاپ قبلاً فعال بوده است:

```bash
sudo systemctl start hostel2-backup.timer
sudo systemctl status hostel2-backup.timer --no-pager
```

هیچ timer ناشناخته‌ای را صرفاً با نام فرضی فعال نکنید.

## بازگشت کد و بازیابی داده

اصلاح رو به جلو ترجیح دارد. مهاجرت TASK 12 فقط index/marker افزایشی است؛ کد TASK 11 آن‌ها را نادیده می‌گیرد، اما rollback کد دفاع HTTP/SEO و اصلاح startup contention را برمی‌گرداند. DB را down-migrate نکنید.

اگر smoke شکست خورد: writerها را دوباره متوقف کنید، از وضعیت جاری با CLI بکاپ تازه بگیرید و previous.sha را بازنویسی نکنید، سپس بازگشت کد قبلیِ ثبت‌شده بدون بازگرداندن DB را ابتدا در recovery جدا بررسی کنید. بازگشت به نسخه‌ای قدیمی‌تر از TASK 11 باید از نظر مدل مالکیت/رضایت/تعدیل جداگانه ارزیابی شود.

بازسازی نسخهٔ قبلی در checkout جدا (بدون تغییر سرویس جاری):

```bash
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
cd /opt/hostel2/app
PREVIOUS=$(cat /opt/hostel2/release-task12/previous.sha)
TARGET=$(mktemp -d /opt/hostel2/release-task12/previous-code-XXXXXX)
git worktree add --detach "$TARGET" "$PREVIOUS"
cd "$TARGET"
npm ci --include=dev
npm run lint
npm run build
SH
```

برای بازیابی مجدد فقط همان مرحلهٔ۳ با RESTORE_DATABASE_URL و RESTORE_MEDIA_DIRECTORY تازه اجرا شود؛ CLI هدف موجود/هم‌پوشان را رد می‌کند. هیچ دستور overwrite دیتابیس زنده ارائه نشده است. سوییچ سرویس به recovery پس از بررسی و reconciliation داده‌های بعد از بکاپ، تصمیم مستقل مالک است. نسخهٔ بکاپ قدیمی ممکن است رکوردهای جدید را نداشته باشد؛ حذف آن‌ها با rollback قابل قبول نیست.

بازگشت صرف کد در همان سرویس، **فقط پس از تأیید مالک و سازگاری نسخهٔ قبلی با TASK 11**، بدون بازگرداندن DB:

```bash
sudo systemctl stop hostel2.service
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH="$(cat /opt/hostel2/release-task12/env.path)"
export DOTENV_CONFIG_QUIET=true
export BACKUP_RETENTION_DAYS=
cd /opt/hostel2/app
test -z "$(git status --porcelain)"
PREVIOUS=$(cat /opt/hostel2/release-task12/previous.sha)
git merge-base --is-ancestor cbca96e0514609c14a3c634ec04530929d5deb06 "$PREVIOUS"
REPORT=$(mktemp /opt/hostel2/release-task12/before-code-rollback-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Backup failed");console.log(r.file)' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
git switch --detach "$PREVIOUS"
npm ci --include=dev
npm run lint
npm run build
SH
```

پیش از این بلوک همهٔ worker/cron/timerهای writer نیز باید خاموش باشند. شرط ancestry جلوی rollback خودکار به نسخهٔ قدیمیِ بازبینی‌نشده را می‌گیرد؛ آن را حذف نکنید. این بلوک previous.sha و بکاپ پیش از انتشار را بازنویسی نمی‌کند. اگر هر مرحله شکست خورد سرویس خاموش بماند. پس از بررسی build و سازگاری داده، مالک می‌تواند `sudo systemctl start hostel2.service` را اجرا و smoke نسخهٔ قبلی را انجام دهد؛ endpoint تازهٔ /api/health در TASK 11 وجود ندارد، پس برای rollback از `/api/environment` و صفحهٔ `/fa/` استفاده کنید. روشن‌کردن مجدد workerها و timerها فقط پس از پذیرش است. در بازگشت، اصلاحات امنیتی/SEO TASK 12 دیگر فعال نیستند و باید با اولویت اصلاح رو به جلو برنامه‌ریزی شوند.
