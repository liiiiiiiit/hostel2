# استقرار امن TASK 08 در staging اوبونتو

این سند فقط برای test.yerevanhub.ir است؛ سایت اصلی، دیتابیس production و سرویس hostel2 را تغییر نمی‌دهد. مبنا شاخهٔ پیش‌فرض تأییدشدهٔ Task07 با SHA برابر 3e2139917ff6191465537ca8bea0fcf82f4b1c4f است. نسخهٔ آزموده‌شدهٔ Task08 برای نصب 3a6b2219aa36916cc49279a92e30a17f4efe30f2 است؛ تست‌های واقعی این نسخه موفق شده‌اند؛ نتیجه و لینک‌ها در CONTENT_MODERATION_TEST_RESULTS.md آمده‌اند. نیازی به نصب جداگانهٔ تسک‌های قبلی نیست، ولی migration باید اجرا شود.

## بررسی پیش‌نیازها

برای staging موجود، فقط بررسی کنید:

```bash
sudo systemctl show hostel2-staging --no-pager -p User -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl status hostel2-staging-egress --no-pager -l
sudo -u hostel2-staging git -C /opt/hostel2-staging/app status --short --branch
sudo ss -ltnp | grep -E ':3001\b|:3002\b'
```

انتظار: کاربر `hostel2-staging`، برنامه `/opt/hostel2-staging/app`، تنظیمات `/etc/hostel2-staging/staging.env`، دیتابیس `/opt/hostel2-staging/data/staging.db`، رسانه `/opt/hostel2-staging/data/uploads`، بکاپ `/opt/hostel2-staging/backups` و پورت **3002**. پورت 3001 قبلاً برای production استفاده شده؛ آن را تصاحب نکنید. APP_ENV=staging، NODE_ENV=production، NOTIFICATION_DELIVERY=disabled، DELIVERY/secretهای خارجی خالی و egress فعال باید برقرار باشد. محتوای کامل env یا رمزها را چاپ نکنید.

اگر staging اصلاً نصب نیست، ابتدا مرحلهٔ ۱ [STAGING_SETUP_FA.md](STAGING_SETUP_FA.md) را برای ساخت کاربر، مسیرها و runtime مستقل انجام دهید. سپس به‌جای مرحلهٔ ۲ آن سند، این بلوک را اجرا کنید (فقط وقتی مسیر app هنوز ساخته نشده):

```bash
sudo -u hostel2-staging -H git clone --single-branch \
  --branch codex/08-content-moderation \
  https://github.com/liiiiiiiit/hostel2.git /opt/hostel2-staging/app

sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
git fetch origin refs/heads/codex/08-content-moderation
git checkout --detach 3a6b2219aa36916cc49279a92e30a17f4efe30f2
npm ci --include=dev
npm run lint
npm run build
SH
```

سپس env، egress، HTTPS/Basic Auth و سرویس مستقل همان سند را تکمیل کنید. از کپی دیتابیس production برای ساخت staging استفاده نکنید. دیتابیس تازه در شروع امن ساخته می‌شود؛ اگر guard بکاپ را الزامی می‌کند، از روش bootstrap همان سند استفاده کنید، نه حذف یک DB موجود. هیچ رمز از دادهٔ نمونه در این شاخه hardcode نشده است.

## ۱. توقف writerها و بکاپ نسخهٔ فعلی

قبل از ارتقا، timer و سرویس و هر worker/cron اختصاصی staging را متوقف کنید. محافظ egress هنوز روشن می‌ماند.

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
git rev-parse HEAD > /opt/hostel2-staging/backups/qa08-previous-release.txt
REPORT=$(mktemp /opt/hostel2-staging/backups/qa08-preupgrade-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Backup failed");console.log(r.file);' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2-staging/backups/qa08-current-backup.path
SH
```

اگر بکاپ ناموفق است ادامه ندهید. کلید قبلی را نگه دارید و کلید تازه نسازید. بکاپ WAL-safe و تأییدشدهٔ ابزار پروژه لازم است؛ از کپی عادی دیتابیس فعال استفاده نکنید.

## ۲. دریافت کد و build با برنامهٔ خاموش

فایروال خروجی کاربر، دانلود Git/npm را هم می‌بندد. فقط وقتی تمام writerها خاموش‌اند، برای دانلود موقتاً آن را متوقف کنید:

```bash
sudo systemctl stop hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
test -z "$(git status --porcelain)"
git fetch origin refs/heads/codex/08-content-moderation
git switch --detach 3a6b2219aa36916cc49279a92e30a17f4efe30f2
npm ci --include=dev
npm run lint
npm run build
SH
sudo systemctl start hostel2-staging-egress.service
```

اگر build یا دانلود خطا داد، محافظ را با دستور آخر روشن کنید و برنامه خاموش بماند. env جدیدی برای این قابلیت لازم نیست. رزومه‌ها داخل دیتابیس خصوصی‌اند، نه پوشهٔ عمومی عکس. فهرست تست‌های موفق و محدودیت‌ها در `CONTENT_MODERATION_TEST_RESULTS.md` است.

## ۳. مهاجرت با بکاپ تأییدشده

```bash
sudo systemctl start hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa08-current-backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
SH
```

انتظار: `moderation=true، recruitment=true، jobSeekers=true`، `authorization=true`، `schemaReady=true`، `foreignKeyViolations=0` و integrity برابر `ok`. مهاجرت `content-moderation-v1` افزایشی و تراکنشی است. اگر fingerprint یکسان نیست، writer یا env/path متفاوت است؛ guard را خاموش نکنید و هیچ فایل DB را حذف نکنید.

پس از bootstrap اولیه و مهاجرت موفق، برای جلوگیری از migration ناخواسته در شروع‌های آینده، مقدار `REQUIRE_MIGRATION_BACKUP=true` را در فایل `/etc/hostel2-staging/staging.env` نگه دارید. با `sudoedit /etc/hostel2-staging/staging.env` فقط همین کلید موجود را تنظیم یا در صورت غیبت اضافه کنید؛ فایل یا کلید بکاپ را جایگزین نکنید.

## ۴. شروع و بررسی

```bash
sudo systemctl start hostel2-staging.service
sudo systemctl start hostel2-staging-backup.timer
sudo systemctl status hostel2-staging --no-pager -l
sudo tail -n 40 /opt/hostel2-staging/logs/error.log
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3002/api/environment
curl -u staging -I https://test.yerevanhub.ir/fa/
```

باید staging، نشان محیط آزمایش، HTTPS، ورود پروکسی و noindex برقرار باشد. با حساب مدیر از منوی اصلی وارد «مرکز بررسی محتوا» شوید. یک آگهی ساختگی را برای بررسی ارسال کنید، دلیل اصلاح بنویسید، سپس «تأییدشده، منتشرنشده» و بعد «منتشرشده» را بررسی کنید. در مرورگر مهمان فقط مورد منتشرشده و واجد شرایط عملیاتی باید دیده شود. تعلیق/بایگانی باید آن را از لیست، صفحهٔ مستقیم و sitemap خارج کند. حساب کارفرما/برگزارکننده نباید مرکز بررسی را باز کند. تصمیم گروهی را فقط روی دادهٔ ساختگی همین محیط امتحان کنید. بعد از restart تاریخچه باید باقی بماند. تست خودکار مخرب یا npm test را با env واقعی این سرور اجرا نکنید.

## دادهٔ دمو، فقط اختیاری در staging

بچ‌های قدیمی نسخهٔ ۱ و ۲ و ۳ بدون تغییر و قابل اعتبارسنجی می‌مانند و خودکار پروفایل نمی‌گیرند. برای نمونهٔ جدید، مدیر دمو یا CLI موجود را با seed جدید و env مستقل استفاده کنید. ابتدا `DEMO_TOOLS_ENABLED=true` و پوشهٔ خصوصی demo مطابق `DEMO_DATA_MANAGER_FA.md` باید آماده باشد. این بلوک به production متصل نمی‌شود و نباید با env تولید اجرا شود:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
npm run demo:seed -- --seed task08-recruitment
npm run demo:status
SH
```

این کار یک اکوسیستم کامل دیگر می‌سازد؛ برای staging پر از داده فقط برای نمونه‌سازیِ موردنیاز انجام دهید. import مجدد همان seed idempotent است. حساب‌های ساختگی در manifest با مجوز 0600 در `/opt/hostel2-staging/demo` نگهداری می‌شوند؛ آن را در Git یا گفتگو منتشر نکنید. پروفایل خصوصی است؛ برای دیدن آن باید به حساب همان کارجو وارد شوید. بدون اجرای seed، دادهٔ جدیدی در production ساخته نمی‌شود.

## بکاپ، ظرفیت و rollback

زمان‌بندی بکاپ موجود را نگه دارید. رزومهٔ PDF داخل بکاپ رمزگذاری‌شده می‌آید. سقف فعلی `BACKUP_MAX_BYTES` پیش‌فرض 64 MiB از JSON سریال‌شده است؛ با رشد رزومه‌ها اندازهٔ واقعی بکاپ را پایش کنید، محدودیت و فضای دیسک را آگاهانه تنظیم کنید و موفقیت verification را بررسی کنید. فایل/کلید بکاپ را عمومی نکنید. موتور بکاپ موجود شامل جدول‌های افزایشی و تاریخچهٔ بررسی نیز می‌شود. تست بازیابی این تسک از همان مسیر استفاده می‌کند.

در شکست migration، سرویس خاموش بماند؛ تراکنش شکست‌خورده تغییرات جدید را rollback می‌کند. دیتابیس را پاک نکنید. برای بازیابی فقط به مقصد خالی و جداگانه:

```bash
sudo systemctl stop hostel2-staging-backup.timer
sudo systemctl stop hostel2-staging-backup.service hostel2-staging.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa08-current-backup.path)
RECOVERY=$(mktemp -d /opt/hostel2-staging/data/qa08-recovery-XXXXXX)
export RESTORE_DATABASE_URL="file:$RECOVERY/check.db"
export RESTORE_MEDIA_DIRECTORY="$RECOVERY/uploads"
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
node --import tsx scripts/backup.ts restore "$BACKUP_FILE"
printf 'Separate recovery target: %s\n' "$RECOVERY"
SH
```

این دستور دیتابیس فعلی را overwrite و سرویس را به مقصد تازه متصل نمی‌کند. پیش از تغییر env یا اجرای کد قدیمی، نتیجهٔ integrity، credentials، رزروها، آگهی‌ها و رسانه را با گزارش backup مقایسه کنید و هر دادهٔ بعد از بکاپ را برای reconciliation حفظ کنید. پس از استفاده از قابلیت جدید، rollback صرفاً کد به Task 07 امن نیست: نسخهٔ قدیمی لایهٔ بررسی محتوا، تعلیق، بایگانی و تفکیک تأیید/انتشار را نمی‌فهمد. هیچ down-migration یا `db:rollback` برای حذف جدول‌های این قابلیت اجرا نکنید. مسیر ترجیحی اصلاح رو به جلو است. بازگشت به recovery point قدیمی به تصمیم مالک و بررسی داده‌های بعد از بکاپ نیاز دارد؛ نسخهٔ فعلی DB را نگه دارید.

## پذیرش اختصاصی مرکز بررسی

مرکز بررسی فقط برای مدیر است؛ آگهی و تور متعلق به ارائه‌دهنده نیازمند تأیید می‌ماند. هفت ماژول را با فیلتر بخش و وضعیت بررسی کنید. تأیید بدون انتشار نباید در سایت عمومی ظاهر شود. انتشار نباید نشان کسب‌وکار تأییدشده بسازد و نباید آگهی بسته را باز یا ظرفیت تور را تغییر دهد. دلیل اصلاح/رد/تعلیق/بایگانی اجباری است. انتشار مجدد رکورد تعلیق‌شده با ویرایشگر قدیمی نباید موفق به دورزدن تصمیم شود. در تعارض نسخه، کل گروه باید بدون تغییر بماند.

مهاجرت content-moderation-v1 دو جدول و دو ایندکس اضافه می‌کند؛ داده‌های قدیمی و statusهای native بازنویسی نمی‌شوند. متغیر محیطی، وابستگی، نقش و فرمان npm جدید لازم نیست. کلید بکاپ و تنظیمات فعلی را حفظ کنید. هیچ down-migration یا restore روی فایل جاری اجرا نشود.

نسخهٔ۴ مولد دمو در تعدادهای پیش‌فرض هشت وضعیت را برای هر هفت ماژول می‌سازد. recipeهای نسخه‌های۱/۲/۳ byte-identical باقی می‌مانند؛ بچ‌های واردشدهٔ قدیمی خودکار تغییر نمی‌کنند. seed جدید اختیاری است و یک مجموعهٔ کامل دیگر اضافه می‌کند. استفادهٔ مدیر دمو با seed تازه، بعد از بکاپ، فقط روی staging مجاز است. هیچ seed روی production اجرا نشود.
