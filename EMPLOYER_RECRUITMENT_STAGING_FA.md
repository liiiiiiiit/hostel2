# استقرار امن TASK 07 در staging اوبونتو

این سند فقط برای `test.yerevanhub.ir` است؛ هیچ دستور آن سرویس یا دیتابیس production را تغییر نمی‌دهد. کد تأییدشدهٔ این تسک `61417fbf74a7b74f2a4f8528ca6bab3159b3d753` است؛ تست staging واقعی آن موفق شده است؛ لینک نتایج در `EMPLOYER_RECRUITMENT_TEST_RESULTS.md` آمده است. نسخهٔ Task 06 مبنا `94cbb677b41255d0fae0383cbb6a573c72361d15` است و PR آن هنوز merge نشده است. شاخهٔ Task 07 همهٔ وابستگی‌های قبلی را در تاریخچه دارد. نصب روی شاخهٔ قدیمی default، قابلیت‌های جدید را فعال نمی‌کند.

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
  --branch codex/07-employer-recruitment-dashboard \
  https://github.com/liiiiiiiit/hostel2.git /opt/hostel2-staging/app

sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
cd /opt/hostel2-staging/app
git fetch origin refs/heads/codex/07-employer-recruitment-dashboard
git checkout --detach 61417fbf74a7b74f2a4f8528ca6bab3159b3d753
npm ci --include=dev
npm run lint
npm run build
SH
```

سپس env، egress، HTTPS/Basic Auth و سرویس مستقل همان سند را تکمیل کنید. از کپی دیتابیس production برای ساخت staging استفاده نکنید. دیتابیس تازه در شروع امن ساخته می‌شود؛ اگر guard بکاپ را الزامی می‌کند، از روش bootstrap همان سند استفاده کنید، نه حذف یک DB موجود. هیچ رمز از دادهٔ نمونه در این شاخه hardcode نشده است.

## ۱. توقف writerها و بکاپ نسخهٔ فعلی

قبل از ارتقا، timer و سرویس و هر worker/cron اختصاصی staging را متوقف کنید. محافظ egress هنوز روشن می‌ماند.

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
git rev-parse HEAD > /opt/hostel2-staging/backups/qa07-previous-release.txt
REPORT=$(mktemp /opt/hostel2-staging/backups/qa07-preupgrade-XXXXXX.json)
node --import tsx scripts/backup.ts > "$REPORT"
BACKUP_FILE=$(node --input-type=module -e 'import fs from "node:fs";const r=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));if(r.verified!==true||!r.file)throw Error("Backup failed");console.log(r.file);' "$REPORT")
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
printf '%s\n' "$BACKUP_FILE" > /opt/hostel2-staging/backups/qa07-current-backup.path
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
git fetch origin refs/heads/codex/07-employer-recruitment-dashboard
git switch --detach 61417fbf74a7b74f2a4f8528ca6bab3159b3d753
npm ci --include=dev
npm run lint
npm run build
SH
sudo systemctl start hostel2-staging-egress.service
```

اگر build یا دانلود خطا داد، محافظ را با دستور آخر روشن کنید و برنامه خاموش بماند. env جدیدی برای این قابلیت لازم نیست. رزومه‌ها داخل دیتابیس خصوصی‌اند، نه پوشهٔ عمومی عکس. فهرست تست‌های موفق و محدودیت‌ها در `EMPLOYER_RECRUITMENT_TEST_RESULTS.md` است.

## ۳. مهاجرت با بکاپ تأییدشده

```bash
sudo systemctl start hostel2-staging-egress.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
export REQUIRE_MIGRATION_BACKUP=true
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa07-current-backup.path)
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
npm run db:migrate -- --offline --backup "$BACKUP_FILE"
npm run db:check
SH
```

انتظار: `recruitment=true، jobSeekers=true`، `authorization=true`، `schemaReady=true`، `foreignKeyViolations=0` و integrity برابر `ok`. مهاجرت `employer-recruitment-v1` افزایشی و تراکنشی است. اگر fingerprint یکسان نیست، writer یا env/path متفاوت است؛ guard را خاموش نکنید و هیچ فایل DB را حذف نکنید.

## ۴. شروع و بررسی

```bash
sudo systemctl start hostel2-staging.service
sudo systemctl start hostel2-staging-backup.timer
sudo systemctl status hostel2-staging --no-pager -l
sudo tail -n 40 /opt/hostel2-staging/logs/error.log
curl --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:3002/api/environment
curl -u staging -I https://test.yerevanhub.ir/fa/
```

باید staging، نشان محیط آزمایش، HTTPS، ورود پروکسی و noindex برقرار باشد. مرورگر: از منوی اصلی حساب بسازید/وارد شوید، «پنل کارجو»، پروفایل و سابقه را ذخیره کنید، PDF ساختگی بارگذاری و برای آگهی منتشرشده با رضایت درخواست دهید. کارفرمای همان آگهی باید فقط اطلاعات انتخاب‌شده را ببیند؛ حساب دیگر نباید رزومه را دانلود کند. سپس انصراف/قطع اشتراک‌گذاری و بستن آگهی را بررسی کنید. پس از refresh و restart سابقه باید باقی بماند. تست بار یا مخرب روی سایت عمومی اجرا نکنید.

## دادهٔ دمو، فقط اختیاری در staging

بچ‌های قدیمی نسخهٔ ۱ و ۲ بدون تغییر و قابل اعتبارسنجی می‌مانند و خودکار پروفایل نمی‌گیرند. برای نمونهٔ جدید، مدیر دمو یا CLI موجود را با seed جدید و env مستقل استفاده کنید. ابتدا `DEMO_TOOLS_ENABLED=true` و پوشهٔ خصوصی demo مطابق `DEMO_DATA_MANAGER_FA.md` باید آماده باشد. این بلوک به production متصل نمی‌شود و نباید با env تولید اجرا شود:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
npm run demo:seed -- --seed task07-recruitment
npm run demo:status
SH
```

این کار یک اکوسیستم کامل دیگر می‌سازد؛ برای staging پر از داده فقط برای نمونه‌سازیِ موردنیاز انجام دهید. import مجدد همان seed idempotent است. حساب‌های ساختگی در manifest با مجوز 0600 در `/opt/hostel2-staging/demo` نگهداری می‌شوند؛ آن را در Git یا گفتگو منتشر نکنید. پروفایل خصوصی است؛ برای دیدن آن باید به حساب همان کارجو وارد شوید. بدون اجرای seed، دادهٔ جدیدی در production ساخته نمی‌شود.

## بکاپ، ظرفیت و rollback

زمان‌بندی بکاپ موجود را نگه دارید. رزومهٔ PDF داخل بکاپ رمزگذاری‌شده می‌آید. سقف فعلی `BACKUP_MAX_BYTES` پیش‌فرض 64 MiB از JSON سریال‌شده است؛ با رشد رزومه‌ها اندازهٔ واقعی بکاپ را پایش کنید، محدودیت و فضای دیسک را آگاهانه تنظیم کنید و موفقیت verification را بررسی کنید. فایل/کلید بکاپ را عمومی نکنید. کد بازیابی موجود در مبنای Task 06، ایندکس‌های FK را پیش از درج رکوردها می‌سازد؛ تست بازیابی این تسک نیز از همان مسیر استفاده می‌کند.

در شکست migration، سرویس خاموش بماند؛ تراکنش شکست‌خورده تغییرات جدید را rollback می‌کند. دیتابیس را پاک نکنید. برای بازیابی فقط به مقصد خالی و جداگانه:

```bash
sudo systemctl stop hostel2-staging-backup.timer hostel2-staging.service
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
umask 077
export PATH=/opt/hostel2-staging/node/bin:/usr/bin:/bin
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
BACKUP_FILE=$(cat /opt/hostel2-staging/backups/qa07-current-backup.path)
RECOVERY=$(mktemp -d /opt/hostel2-staging/data/qa07-recovery-XXXXXX)
export RESTORE_DATABASE_URL="file:$RECOVERY/check.db"
export RESTORE_MEDIA_DIRECTORY="$RECOVERY/uploads"
node --import tsx scripts/backup.ts verify "$BACKUP_FILE"
node --import tsx scripts/backup.ts restore "$BACKUP_FILE"
printf 'Separate recovery target: %s\n' "$RECOVERY"
SH
```

این دستور دیتابیس فعلی را overwrite و سرویس را به مقصد تازه متصل نمی‌کند. پیش از تغییر env یا اجرای کد قدیمی، نتیجهٔ integrity، credentials، رزروها، آگهی‌ها و رسانه را با گزارش backup مقایسه کنید و هر دادهٔ بعد از بکاپ را برای reconciliation حفظ کنید. پس از استفاده از قابلیت جدید، rollback صرفاً کد به Task 06 امن نیست: نسخهٔ قدیمی پیش‌نویس، انقضا، مراحل استخدام جدید، مصاحبه‌ها و ثبت رویدادهای این ماژول را نمی‌فهمد. هیچ down-migration یا `db:rollback` برای حذف جدول‌های این قابلیت اجرا نکنید. مسیر ترجیحی اصلاح رو به جلو است. بازگشت به recovery point قدیمی به تصمیم مالک و بررسی داده‌های بعد از بکاپ نیاز دارد؛ نسخهٔ فعلی DB را نگه دارید.

## پذیرش اختصاصی پنل کارفرما

ورود کارفرما از منوی اصلی، پروفایل سازمان، ذخیرهٔ پیش‌نویس ناقص، ارسال برای تأیید، انتشار مدیر و انقضا را بررسی کنید. کارجوی حساب‌دار با رضایت درخواست و رزومه بفرستد؛ کارفرما فقط درخواست خودش را ببیند، یادداشت خصوصی ثبت کند، زمان آیندهٔ مصاحبه را پیشنهاد دهد و نتیجه را صریح ثبت کند. کارجو نباید یادداشت خصوصی را ببیند؛ کارفرمای دیگر نباید CV را بگیرد. بستن/تمدید نباید درخواست‌ها را پاک کند؛ تمدید کارفرما تا تأیید مدیر عمومی نیست. نتیجهٔ مصاحبه یا تأیید حضور خودکار ثبت نمی‌شود و اعلان واقعی ارسال نمی‌شود.

این تسک پنج جدول و چهار ایندکس افزایشی دارد؛ اطلاعات قدیمی و چهار وضعیت SQL قبلی بازنویسی نمی‌شوند. متغیر محیطی، وابستگی و فرمان npm جدیدی نیاز نیست. نقش و مجوز جدیدی ساخته نشده است. مهاجرت به guard بکاپ موجود متصل است. پس از استفاده، اجرای کد قدیمی روی همین DB امن نیست: انقضا/پیش‌نویس/مراحل جدید را نادیده می‌گیرد. از db:rollback برای حذف این ماژول استفاده نکنید. اصلاح رو به جلو اولویت دارد؛ بازیابی فقط در هدف جدا و پس از بررسی داده‌های بعد از بکاپ/تصمیم مالک است.

نسخهٔ ۳ مولد دمو پروفایل سازمان، یادداشت‌های SYNTHETIC و پیشنهادهای مصاحبه را اضافه می‌کند. batchهای قبلی نسخهٔ ۱/۲ خودکار تغییر نمی‌کنند. اگر staging قبلاً از داده پر است، اجرای seed جدید یک اکوسیستم کامل دیگر اضافه می‌کند؛ صرفاً برای نمونه‌سازی موردنیاز انجام دهید. هیچ seed روی production اجرا نشود.
