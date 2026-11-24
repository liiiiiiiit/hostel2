# نگه‌داری پایدار، بکاپ و بازیابی YEREVANHUB — Task 02

این سند دستور اجرای خودکار نیست. در این تغییر هیچ اتصال SSH، انتقال دیتابیس، تغییر Nginx یا restart سرویس زنده انجام نشده است. ابتدا در محیط جدا تمرین کنید. دستورات بخش انتقال، پنجرهٔ نگه‌داری و تأیید اپراتور را لازم دارند.

## مبنا و محدوده

شاخهٔ واقعی پیش‌فرض هنگام بررسی `codex/fix-menu-desktop-site-20261124` و commit آن `fe1a6b3f7e55f71e51dfb23a694248826b434aa1` بود. شاخهٔ این کار `codex/02-persistence-backup-recovery` بر commit `8c5f8df2d6d1fe2d148bcc05a9f52fcfb7c44ddc` از Task 01 ساخته شده تا جداسازی staging حفظ شود. Task 01 در PR #12 هنوز ادغام نشده بود؛ PR این کار روی شاخهٔ Task 01 قرار می‌گیرد. قبل از ادغام نهایی، هر دو تغییر باید بازبینی و روی پیش‌فرض جدید آزمایش شوند.

معماری عوض نشده: Node.js، Express، React/TypeScript/Vite و SQLite/libSQL؛ هیچ ORM یا دیتابیس جدیدی اضافه نشده است. نمونه‌های این سند برای Ubuntu، کاربر `hostel2` و Node در `/opt/hostel2/node/bin` هستند؛ ابتدا با وضعیت واقعی تطبیق دهید.

## علت تغییر و رفتار جدید

- بکاپ قبلی رمزگذاری AES-256-GCM و بازیابی جدا داشت؛ همان فرمت `YHBK1` و restore توسعه داده شده‌اند. فایل‌های قدیمی همچنان قابل خواندن‌اند.
- قبلاً metadata دیتابیس قبل از خواندن عکس‌ها آزاد می‌شد؛ حذف هم‌زمان عکس می‌توانست بکاپ را ناقص کند. اکنون SQL snapshot و pin فایل‌های immutable زیر قفل نوشتن انجام می‌شود؛ سپس خواندن/رمزگذاری خارج از قفل ادامه می‌یابد. pin از hard link موقت خصوصی، یا copy اختصاصی در filesystem متفاوت استفاده می‌کند؛ دیتابیس هرگز با کپی عادی از فایل زنده بکاپ گرفته نمی‌شود.
- فایل‌های ثبت‌نشدهٔ قدیمی داخل پوشهٔ مدیا نیز با مسیر نسبی، checksum و محتوای واقعی نگه داشته می‌شوند. symlink و فایل مفقود/ناقص باعث شکست آشکار می‌شوند.
- هر archive ابتدا با مجوز 0600 و پسوند `.partial` نوشته و fsync می‌شود، رمزگشایی و در دیتابیس/مدیای موقت بازیابی می‌شود. مقادیر همهٔ جدول‌ها، binary/int64، sequenceها، FK و integrity بررسی می‌شوند. سپس با انتشار اتمیک و انحصاری، فایل نهایی و رسید `.verified.json` ساخته می‌شود.
- فایل ناقص موفق گزارش نمی‌شود. قطع برق ممکن است `.partial` یا archive بدون رسید باقی بگذارد؛ آن‌ها را بررسی کنید. retention خودکار آن‌ها را حذف نمی‌کند.
- restore CLI مقصد دیتابیسِ جدید و مدیای خالی و مجزا می‌خواهد؛ alias و هم‌پوشانی با مبدأ رد می‌شود. rollback شکست restore فقط فایل‌های تازهٔ همان عملیات را پاک می‌کند.
- در حالت managed، دیتابیس موجود و مسیرهای صریح الزامی‌اند. شروع سرویس با migration معوق بدون بکاپ جاریِ واقعاً قابل‌بازیابی متوقف می‌شود. اجرای migration با `--offline --backup FILE` لازم است؛ hash محتوای دیتابیس و مدیا باید با بکاپ برابر باشد.
- قفل `flock` مشترک برای web، worker و backup و قفل انحصاری برای migration ارائه شده است. همهٔ writerهای قدیمی/cron نیز باید متوقف یا به همین قرارداد متصل شوند؛ `--offline` به تنهایی اثبات خاموش بودن writer قدیمی نیست.

## طرح نهایی مستقل از کد

| مسیر | محتوا | نگه‌داری |
|---|---|---|
| `/opt/hostel2/app` | کد، node_modules و dist | قابل تعویض با release |
| `/opt/hostel2/data/hostel.db` | SQLite، WAL و SHM کنار آن | پایدار و خصوصی |
| `/opt/hostel2/media` | تمام uploadها و مدیای قدیمی | پایدار و خصوصی |
| `/opt/hostel2/backups` | archive رمز‌شده و رسید تأیید | پایدار، کپی خارج VPS |
| `/opt/hostel2/config` | production.env و writers.lock | خصوصی، بیرون Git |

منابع staging در `/opt/hostel2-staging` باقی می‌مانند؛ آن‌ها را کپی، جابه‌جا، chown یا restart نکنید. پورت production را از تنظیمات واقعی بخوانید؛ مثال 3001 به معنی پورت آزاد برای staging نیست. Task 01 از 3002 برای staging استفاده می‌کند.

`npm ci`، build و Git روی `app` دادهٔ بیرونی را تغییر نمی‌دهند. `rm -rf /opt/hostel2`، `git clean`، اسکریپت reset دیتابیس یا restore روی مسیر فعال بخشی از این روش نیستند.

## ۱. کشف فقط‌خواندنی قبل از هر تصمیم

با root در VPS اجرا کنید و خروجی بدون رمز را بررسی کنید:

```bash
sudo systemctl show hostel2 --no-pager \
  -p User -p Group -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl list-units --all --type=service --no-pager | grep -Ei 'hostel|worker|backup'
sudo systemctl list-timers --all --no-pager
sudo crontab -l
sudo -u hostel2 crontab -l
sudo ss -ltnp
sudo lsof -u hostel2 2>/dev/null | grep -Ei '\.(db|sqlite|sqlite3)(-wal|-shm)?([[:space:]]|$)'
sudo -u hostel2 -H bash -c 'cd /opt/hostel2/app && git status --short --branch && git log -1 --oneline'
```

اگر `lsof` نصب نیست، بررسی `/proc/<PID>/fd` برای PID واقعی Node جایگزین است. Node PID ممکن است با MainPID مربوط به npm متفاوت باشد. فایل‌های باز و EnvironmentFile واقعی را با `.env` تطبیق دهید؛ تغییر فایل env الزاماً به معنی اعمال آن در پردازهٔ فعلی نیست. محتوای env، `/proc/.../environ`، رمزها یا کلیدها را عمومی ارسال نکنید. واحدهای worker، cron و backup قدیمی را دقیقاً ثبت کنید.

کد بازبینی‌شدهٔ ابزار را **جدا از اپلیکیشن** آماده کنید:

```bash
sudo install -d -m 750 -o hostel2 -g hostel2 /opt/hostel2/tools
sudo -u hostel2 -H git clone --single-branch \
  --branch codex/02-persistence-backup-recovery \
  https://github.com/liiiiiiiit/hostel2.git /opt/hostel2/tools/persistence
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:$PATH
cd /opt/hostel2/tools/persistence
node --version
git log -1 --oneline
npm ci
node --import tsx scripts/storage-discovery.ts \
  --app /opt/hostel2/app --env /opt/hostel2/app/.env
SH
```

`--env` را با مسیر واقعی EnvironmentFile جایگزین کنید. اگر چند منبع env وجود دارد، اپراتور باید مقادیر مؤثر را خصوصی تطبیق دهد. ابزار فقط config را می‌خواند، Database را initialize نمی‌کند و توکن‌ها را چاپ نمی‌کند. اگر دیتابیس remote یا backend مدیا blob بود، روش جابه‌جایی فیزیکی Python را اجرا نکنید؛ ابتدا export/restore جدا و دسترسی مدیای remote را تمرین کنید. اگر فایل یا پوشهٔ مدیا وجود ندارد، علت را بررسی کنید؛ مسیر جایگزین خالی نسازید.

## ۲. آماده‌سازی config نگه‌داری بدون تغییر سرویس

متغیرهای زیر را با خروجی واقعی مرحلهٔ قبل تنظیم کنید؛ این مثال‌ها ادعای مسیر فعلی نیستند:

```bash
APP_DIR=/opt/hostel2/app
SOURCE_DB=/actual/discovered/path/hostel.db
SOURCE_MEDIA=/actual/discovered/path/uploads
SOURCE_ENV=/actual/discovered/path/.env
```

در همان نشست shell، تنظیمات خصوصی و فضای بکاپ را بسازید. اگر این مسیرها قبلاً وجود دارند، مالکیت/محتوا را ابتدا بررسی کنید و فایل موجود را جایگزین نکنید:

```bash
sudo install -d -m 750 -o root -g hostel2 /opt/hostel2/config
sudo install -d -m 700 -o hostel2 -g hostel2 /opt/hostel2/backups
sudo bash -s -- "$SOURCE_ENV" <<'SH'
set -euo pipefail
test ! -e /opt/hostel2/config/source-maintenance.env
install -m 600 -o hostel2 -g hostel2 "$1" /opt/hostel2/config/source-maintenance.env
SH
sudo -u hostel2 nano /opt/hostel2/config/source-maintenance.env
```

در `source-maintenance.env` مقادیر واقعی و **مطلق** `DATABASE_URL=file:...` و `MEDIA_DIRECTORY=...` را بگذارید؛ `MEDIA_STORAGE=local`، `APP_ENV=production`، `BACKUP_DIRECTORY=/opt/hostel2/backups` و `NOTIFICATION_DELIVERY=disabled` را تنظیم کنید. `PERSISTENT_STORAGE_MODE` فعلاً خالی باشد؛ این فایل صرفاً برای ابزار بکاپ است و روی سرویس فعلی اعمال نمی‌شود. retention را برای اولین انتقال خالی بگذارید.

اگر کلید بکاپ از قبل وجود دارد، **همان کلید** را حفظ کنید. تنها در نبود کلید، یک کلید جدید را بدون چاپ روی ترمینال به همین فایل خصوصی اضافه کنید:

```bash
sudo -u hostel2 /opt/hostel2/node/bin/node --input-type=module <<'JS'
import {readFileSync,appendFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const file='/opt/hostel2/config/source-maintenance.env';
if (/^BACKUP_ENCRYPTION_KEY=/m.test(readFileSync(file,'utf8'))) throw Error('Existing key entry: review and preserve it; do not append another key.');
appendFileSync(file,'\nBACKUP_ENCRYPTION_KEY='+randomBytes(32).toString('base64')+'\n');
JS
```

کلید را در محل امن جدا از VPS نگه دارید. archive شامل کلید یا config نیست؛ بدون کلید بازیابی ممکن نیست. key rotation خودکار انجام نمی‌شود؛ کلیدهای قدیمی برای archiveهای قدیمی لازم‌اند.

## ۳. توقف writerها، بکاپ تأییدشده و ساخت کپیِ جدا

فقط در پنجرهٔ نگه‌داری مورد تأیید، سرویس web و **نام‌های واقعی** همهٔ workerها و timerهای مربوط را متوقف کنید. نمونهٔ web:

```bash
sudo systemctl stop hostel2
sudo systemctl is-active hostel2
```

برای worker/timer کشف‌شده نیز `systemctl stop EXACT_UNIT` اجرا کنید؛ cron writer باید موقتاً غیرفعال و وضعیت اولیهٔ آن ثبت شود. خروجی inactive و نبود پردازه‌های writer را بررسی کنید. مرحلهٔ بعد خودکار این کار را اثبات نمی‌کند.

```bash
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:$PATH
export DOTENV_CONFIG_PATH=/opt/hostel2/config/source-maintenance.env
cd /opt/hostel2/tools/persistence
node --import tsx scripts/backup.ts
SH
```

خروجی JSON باید `verified:true` و مسیر فایل نهایی داشته باشد. **مسیر همان فایل را ثبت کنید**؛ صرف وجود یک فایل دلیل سلامت نیست. سپس همان فایل را دوباره verify کنید:

```bash
BACKUP_FILE=/opt/hostel2/backups/yerevanhub-EXACT-OUTPUT.yhbak
```

دستور verify از checkout ابزار اجرا می‌شود تا resolver مربوط به `tsx` درست پیدا شود:

```bash
sudo -u hostel2 -H bash -c 'cd /opt/hostel2/tools/persistence && DOTENV_CONFIG_PATH=/opt/hostel2/config/source-maintenance.env /opt/hostel2/node/bin/node --import tsx scripts/backup.ts verify "$1"' bash "$BACKUP_FILE"
```

در صورت شکست، ادامه ندهید؛ `journalctl`/stderr و فضای دیسک را بررسی کنید. DB اصلی یا عکس گم‌شده را پاک نکنید.

حالا کپیِ SQLite با API رسمی backup و تمام مدیا در یک مقصد جدید ساخته می‌شود. WALهای commitشده داخل snapshot هستند؛ checkpoint اجباری یا کپی عادی `.db` انجام نمی‌شود:

```bash
sudo install -d -m 700 -o hostel2 -g hostel2 /opt/hostel2/imports
CANDIDATE=/opt/hostel2/imports/import-$(date -u +%Y%m%dT%H%M%SZ)
sudo -u hostel2 python3 /opt/hostel2/tools/persistence/ops/persistence/copy-storage.py \
  --offline --source-db "$SOURCE_DB" --source-media "$SOURCE_MEDIA" \
  --application-dir "$APP_DIR" --destination "$CANDIDATE"
sudo -u hostel2 test -f "$CANDIDATE/VERIFIED.json"
sudo -u hostel2 test ! -e "$CANDIDATE/INCOMPLETE"
```

والد اختصاصی imports خارج app و media است؛ مقصد کاندیدا باید جدید باشد. خود `VERIFIED.json` خصوصی است؛ عمومی ارسال نکنید.

خروجی باید `verified:true, sourceUnchanged:true` باشد. schema، ردیف‌های همهٔ جدول‌ها، FK، integrity، metadata مدیا و hash تمام فایل‌ها مقایسه می‌شوند. وجود `INCOMPLETE` یعنی کاندیدا قابل ارتقا نیست. دیتابیس مبدأ و تمام عکس‌ها حفظ می‌شوند. در صورت شکست، فقط کاندیدا را برای بررسی کنار بگذارید؛ مبدأ را تغییر ندهید.

## ۴. ارتقای دستی مسیرها و کد — فقط بعد از بازبینی نتیجه

این بخش نقطهٔ تغییر production است؛ خودکار اجرا نشده است. اگر `/opt/hostel2/data` یا `/opt/hostel2/media` موجود است، **توقف کنید** و ادغام/تطبیق جدا انجام دهید. بلوک زیر با اولین خطا در یک shell فرعی متوقف می‌شود و از جایگزینی جلوگیری می‌کند؛ فقط پس از موفقیت کامل آن، فایل جدید را در ویرایشگر باز کنید:

```bash
sudo bash -s -- "$CANDIDATE" <<'SH'
set -euo pipefail
candidate=$1
test -f "$candidate/VERIFIED.json"
test ! -e "$candidate/INCOMPLETE"
test ! -e /opt/hostel2/data
test ! -e /opt/hostel2/media
test ! -e /opt/hostel2/config/production.env
mv -T --no-clobber "$candidate/data" /opt/hostel2/data
mv -T --no-clobber "$candidate/media" /opt/hostel2/media
test ! -e "$candidate/data"
test ! -e "$candidate/media"
chown -R hostel2:hostel2 /opt/hostel2/data /opt/hostel2/media
chmod 700 /opt/hostel2/data /opt/hostel2/media
chmod 600 /opt/hostel2/data/hostel.db
install -m 640 -o root -g hostel2 /opt/hostel2/config/source-maintenance.env /opt/hostel2/config/production.env
SH
sudo nano /opt/hostel2/config/production.env
```

در فایل جدید تمام تنظیمات برنامه و اعتبارهای موجود را حفظ کنید و فقط موارد بازبینی‌شده را اصلاح کنید. قالب `ops/persistence/production.env.example` فهرست متغیرهاست، جایگزین کامل config موجود نیست:

```dotenv
APP_ENV=production
NODE_ENV=production
DEMO_MODE=false
PERSISTENT_STORAGE_MODE=managed
REQUIRE_MIGRATION_BACKUP=true
DATABASE_URL=file:/opt/hostel2/data/hostel.db
MEDIA_STORAGE=local
MEDIA_DIRECTORY=/opt/hostel2/media
BACKUP_DIRECTORY=/opt/hostel2/backups
BACKUP_MAX_BYTES=67108864
BACKUP_RETENTION_DAYS=30
BACKUP_RETENTION_MIN_COUNT=7
```

`BACKUP_ENCRYPTION_KEY` قبلی، `ADMIN_*`، origin، host و **پورت واقعی** را حفظ کنید. `NOTIFICATION_DELIVERY=disabled` فایل نگه‌داری را به تنظیم مورد نظر production برگردانید فقط پس از بررسی worker و جلوگیری از replay ناخواستهٔ اعلان‌ها. config جدید باید کامل باشد؛ متغیرهای باقیماندهٔ `.env` قدیمی نباید مسیرهای فعلی را تغییر دهند. EnvironmentFileِ systemd بر مقادیر dotenv عادی اولویت دارد، ولی برای CLI صریحاً `DOTENV_CONFIG_PATH` بگذارید.

کد جدید را پس از انتقال امن داده‌ها نصب کنید. SHA بازبینی‌شدهٔ checkout ابزار را ثبت کنید و همان commit را deploy کنید؛ از branch متغیر برای انتخاب بی‌بررسی release استفاده نکنید:

```bash
sudo -u hostel2 -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2/node/bin:$PATH
RELEASE_SHA=$(git -C /opt/hostel2/tools/persistence rev-parse HEAD)
cd /opt/hostel2/app
git status --short --branch
# If there are local modifications, stop and preserve/review them before switching.
test -z "$(git status --porcelain)"
git fetch origin codex/02-persistence-backup-recovery
git cat-file -e "$RELEASE_SHA^{commit}"
git switch --detach "$RELEASE_SHA"
npm ci
npm run build
SH
```

اگر کد مدیریت‌شده نیست یا permission متفاوت است، همان release را جدا آماده کنید؛ reset/stash خودکار داده‌های untracked انجام ندهید. DB اصلی قدیمی، config قبلی و media مبدأ را نگه دارید.

قفل مشترک را یک بار root به‌صورت انحصاری بسازد و مالک فایل را hostel2 قرار دهد. فایل موجود/فعال را truncate نکنید؛ اگر از قبل وجود دارد مالکیت و استفادهٔ آن را بررسی کنید:

```bash
sudo bash -c 'set -e; test ! -e /opt/hostel2/config/writers.lock; umask 077; set -C; : > /opt/hostel2/config/writers.lock; chown hostel2:hostel2 /opt/hostel2/config/writers.lock'
```

در configِ جدید بکاپ جاری دیگری بسازید، مسیر `file` آن را در `CURRENT_BACKUP` بگذارید. این بکاپ به هدف ارتقایافتهٔ جدید مربوط است، نه مبدأ قدیمی:

```bash
sudo -u hostel2 -H bash -c 'cd /opt/hostel2/app && DOTENV_CONFIG_PATH=/opt/hostel2/config/production.env /opt/hostel2/node/bin/node --import tsx scripts/backup.ts'
CURRENT_BACKUP=/opt/hostel2/backups/yerevanhub-EXACT-NEW-OUTPUT.yhbak
sudo -u hostel2 bash /opt/hostel2/app/ops/persistence/migrate-offline.sh \
  --offline --backup "$CURRENT_BACKUP"
sudo -u hostel2 -H bash -c 'cd /opt/hostel2/app && DOTENV_CONFIG_PATH=/opt/hostel2/config/production.env /opt/hostel2/node/bin/node --import tsx scripts/database.ts check'
```

باید `schemaReady:true`، `foreignKeyViolations:0` و `integrity_check:ok` باشد. migrationهای v1/v2/v3 و ارتقای provider/services تراکنشی در مراحل خود هستند؛ **کل زنجیره یک تراکنش واحد نیست**. اگر مرحله‌ای شکست بخورد، سرویس را شروع نکنید؛ بکاپ تأییدشده را به مقصد جدا بازیابی و مشکل را بررسی کنید. بازاجرای مرحلهٔ idempotent بعد از رفع علت و گرفتن بکاپ جدید انجام شود. rollback معکوس روی دیتابیس زنده راهکار خودکار این سند نیست.

سپس drop-in وب، drop-in روی **سرویس worker واقعی** و backup service/timer را بازبینی و نصب کنید؛ فایل‌های موجود را قبل از جایگزینی خصوصی حفظ کنید:

```bash
sudo install -d /etc/systemd/system/hostel2.service.d
sudo install -m 644 /opt/hostel2/app/ops/persistence/hostel2-persistence.conf /etc/systemd/system/hostel2.service.d/persistence.conf
sudo install -m 644 /opt/hostel2/app/ops/persistence/hostel2-backup.service /etc/systemd/system/hostel2-backup.service
sudo install -m 644 /opt/hostel2/app/ops/persistence/hostel2-backup.timer /etc/systemd/system/hostel2-backup.timer
sudo systemctl daemon-reload
sudo systemctl start hostel2
sudo systemctl status hostel2 --no-pager -l
sudo systemctl is-enabled hostel2
sudo journalctl -u hostel2 -n 60 --no-pager
```

اگر سرویس وب برای شروع پس از reboot فعال نیست، پس از تأیید تنظیمات `sudo systemctl enable hostel2` اجرا کنید. reboot واقعی VPS را به پنجرهٔ نگه‌داری جدا موکول و بعد از آن مسیر DB/مدیا و سلامت را دوباره بررسی کنید.

هیچ تنظیم Nginx در این کار تغییر نمی‌کند. host/port باید همچنان مطابق reverse proxy موجود باشد. workerهای مورد نیاز را با config جدید و flock شروع کنید؛ cron را فقط پس از اتصال به مسیر/قفل جدید برگردانید. سلامت `/` و `/api/app` را با پورت واقعی روی loopback و HTTPS عمومی، ورود حساب قدیمی، درخواست‌های قبلی و چند تصویر واقعی بررسی کنید. تغییر رکورد آزمایشی در production لازم نیست.

## ۵. زمان‌بندی و پایش

timer نمونه هر روز 03:40 به وقت `Asia/Yerevan` با حداکثر پنج دقیقه تأخیر تصادفی اجرا می‌شود و `Persistent=true` اجرای ازدست‌رفته را جبران می‌کند. پس از تست دستی و تعیین سیاست نگه‌داری فعال کنید:

```bash
sudo systemd-analyze verify /etc/systemd/system/hostel2-backup.service /etc/systemd/system/hostel2-backup.timer
sudo systemctl start hostel2-backup.service
sudo systemctl status hostel2-backup.service --no-pager -l
sudo journalctl -u hostel2-backup.service -n 80 --no-pager
sudo systemctl enable --now hostel2-backup.timer
sudo systemctl list-timers hostel2-backup.timer --all --no-pager
df -h /opt/hostel2/data /opt/hostel2/media /opt/hostel2/backups
```

خروجیِ موفق archive و receipt را نشان می‌دهد. سرویس oneshot بعد از موفقیت می‌تواند inactive باشد؛ `Result=success` و `ExecMainStatus=0` را نیز بررسی کنید. برای failed service و نبود بکاپ تازه هشدار مانیتورینگ موجود VPS را تنظیم کنید؛ این PR سرویس ایمیل/هشدار خارجی جدید نمی‌سازد. شکست با exit غیرصفر و journal ثبت می‌شود.

retention فقط با `BACKUP_RETENTION_DAYS` فعال است. نمونه: archiveهای بیش از ۳۰ روز، با حفظ حداقل ۷ recovery point معتبر. حداقل کمتر از ۲ رد می‌شود. **پیش از حذف هر archive دوباره decrypt/restore/integrity verify می‌شود**؛ فایل خراب، کلید نامتناسب، receipt غایب/ناسازگار و partial نگه داشته می‌شوند و skippedها خروجی خطای قابل پایش ایجاد می‌کنند. این رفتار برای بررسی اپراتور است؛ آن‌ها را خودکار پاک نکنید. هزینهٔ verification با تعداد بکاپ‌ها رشد می‌کند؛ زمان/دیسک را اندازه بگیرید.

یک کپی از archiveهای **رمز‌شده + رسیدها** را به فضای خارج VPS با SSH/ذخیره‌ساز موجود منتقل کنید و دوباره checksum را مقایسه کنید. کلید و env را همراه archive در همان مقصد نگذارید. این PR بدون مشخص بودن مقصد/اعتبارها، ارسال خارج VPS انجام نمی‌دهد. فرایند خارج VPS را خودتان زمان‌بندی و تست کنید؛ داشتن فایل روی همان VPS به تنهایی disaster recovery نیست.

## ۶. تمرین recovery در مقصد جدا

ابتدا archive مورد نظر را verify کنید. سپس مسیر جدیدی بیرون app، data و media فعال بسازید. زیرپوشهٔ `backups/recovery-*` مجزا است و retention فقط archiveهای بالای backups را بررسی می‌کند:

```bash
RECOVERY_DIR=/opt/hostel2/backups/recovery-$(date -u +%Y%m%dT%H%M%SZ)
sudo -u hostel2 mkdir -m 700 "$RECOVERY_DIR"
sudo -u hostel2 -H bash -c 'cd /opt/hostel2/app && DOTENV_CONFIG_PATH=/opt/hostel2/config/production.env RESTORE_DATABASE_URL="file:$1/check.db" RESTORE_MEDIA_DIRECTORY="$1/media" /opt/hostel2/node/bin/node --import tsx scripts/backup.ts restore "$2"' bash "$RECOVERY_DIR" "$BACKUP_FILE"
sudo -u hostel2 python3 - "$RECOVERY_DIR/check.db" <<'PY'
import sys,sqlite3,pathlib,urllib.parse,contextlib
file=pathlib.Path(sys.argv[1]).resolve(strict=True)
with contextlib.closing(sqlite3.connect('file:'+urllib.parse.quote(str(file),safe='/')+'?mode=ro',uri=True)) as db:
    assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    print('PASS recovery database integrity and foreign keys')
PY
```

به‌جای `BACKUP_FILE` دقیقاً archive مرتبط را انتخاب کنید؛ shellهای جدا متغیر قبلی را به ارث نمی‌برند. archive با کلید قدیمی باید با env خصوصی دارای همان کلید بررسی شود.

verify پیش از restore همهٔ مقادیر SQL و hash عکس‌ها را در هدف موقت بررسی کرده است. در هدف نگه‌داشته‌شده نیز تعداد/شناسهٔ حساب‌ها، رزروها، آگهی‌ها، hash credentialها و فایل‌های مدیا را با receipt/manifest زمان بکاپ تطبیق دهید؛ اطلاعات خصوصی را log نکنید. برای تست UI، این دیتابیس production را به staging کپی نکنید و worker دارای کلید واقعی روی آن بالا نیاورید. تمرین فوق فقط ابزار offline است و هیچ اعلان یا درخواست خارجی نمی‌فرستد.

اگر بازیابی شکست بخورد، مبدأ زنده تغییر نکرده است. مقصد ناموفق را نگه دارید و علت را بررسی کنید؛ restore CLI اجرای بعدی را روی فایل DB موجود رد می‌کند، بنابراین برای تلاش مجدد مقصد جدید انتخاب کنید. بازگرداندن سرویس به recovery DB یک عملیات جدا با پنجرهٔ نگه‌داری، بکاپ از وضعیت فعلی و تأیید اپراتور است.

## ۷. rollback امن

- قبل از پذیرش ترافیک جدید: در صورت توقف مهاجرت/راه‌اندازی، writerها را خاموش نگه دارید. config/unit/release قبلی و منبع اصلی دست‌نخورده‌اند. بازگشت به سرویس قبلی فقط پس از بررسی اینکه هنوز هیچ نوشتهٔ جدیدی روی هدف پذیرفته نشده انجام شود؛ drop-in جدید را کنار بگذارید، daemon-reload کنید و همان config/کد قبلی را اجرا کنید.
- پس از پذیرش ترافیک جدید: دیتابیس جدید مرجع است؛ اشارهٔ دوباره به منبع قدیمی موجب گم‌شدن ظاهری درخواست‌های جدید می‌شود. خودکار به DB قبلی یا بکاپ قدیمی برنگردید. ابتدا بکاپ تأییدشدهٔ وضعیت فعلی، recovery جدا و برنامهٔ تطبیق نوشته‌های جدید لازم است.
- rollback کد فقط به نسخه‌ای که با schema فعلی سازگار است و با **همان مسیرهای پایدار** انجام شود. migration معکوس قدیمی ممکن است اطلاعات جدید را پشتیبانی نکند؛ آن را برای رفع 502 بی‌بررسی اجرا نکنید.
- source اولیه، candidate report، کلیدها، config قبلی و بکاپ‌ها تا پایان پذیرش و سیاست نگه‌داری باقی می‌مانند. هیچ دستور حذف دیتابیس در این سند وجود ندارد.

## محدودیت‌های صریح

- بکاپ منطقی موجود برای schema پروژه (بدون view/trigger) پشتیبانی می‌شود. schema سفارشی با view/trigger **قبل از انتشار بکاپ رد می‌شود**؛ کپی فیزیکی offline Python آن‌ها را حفظ می‌کند، ولی برای چنین دیتابیسی زمان‌بندی منطقی را تا افزودن پشتیبانی و تست فعال نکنید.
- snapshot JSON در RAM ساخته می‌شود؛ سقف پیش‌فرض 64 MiB برای محتوای encodeشده است. در سقف/فضای ناکافی، بکاپ fail می‌شود؛ مدیا حذف/skip نمی‌شود. مقدار بزرگ‌تر را تنها با اندازه‌گیری RAM، اندازهٔ دیتابیس/مدیا و زمان بازیابی تعیین کنید. برای فایل بسیار بزرگ توسعهٔ فرمت streaming کار جداست.
- برای مدیای blob، دانلود فقط از origin مجاز Vercel با timeout و بررسی طول انجام می‌شود؛ حذف remote هم‌زمان می‌تواند بکاپ را fail کند. آرشیو ناقص موفق گزارش نمی‌شود. مسیر production managed این PR محلی است.
- filesystemهای غیرعادی فاقد hard-link/fsync مناسب باید جدا آزمایش شوند. فایل upload باید immutable بماند؛ جایگزینی درجا توسط ابزار خارجی خارج از قرارداد برنامه است.
- تست restart واقعی VPS، مجوزهای سرور شما، disk failure/power loss و مقصد بکاپ خارج VPS اجرا نشده‌اند. زمان recovery و ظرفیت دیسک production باید اندازه‌گیری شود. اجرای روزانه به معنی RPO حدود ۲۴ ساعت است؛ ادعای بدون ازدست‌دادن داده در حادثه وجود ندارد.
