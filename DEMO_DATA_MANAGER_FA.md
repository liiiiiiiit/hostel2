# دادهٔ ساختگی پایدار و مدیریت دسته‌ها — Task 03

این قابلیت برای **staging جدا** و sandbox خودکار است. روی production کار نمی‌کند؛ حتی اگر `DEMO_TOOLS_ENABLED=true` تنظیم شود. هیچ نقش جدیدی به مدل حساب‌ها اضافه نشده است. در این تغییر، VPS یا سایت زنده دست‌کاری نشده است.

شاخه: `codex/03-demo-data-manager`. مبنا Task 02 به SHA `e9f9f50a6b5a381c244674747fcae9a868f60d0c` است. شاخهٔ پیش‌فرض واقعی `codex/fix-menu-desktop-site-20261124` با SHA `fe1a6b3f7e55f71e51dfb23a694248826b434aa1` جداگانه بررسی شد. Task 01 و Task 02 هنوز تغییرات وابسته‌اند؛ این شاخه باید بعد از آن‌ها بازبینی و ادغام شود، نه اینکه خودکار جایگزین سایت زنده شود.

## داده‌های پیش‌فرض هر دسته

| نوع | تعداد |
|---|---:|
| مدیر هاستل | ۱۰ |
| هاستل | ۱۵ |
| نوع اتاق | ۶۰ |
| واحد فیزیکی تخت/اتاق | ۲۴۰ |
| مسافر دارای حساب | ۳۰ |
| ملک اجاره‌ای | ۲۰ |
| درخواست اجاره/بازدید | ۳۰ |
| کارفرما | ۱۵ |
| هویت متقاضی مهمان | ۴۰ |
| آگهی کار | ۳۰ |
| درخواست کار | ۸۰ |
| برگزارکننده تور | ۱۰ |
| تور | ۲۰ |
| رزرو تور | ۴۰ |
| خدمات | ۴۰ |
| درخواست خدمات | ۳۰ |
| رزرو هاستل | ۶۰ |
| مقاله | ۲۰ |
| نظر واجد شرایط | ۴۰ |
| کد تخفیف | ۱۰ |

۶۵ حساب عادی آزمایشی ایجاد می‌شود: ۱۰ مدیر هاستل + ۳۰ مسافر + ۱۵ کارفرما + ۱۰ برگزارکننده. مدیر staging موجود، عضو دسته نیست و حفظ می‌شود. **۴۰ متقاضی کار حساب کاربری جدید نیستند**؛ فرم فعلی کاریابی مهمان است. ۸۰ درخواست واقعاً در `job_applications` با ۴۰ آدرس متمایز `example.test` ذخیره می‌شود.

اعداد مربوط به **رکوردهای جدیدِ متعلق به دسته** هستند، نه کل دیتابیس. دادهٔ قبلی، دستهٔ دیگر و نمونه‌های پیش‌فرض موجود پاک یا تصاحب نمی‌شوند. مقدار واقعی جدول‌ها پس از import دوباره شمرده می‌شود و باید با درخواست برابر باشد.

## رابطه‌ها و رفتار

- هر مدیر حداقل یک هاستل از ۱۵ هاستل را مدیریت می‌کند؛ ۶۰ نوع اتاق دارای واحدهای فیزیکی معتبر، انواع dorm/private و قیمت AMD هستند.
- رزروهای هاستل به مسافران، هاستل، نوع اتاق، قیمت منجمد توافق و در صورت استفاده کوپن متصل‌اند. ۴۰ رزرو تاریخی از مسیر تأیید، تخصیص واحد، check-in و check-out عبور می‌کنند؛ سپس نظر ثبت می‌شود. پایان آن‌ها قبل از تاریخ مبناست. بررسی و رد/تأیید نظر با همان خدمات مدیریت موجود انجام می‌شود.
- دیگر رزروها، درخواست‌های اجاره، درخواست‌های کار و رزروهای تور وضعیت‌های واقعی موجود را پوشش می‌دهند. برای درخواست‌ها ابتدا آگهی قابل درخواست ساخته و تأیید می‌شود؛ سپس بعضی آگهی‌ها بسته/مخفی/منتشرنشده می‌شوند. به آگهی بسته درخواست جدید تحمیل نمی‌شود.
- کارفرما و برگزارکننده از همان `provider_accounts` و سطر پایهٔ `users` با نقش ذخیره‌شدهٔ traveler استفاده می‌کنند؛ نقش مؤثر ورود از پروفایل provider خوانده می‌شود. SQL خام `users.role='traveler'` به تنهایی تعداد مسافران عادی را نشان نمی‌دهد.
- خدمات با شش دستهٔ استاندارد موجود کار می‌کنند؛ دسته‌های قبلی تغییر نمی‌کنند. آن شش دسته باید موجود و فعال باشند، وگرنه import به‌صورت تراکنشی شکست می‌خورد. هیچ دستهٔ واقعی خودکار فعال/جایگزین نمی‌شود.
- محتوا در هاستل، ملک، خدمات و ترجمهٔ مقالات چهارزبانه است. مدل فعلی متن آگهی کار و تور تک‌زبانه است؛ برای آن‌ها ستون/ترجمهٔ ساختگی معرفی نشده است.
- عکس WebP محلی با نوشتهٔ SYNTHETIC TEST IMAGE تولید می‌شود؛ دانلود عکس، API هوش مصنوعی یا تماس خارجی وجود ندارد. تمام نام‌ها و نشانی‌ها صریحاً ساختگی‌اند؛ از تلفن واقعی، نام کسب‌وکار واقعی و آدرس ایمیل قابل تحویل استفاده نمی‌شود.
- برای قابل‌رزرو بودن نمونه‌ها، فیلدهای انتشار موجود معتبر ساخته می‌شوند؛ منطق انتشار/ظرفیت/مجوز دور زده نمی‌شود. تشخیص ساختگی بودن با نام‌های واضح، محیط ایزوله و provenance دسته است، نه گزینهٔ `publicPreview` که عمداً رزرو را منع می‌کند.

## پیش‌نیازهای staging

ابتدا راهنمای [STAGING_SETUP_FA.md](STAGING_SETUP_FA.md) و [PERSISTENCE_BACKUP_RECOVERY_FA.md](PERSISTENCE_BACKUP_RECOVERY_FA.md) را اجرا و بررسی کرده باشید. این سند به production اشاره نمی‌کند. مسیرها را با واحد واقعی staging تطبیق دهید:

```bash
sudo systemctl show hostel2-staging --no-pager \
  -p User -p WorkingDirectory -p ExecStart -p EnvironmentFiles
sudo systemctl status hostel2-staging --no-pager -l
```

مقادیر مورد انتظار:

| منبع | مسیر |
|---|---|
| کد staging | `/opt/hostel2-staging/app` |
| SQLite staging | `/opt/hostel2-staging/data/staging.db` |
| مدیا | `/opt/hostel2-staging/data/uploads` |
| فایل خصوصی حساب‌ها | `/opt/hostel2-staging/demo` |
| env خصوصی | `/etc/hostel2-staging/staging.env` |
| پورت loopback | ۳۰۰۲ |

دایرکتوری خصوصی را قبل از فعال کردن قابلیت بسازید؛ اگر از قبل موجود است، مالکیت و محتوا را ابتدا بررسی کنید:

```bash
sudo install -d -m 700 -o hostel2-staging -g hostel2-staging /opt/hostel2-staging/demo
sudoedit /etc/hostel2-staging/staging.env
```

به env مستقل staging اضافه کنید:

```dotenv
DEMO_TOOLS_ENABLED=true
DEMO_DIRECTORY=/opt/hostel2-staging/demo
NOTIFICATION_DELIVERY=disabled
```

`APP_ENV=staging`، `NODE_ENV=production`، `DEMO_MODE=false`، DB/media/backup اختصاصی، HTTPS/Basic Auth، پورت 3002 و cookie اختصاصی Task 01 را حفظ کنید. کلیدهای email/Telegram/SMS/payment/Gemini/blob و `DATABASE_AUTH_TOKEN` باید خالی باشند؛ ابزار با وجود آن‌ها متوقف می‌شود. production.env را کپی نکنید. از `source .env` در shell استفاده نکنید؛ رمزها ممکن است حروف ویژه داشته باشند.

کد بازبینی‌شدهٔ این شاخه را فقط در checkout staging نصب کنید. داده خارج app باقی می‌ماند:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:$PATH
cd /opt/hostel2-staging/app
git status --short --branch
test -z "$(git status --porcelain)"
git fetch origin codex/03-demo-data-manager
git switch --detach FETCH_HEAD
git log -1 --oneline
npm ci
npm run lint
npm run build
SH
```

در unit staging، فایل `ops/staging/hostel2-staging.service` به‌روز این شاخه را بازبینی کنید؛ `ReadWritePaths` اکنون دایرکتوری demo را نیز مجاز می‌کند. تنظیمات اختصاصی قبلی را حفظ کنید و نسخهٔ موجود unit را قبل از تغییر خصوصی نگه دارید. بعد از نصب unit بازبینی‌شده:

```bash
sudo systemctl daemon-reload
sudo systemctl restart hostel2-staging
sudo journalctl -u hostel2-staging -n 50 --no-pager
```

هیچ دستور stop/restart برای `hostel2.service` تولید وجود ندارد. تنظیم Nginx تولید تغییر نمی‌کند. پیش از اولین import یک بکاپ تأییدشدهٔ staging طبق Task 02 بگیرید.

## پنج فرمان CLI

همهٔ فرمان‌ها باید از کد staging و با dotenv خصوصی همان محیط اجرا شوند:

```bash
sudo -u hostel2-staging -H bash <<'SH'
set -euo pipefail
export PATH=/opt/hostel2-staging/node/bin:$PATH
export DOTENV_CONFIG_PATH=/etc/hostel2-staging/staging.env
cd /opt/hostel2-staging/app
npm run demo:generate -- --seed acceptance-01
SH
```

این فرمان preview و تنظیمات را در `demo_batches` نگه می‌دارد و فایل حساب‌ها را خصوصی می‌سازد؛ هنوز رکوردهای کسب‌وکار import نشده‌اند. `id` خروجی را ثبت کنید. در نشست CLI با همان PATH، DOTENV_CONFIG_PATH و cwd:

```bash
BATCH_ID=PUT_THE_EXACT_GENERATED_UUID_HERE
npm run demo:validate -- --batch "$BATCH_ID"
npm run demo:seed -- --batch "$BATCH_ID"
npm run demo:status
npm run demo:validate -- --batch "$BATCH_ID"
```

برای ساخت و import در یک فرمان نیز می‌توانید بنویسید:

```bash
npm run demo:seed -- --seed acceptance-02
```

این فرمان generate و import را انجام می‌دهد. اگر import شکست بخورد، دسته در وضعیت generated باقی می‌ماند و هیچ رکورد ناقص کسب‌وکار commit نمی‌شود. همان batch را بعد از رفع خطا دوباره import کنید. seed/config/date یکسان همان batch را می‌دهد؛ ساختن seed تازه به معنی **دستهٔ جدید** است، نه بازنویسی دستهٔ قدیمی.

حذف فقط برای دسته‌های انتخاب‌شده و بدون تغییر مجاز است:

```bash
npm run demo:cleanup -- --batch "$BATCH_ID" --confirm
```

چند UUID را با کاما به `--batch` بدهید. هیچ حالت `--all`، `--force`، reset یا حذف با الگوی email وجود ندارد. cleaned دوباره حذف شود، هیچ دادهٔ جدیدی حذف نمی‌شود؛ cleaned قابل import مجدد نیست و باید seed تازه انتخاب شود.

## تغییر تعداد و انتخاب بخش‌ها

مثلاً فایل خصوصی `/opt/hostel2-staging/demo/quantities.json`:

```json
{
  "seed": "services-and-articles-01",
  "modules": ["services", "articles"],
  "counts": {"services": 4, "serviceRequests": 2, "articles": 3}
}
```

```bash
npm run demo:generate -- --config /opt/hostel2-staging/demo/quantities.json
```

گروه‌های مجاز: `stays`, `rentals`, `jobs`, `tours`, `services`, `articles`, `coupons`. اعداد گروه‌های انتخاب‌نشده صفر می‌شوند. بقیهٔ مقدارها، پیش‌فرض همان گروه‌اند. وابستگی نامعتبر مثل درخواست بدون آگهی، نظر بیشتر از رزرو، مدیر بدون هاستل، متقاضی بیشتر از درخواست و اتاق کمتر از تعداد هاستل رد می‌شود. هر فیلد ۰ تا ۳۰۰۰ و مجموع primary records حداکثر ۱۰۰۰۰ است. بازهٔ رزروهای آینده از افق موجود ۸۹ روز تجاوز نمی‌کند؛ ظرفیت ورودی بیش از ۸۰ رزرو به ازای هر نوع اتاق پذیرفته نمی‌شود.

`baseDate` اختیاری، تاریخ ISO محلی مبناست. import باید با تاریخ امروز ایروان انجام شود؛ یک preview قدیمی را به‌طور پنهانی تاریخ‌گذاری مجدد نمی‌کنیم. batchهای واردشده بعد از عبور روز بازنویسی نمی‌شوند. برای import تازه در روز جدید، generate جدید با تاریخ امروز انجام دهید.

اجرای bulk همگام و تراکنشی است؛ برای مقدارهای بزرگ CLI را در پنجرهٔ آرام staging ترجیح دهید. هیچ صفِ import پس‌زمینه‌ای ادعا نشده است. اگر مرورگر/پروکسی timeout شد، ابتدا `demo:status` و `demo:validate` را بررسی کنید؛ وضعیت commit‌شده مرجع است. retry همان batch رکورد تکراری نمی‌سازد.

## متن اختیاری تولیدشده با هوش مصنوعی

مولد پیش‌فرض کاملاً آفلاین است. برای استفادهٔ اختیاری از هوش مصنوعی، بیرون staging متنی کاملاً ساختگی و با نشان تست تهیه کنید و JSON آن را وارد کنید؛ این قابلیت به Gemini یا سرویس واقعی وصل نمی‌شود.

نمونهٔ `content.json`:

```json
{
  "services": [{
    "fa": "کلینیک کاملاً ساختگی برای آزمون رابط کاربری",
    "en": "Fictional clinic content for interface testing only",
    "ru": "Вымышленная клиника только для теста",
    "hy": "Հորինված կլինիկա միայն փորձարկման համար"
  }]
}
```

```bash
npm run demo:generate -- --seed offline-text-01 --content /opt/hostel2-staging/demo/content.json
```

کلیدهای محتوا: `hostels`, `rentals`, `jobs`, `tours`, `services`, `articles`؛ هر کدام آرایه‌ای از متن‌های fa/en/ru/hy. فقط متن ساده پذیرفته می‌شود؛ HTML، لینک، آدرس ایمیل و شمارهٔ تماس در enrichment رد می‌شوند. این فایل نمی‌تواند نقش، رمز، مالکیت، شناسه، قیمت، تماس یا وضعیت تراکنش را تغییر دهد. متن AI نیز از همان schemaها و خدمات عادی می‌گذرد. برای مدل تک‌زبانهٔ job/tour از متن انگلیسی آن استفاده می‌شود.

## پنل مدیر staging

پس از ورود از منوی معمول سایت به حساب مدیر staging:

1. پنل مدیر → «مدیریت دادهٔ آزمایشی».
2. بخش‌ها، تعدادها و seed را انتخاب و پیش‌نمایش را بسازید.
3. رکوردهای preview صفحه‌بندی‌شده را مرور و validate کنید.
4. «واردکردن به staging» را بزنید؛ پیام موفقیت فقط بعد از commit دیتابیس نمایش داده می‌شود.
5. دسته‌ها، تعدادهای درخواستی، جدول‌های دارای provenance و وضعیت generated/imported/cleaned قابل مشاهده‌اند.
6. برای پاک‌سازی، دسته‌های مشخص را انتخاب و پیام حذف را تأیید کنید.

پنل و متن‌های آن fa/en/ru/hy و RTL/LTR دارند. در production این تب نشان داده نمی‌شود و `/api/demo` ثبت نمی‌شود. endpoint صرفاً staging/testing فعال، session مدیر فعال، Origin درست و header متعارف برنامه را می‌پذیرد. مجوز مدیر در خود تراکنش نیز از دیتابیس دوباره کنترل می‌شود. درخواست‌های سنگین و خواندنی سهمیه‌های جدا دارند. رمز، hash رمز و private tracking token در پاسخ پنل برگردانده نمی‌شود.

## فایل حساب‌ها و ماندگاری

فایل هر دسته:

```text
/opt/hostel2-staging/demo/<BATCH_UUID>.demo-manifest.json
```

دایرکتوری 0700 و فایل 0600 است؛ نقش، نام، ایمیل و رمز تصادفی هر حساب در آن ذخیره می‌شود. فایل در Git نیست و الگوی آن در `.gitignore` نیز ممنوع شده است. فقط صاحب محیط staging از طریق SSH/ویرایشگر امن فایل را بخواند؛ محتوا را در issue، PR، log یا screenshot منتشر نکنید. CLI و پنل فقط نام فایل را گزارش می‌کنند.

رمزها با scrypt موجود پروژه هش می‌شوند؛ password خام در `demo_batches`، `demo_records` یا جدول کاربران ذخیره نمی‌شود. تصادفی بودن رمزها، saltها و private tokenها عمدی است؛ **تعریف آفلاین fixture با seed/config/date ثابت تکرارپذیر است، ولی secretها ثابت یا قابل حدس ساخته نمی‌شوند**. شناسه‌های reference و timestampهای تولیدشده توسط خدمات موجود نیز مانند جریان عادی در زمان import ساخته می‌شوند؛ تکرارپذیری مربوط به recipe و ورودی‌هاست، نه یکسان بودن بایت‌به‌بایت دو دیتابیس مستقل. فایل خصوصی موجود در تکرار import جایگزین نمی‌شود. دست‌کاری یا گم‌شدن manifest جلوی import را می‌گیرد؛ دادهٔ واردشده همچنان از دیتابیس کار می‌کند و مدیر می‌تواند از جریان معمول reset password استفاده کند.

کد و dist زیر app هستند، ولی DB، مدیا و manifest بیرون app می‌مانند. rebuild، npm ci و restart فایل‌ها را پاک نمی‌کنند. provenance همراه بکاپ SQLite Task 02 ذخیره می‌شود. فایل plaintext خصوصی حساب‌ها داخل بکاپ SQL/مدیا نیست؛ آن را جدا با راهکار رمزگذاری‌شدهٔ امن خود نگه دارید. برای تست، گم‌شدن manifest مجوز چاپ/بازسازی رمزهای قبلی از hash نیست.

## پاک‌سازی محافظه‌کارانه

`demo_records` برای هر ردیف تازه، جدول، کلید اصلی و hash ذخیره می‌کند. import قبل/بعد همهٔ ردیف‌ها را مقایسه می‌کند و اجازهٔ تغییر رکورد قبلی را نمی‌دهد. cleanup تنها مالکیت دستهٔ انتخاب‌شده را می‌پذیرد؛ رکورد ویرایش‌شده، وابستگی خارجی، saved place یا استفادهٔ بیرونی از عکس باعث rollback حذف می‌شود. همهٔ FKها و روابط ضعیف قدیمی provider نیز دوباره بررسی می‌شوند. ردیف‌های نامرتبط باید عیناً باقی بمانند.

sessionها و auth tokenهای حساب‌های ساختگیِ حذف‌شده لغو می‌شوند. تاریخچهٔ batch پاک نمی‌شود؛ وضعیت cleaned می‌گیرد. حذف عادی auditهای قدیمی به‌وسیلهٔ سیاست ۵۰۰رویدادی برنامه، به‌تنهایی ادعای تغییر دادهٔ کسب‌وکار نیست؛ ردیف audit مفقود تحمل می‌شود، اما audit موجود و ویرایش‌شده محافظت می‌شود. import چند دسته، audit موجود را برای ساخت دادهٔ جدید حذف نمی‌کند.

**فایل placeholder و manifest خصوصی عمداً در cleanup نگه داشته می‌شوند.** حذف filesystem داخل تراکنش SQL نمی‌تواند rollback ایمن داشته باشد. پس از حذف metadata، عکسِ بدون مرجع از API قابل دریافت نیست؛ فایل کوچکِ باقی‌مانده recovery evidence است و GC فیزیکی خودکار در این کار پیاده نشده است. آن را بدون سیاست نگه‌داری/بکاپ پاک نکنید.

اگر خودتان آگهی، رزرو، رمز یا وضعیت درخواست را تغییر داده‌اید، batch دیگر untouched نیست؛ cleanup محافظه‌کارانه آن را حذف نمی‌کند. همین‌طور تغییر خودکار وضعیت رزرو با worker ممکن است باعث محافظت از دسته شود. برای ادامهٔ تست یک seed یا sandbox تازه بسازید؛ force-delete یا تغییر hashهای provenance برای عبور از کنترل ارائه نشده است.

## قابلیت‌هایی که در نسخهٔ فعلی وجود ندارند

- پنل مستقل کارجوی ثبت‌نام‌شده و پروفایل رزومه وجود ندارد؛ متقاضی مهمان فرم می‌دهد و reference پیگیری می‌گیرد.
- نقش rental_owner یا service_provider وجود ندارد؛ اجاره و خدمات را مدیر مدیریت می‌کند.
- مدل متن آگهی کار و تور چهار ستون زبانی ندارد؛ زبان رابط کاربری با زبان محتوای آن‌ها متفاوت است.
- صف پس‌زمینهٔ bulk import، force-cleanup رکورد ویرایش‌شده، انتقال staging به production و تماس آنلاین با AI پیاده نشده‌اند. هیچ‌کدام برای واقعی نشان دادن دادهٔ ساختگی اضافه نشده است.

## sandbox محلی جدا برای اجرای مجدد

این مثال فقط برای محیط توسعهٔ مجاز است؛ مسیر باید جدید، خارج Git/app، خصوصی و خارج مسیرهای هر deployment باشد. **نام production یا staging واقعی را برای آن انتخاب نکنید.**

```bash
umask 077
mkdir -m 700 /ABSOLUTE/NEW/PRIVATE/SANDBOX
```

فایل `sandbox.env` داخل آن با permission 0600:

```dotenv
APP_ENV=testing
NODE_ENV=test
DEMO_MODE=false
DEMO_TOOLS_ENABLED=true
DEMO_SANDBOX_ROOT=/ABSOLUTE/NEW/PRIVATE/SANDBOX
DEMO_DIRECTORY=/ABSOLUTE/NEW/PRIVATE/SANDBOX/demo
DATABASE_URL=file:/ABSOLUTE/NEW/PRIVATE/SANDBOX/staging.db
MEDIA_STORAGE=local
MEDIA_DIRECTORY=/ABSOLUTE/NEW/PRIVATE/SANDBOX/uploads
NOTIFICATION_DELIVERY=disabled
APP_URL=http://127.0.0.1:3903
DATABASE_AUTH_TOKEN=
RESEND_API_KEY=
NOTIFICATION_FROM=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
GEMINI_API_KEY=
BLOB_READ_WRITE_TOKEN=
```

هیچ کلید خارجی دیگری در shell باقی نگذارید؛ ابزار تمام credentialهای ارسال را رد می‌کند. سپس از checkout پروژه:

```bash
DOTENV_CONFIG_PATH=/ABSOLUTE/NEW/PRIVATE/SANDBOX/sandbox.env npm run demo:seed -- --init --seed local-acceptance-01
```

`--init` فقط در testing و برای فایل DB غایب مجاز است؛ نمی‌تواند staging یا دیتابیس موجود را reset کند. مدیر sandbox با رمز تصادفی ساخته و در `demo/bootstrap.demo-manifest.json` نگه داشته می‌شود. در صورت قطع اولین init و باقی‌ماندن فایل ناقص، مسیرها را بررسی یا sandbox جدید بسازید؛ فایل موجود خودکار overwrite نمی‌شود.

نتایج اجرا، شمارش‌های واقعی و محدودیت‌های بررسی در [DEMO_DATA_VERIFICATION.md](DEMO_DATA_VERIFICATION.md) ثبت شده‌اند.
