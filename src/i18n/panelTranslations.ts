import { AppLanguage } from '../types';

export interface AdminTranslations {
  panelTitle: string;
  panelSubtitle: string;
  tabKpi: string;
  tabBookings: string;
  tabHostels: string;
  tabManagers: string;
  tabCoupons: string;
  tabReviews: string;
  tabRentals: string;
  tabArticles: string;
  tabAudit: string;

  // KPI Dashboard
  urgentArrivalsAlert: string;
  urgentArrivalsDesc: string;
  entranceIssuesAlert: string;
  entranceIssuesDesc: string;
  kpiPendingBookings: string;
  kpiUrgentImmediate: string;
  kpiEntranceIssues: string;
  kpiHostelsCount: string;
  kpiRentalsCount: string;
  kpiActiveCoupons: string;
  kpiTotalReviews: string;
  kpiSystemLogs: string;
  quickActionsTitle: string;
  manageBookingsAction: string;
  createCouponAction: string;
  publishArticleAction: string;

  // Bookings
  filterAll: string;
  filterPending: string;
  filterConfirmed: string;
  filterCompleted: string;
  filterCancelled: string;
  filterRejected: string;
  tableColCode: string;
  tableColGuest: string;
  tableColHostel: string;
  tableColRoom: string;
  tableColDates: string;
  tableColGuests: string;
  tableColAmount: string;
  tableColStatus: string;
  tableColActions: string;
  btnConfirm: string;
  btnReject: string;
  btnComplete: string;
  btnPassengerLink: string;
  btnSentGuide: string;
  noBookingsFound: string;
  immediateArrivalBadge: string;
  entranceIssueBadge: string;

  // Hostels
  hostelsListTitle: string;
  receptionLabel: string;
  addressLabel: string;
  phoneLabel: string;
  doorCodeLabel: string;
  priceFromLabel: string;
  instantStayStatusLabel: string;
  instantStayActive: string;
  instantStayInactive: string;
  toggleInstantStayBtn: string;
  viewOnSiteBtn: string;

  // Managers
  createManagerTitle: string;
  managerNameLabel: string;
  managerEmailLabel: string;
  assignedHostelLabel: string;
  initialPasswordLabel: string;
  createManagerBtn: string;
  activeManagersTitle: string;
  roleBadge: string;

  // Coupons
  couponsNoticeTitle: string;
  couponsNoticeDesc: string;
  createCouponTitle: string;
  couponCodeLabel: string;
  couponPercentLabel: string;
  couponMinAmountLabel: string;
  couponMaxUsesLabel: string;
  couponDescLabel: string;
  createCouponBtn: string;
  existingCouponsTitle: string;
  colCouponCode: string;
  colDiscount: string;
  colUsage: string;
  colExpires: string;
  colDescription: string;
  colStatus: string;
  activeStatus: string;
  inactiveStatus: string;
  deleteCouponBtn: string;

  // Reviews
  reviewsTitle: string;
  pendingReviewsCount: string;
  ratingLabel: string;
  replyToGuestLabel: string;
  replyPlaceholder: string;
  btnApprove: string;
  noReviewsFound: string;

  // Rentals
  rentalsInquiriesTitle: string;
  colProperty: string;
  colInquirer: string;
  colRentalType: string;
  colMoveIn: string;
  colDuration: string;
  statusPendingReview: string;
  statusContacted: string;
  statusClosed: string;

  // Articles & Image Studio
  articlesTitle: string;
  createArticleTitle: string;
  imageStudioTitle: string;
  imageStudioDesc: string;
  modePreset: string;
  modeUpload: string;
  modeUrl: string;
  customUrlPlaceholder: string;
  uploadBtn: string;
  selectedImagePreview: string;
  articleTitleLabel: string;
  articleCategoryLabel: string;
  articleSummaryLabel: string;
  articleContentLabel: string;
  articleTagsLabel: string;
  articleLangLabel: string;
  articleStatusLabel: string;
  statusPublished: string;
  statusDraft: string;
  saveArticleBtn: string;
  publishedArticlesTitle: string;
  colImage: string;
  colArticleTitle: string;
  colCategory: string;
  colLanguage: string;
  colVerifiedDate: string;

  // Audit Logs
  auditTitle: string;
  auditSubtitle: string;
  colTimestamp: string;
  colAction: string;
  colUser: string;
  colDetails: string;
}

export interface ManagerTranslations {
  panelTitle: string;
  instantStayWidgetTitle: string;
  instantStayWidgetDescActive: string;
  instantStayWidgetDescInactive: string;
  disableInstantStayBtn: string;
  enableInstantStayBtn: string;
  pendingBookingsAlert: string;
  bookingsListTitle: string;
  roomLabel: string;
  datesLabel: string;
  quantityLabel: string;
  amountOnArrivalLabel: string;
  guestRequestLabel: string;
  passengerLinkBtn: string;
  confirmBtn: string;
  rejectBtn: string;
  completeBtn: string;
  noShowBtn: string;
  immediateBadge: string;
  bedsCountText: string;
  personsCountText: string;
}

export const ADMIN_TRANSLATIONS: Record<AppLanguage, AdminTranslations> = {
  fa: {
    panelTitle: 'پنل مدیریت کل',
    panelSubtitle: 'مدیریت یکپارچه هاستل‌ها، املاک، رزروها، تخفیف‌ها، نظرات و مقالات',
    tabKpi: 'داشبورد و آمار اصلی',
    tabBookings: 'مدیریت رزروها',
    tabHostels: 'هاستل‌ها و تخت‌ها',
    tabManagers: 'حساب‌های هاستل‌دار',
    tabCoupons: 'کدهای تخفیف درصدی',
    tabReviews: 'بررسی نظرات مسافران',
    tabRentals: 'املاک و استعلام‌ها',
    tabArticles: 'افزودن و انتشار مقالات',
    tabAudit: 'گزارش وقایع و امنیت',

    urgentArrivalsAlert: 'ورود فوری بدون پاسخ',
    urgentArrivalsDesc: 'مسافری در ایروان حضور دارد و منتظر تأیید فوری است.',
    entranceIssuesAlert: 'گزارش مشکل در ورود',
    entranceIssuesDesc: 'مسافر در محل هاستل با مشکل درب یا پذیرش مواجه شده است.',
    kpiPendingBookings: 'رزروهای در انتظار بررسی',
    kpiUrgentImmediate: 'ورودهای فوری منتظر اقدام',
    kpiEntranceIssues: 'مشکلات ورود گزارش‌شده',
    kpiHostelsCount: 'هاستل‌های فعال در سامانه',
    kpiRentalsCount: 'املاک و آپارتمان‌ها',
    kpiActiveCoupons: 'کدهای تخفیف فعال',
    kpiTotalReviews: 'کل نظرات ثبت‌شده',
    kpiSystemLogs: 'رویدادهای امنیتی ثبت‌شده',
    quickActionsTitle: 'دسترسی‌های سریع مدیریتی',
    manageBookingsAction: 'بررسی و تأیید رزروها',
    createCouponAction: 'ایجاد کد تخفیف جدید',
    publishArticleAction: 'نگارش و انتشار مقاله جدید',

    filterAll: 'همه',
    filterPending: 'در انتظار بررسی',
    filterConfirmed: 'تأییدشده',
    filterCompleted: 'تکمیل‌شده',
    filterCancelled: 'لغوشده',
    filterRejected: 'ردشده',
    tableColCode: 'کد پیگیری',
    tableColGuest: 'نام مسافر و تماس',
    tableColHostel: 'هاستل',
    tableColRoom: 'نوع اتاق',
    tableColDates: 'تاریخ اقامت',
    tableColGuests: 'تعداد تخت / نفر',
    tableColAmount: 'مبلغ به درام (AMD)',
    tableColStatus: 'وضعیت',
    tableColActions: 'عملیات',
    btnConfirm: 'تأیید رزرو',
    btnReject: 'رد رزرو',
    btnComplete: 'تکمیل اقامت',
    btnPassengerLink: 'لینک اختصاصی مسافر',
    btnSentGuide: 'راهنمای ورود ارسال شد',
    noBookingsFound: 'هیچ رزروی در این بخش یافت نشد.',
    immediateArrivalBadge: 'ورود فوری',
    entranceIssueBadge: 'مشکل ورود',

    hostelsListTitle: 'هاستل‌های ثبت‌شده در ارمنستان',
    receptionLabel: 'ساعت پذیرش:',
    addressLabel: 'نشانی:',
    phoneLabel: 'شماره تماس:',
    doorCodeLabel: 'کد درب ورودی:',
    priceFromLabel: 'شروع قیمت از:',
    instantStayStatusLabel: 'پذیرش ورود فوری:',
    instantStayActive: 'فعال (آماده پذیرش شبانه)',
    instantStayInactive: 'غیرفعال',
    toggleInstantStayBtn: 'تغییر وضعیت ورود فوری',
    viewOnSiteBtn: 'مشاهده در سایت',

    createManagerTitle: 'ایجاد حساب کاربری برای مدیر هاستل',
    managerNameLabel: 'نام کامل مدیر هاستل',
    managerEmailLabel: 'ایمیل ورود مدیر',
    assignedHostelLabel: 'هاستل تحت مدیریت',
    initialPasswordLabel: 'رمز عبور اولیه',
    createManagerBtn: 'ایجاد و ثبت حساب مدیر',
    activeManagersTitle: 'مدیران هاستل فعال در سامانه',
    roleBadge: 'هاستل‌دار',

    couponsNoticeTitle: 'راهنمای کدهای تخفیف سامانه',
    couponsNoticeDesc: 'کدهای تخفیف به صورت درصدی روی مبلغ کل رزرو اعمال می‌شوند. کدهای پیش‌فرض را می‌توانید فعال/غیرفعال کرده یا حذف نمایید.',
    createCouponTitle: 'ثبت کد تخفیف جدید',
    couponCodeLabel: 'کد تخفیف (لاتین)',
    couponPercentLabel: 'درصد تخفیف (%)',
    couponMinAmountLabel: 'حداقل مبلغ رزرو (AMD)',
    couponMaxUsesLabel: 'حداکثر دفعات استفاده',
    couponDescLabel: 'توضیحات و مناسبت تخفیف',
    createCouponBtn: 'ثبت کد تخفیف',
    existingCouponsTitle: 'کدهای تخفیف تعریف‌شده در سیستم',
    colCouponCode: 'کد',
    colDiscount: 'درصد',
    colUsage: 'مصرف / ظرفیت',
    colExpires: 'تاریخ انقضا',
    colDescription: 'توضیحات',
    colStatus: 'وضعیت',
    activeStatus: 'فعال',
    inactiveStatus: 'غیرفعال',
    deleteCouponBtn: 'حذف کد',

    reviewsTitle: 'بررسی و پاسخ‌گویی به نظرات مسافران',
    pendingReviewsCount: 'نظر در انتظار تأیید',
    ratingLabel: 'امتیاز:',
    replyToGuestLabel: 'پاسخ رسمی مدیریت به مسافر:',
    replyPlaceholder: 'پاسخ محترمانه خود را به نظر مسافر بنویسید...',
    btnApprove: 'تأیید و انتشار نظر',
    noReviewsFound: 'نظری در این بخش وجود ندارد.',

    rentalsInquiriesTitle: 'استعلام‌های اجاره آپارتمان مسافران',
    colProperty: 'ملک / واحد',
    colInquirer: 'متقاضی و تماس',
    colRentalType: 'نوع قرارداد',
    colMoveIn: 'تاریخ ورود',
    colDuration: 'مدت اقامت',
    statusPendingReview: 'در انتظار بررسی',
    statusContacted: 'تماس گرفته شد',
    statusClosed: 'بسته شد',

    articlesTitle: 'مدیریت و انتشار مقالات راهنما',
    createArticleTitle: 'افزودن مقاله جدید به راهنمای ارمنستان',
    imageStudioTitle: 'استودیوی تصویر مقاله',
    imageStudioDesc: 'تصویر شاخص باکیفیت برای مقاله خود انتخاب کنید یا از تصاویر آماده ارمنستان استفاده نمایید.',
    modePreset: 'تصاویر شاخص ارمنستان',
    modeUpload: 'بارگذاری عکس از دستگاه',
    modeUrl: 'لینک مستقیم تصویر',
    customUrlPlaceholder: 'https://images.unsplash.com/... آدرس مستقیم تصویر',
    uploadBtn: 'انتخاب فایل از حافظه دستگاه',
    selectedImagePreview: 'پیش‌نمایش تصویر انتخابی مقاله',
    articleTitleLabel: 'عنوان مقاله',
    articleCategoryLabel: 'دسته‌بندی موضوعی',
    articleSummaryLabel: 'خلاصه کوتاه برای پیش‌نمایش',
    articleContentLabel: 'متن کامل مقاله (راهنمای مستند)',
    articleTagsLabel: 'برچسب‌ها (با کاما جدا کنید)',
    articleLangLabel: 'زبان اصلی مقاله',
    articleStatusLabel: 'وضعیت انتشار',
    statusPublished: 'انتشار عمومی در راهنما',
    statusDraft: 'پیش‌نویس محرمانه',
    saveArticleBtn: 'ذخیره و انتشار مقاله',
    publishedArticlesTitle: 'مقالات ثبت‌شده در سامانه',
    colImage: 'تصویر',
    colArticleTitle: 'عنوان مقاله',
    colCategory: 'دسته‌بندی',
    colLanguage: 'زبان',
    colVerifiedDate: 'تاریخ راستی‌آزمایی',

    auditTitle: 'گزارش وقایع و امنیت سامانه (Audit Log)',
    auditSubtitle: 'ردیابی خودکار تمامی ورودها، تغییرات وضعیت، کدهای تخفیف و اقدامات امنیتی',
    colTimestamp: 'زمان رویداد',
    colAction: 'نوع عملیات',
    colUser: 'کاربر مجری',
    colDetails: 'جزئیات رویداد',
  },

  en: {
    panelTitle: 'Master Admin Panel',
    panelSubtitle: 'Unified management of hostels, rentals, bookings, coupons, reviews and articles',
    tabKpi: 'Dashboard & KPIs',
    tabBookings: 'Bookings',
    tabHostels: 'Hostels & Beds',
    tabManagers: 'Manager Accounts',
    tabCoupons: 'Discount Coupons',
    tabReviews: 'Reviews Moderation',
    tabRentals: 'Rentals & Inquiries',
    tabArticles: 'Publish Articles',
    tabAudit: 'Audit Logs & Security',

    urgentArrivalsAlert: 'Unanswered Instant Arrival',
    urgentArrivalsDesc: 'A traveler is currently in Yerevan waiting for instant check-in confirmation.',
    entranceIssuesAlert: 'Entrance Issue Reported',
    entranceIssuesDesc: 'Traveler reported trouble with hostel door code or front desk admission.',
    kpiPendingBookings: 'Pending Bookings',
    kpiUrgentImmediate: 'Urgent Instant Arrivals',
    kpiEntranceIssues: 'Reported Entrance Issues',
    kpiHostelsCount: 'Active Hostels in System',
    kpiRentalsCount: 'Rental Properties',
    kpiActiveCoupons: 'Active Discount Coupons',
    kpiTotalReviews: 'Total Submitted Reviews',
    kpiSystemLogs: 'Recorded Security Logs',
    quickActionsTitle: 'Quick Management Actions',
    manageBookingsAction: 'Review & Confirm Bookings',
    createCouponAction: 'Create New Discount Coupon',
    publishArticleAction: 'Write & Publish Guide Article',

    filterAll: 'All',
    filterPending: 'Pending',
    filterConfirmed: 'Confirmed',
    filterCompleted: 'Completed',
    filterCancelled: 'Cancelled',
    filterRejected: 'Rejected',
    tableColCode: 'Tracking Code',
    tableColGuest: 'Guest & Contact',
    tableColHostel: 'Hostel',
    tableColRoom: 'Room Type',
    tableColDates: 'Dates',
    tableColGuests: 'Beds / Guests',
    tableColAmount: 'Amount (AMD)',
    tableColStatus: 'Status',
    tableColActions: 'Actions',
    btnConfirm: 'Confirm Booking',
    btnReject: 'Reject',
    btnComplete: 'Complete Stay',
    btnPassengerLink: 'Guest Private Link',
    btnSentGuide: 'Entrance Guide Sent',
    noBookingsFound: 'No bookings found in this category.',
    immediateArrivalBadge: 'Instant Arrival',
    entranceIssueBadge: 'Entrance Issue',

    hostelsListTitle: 'Registered Hostels in Armenia',
    receptionLabel: 'Reception Hours:',
    addressLabel: 'Address:',
    phoneLabel: 'Phone:',
    doorCodeLabel: 'Door Code:',
    priceFromLabel: 'Starting From:',
    instantStayStatusLabel: 'Instant Check-in Mode:',
    instantStayActive: 'Active (Ready for Night Arrivals)',
    instantStayInactive: 'Inactive',
    toggleInstantStayBtn: 'Toggle Instant Check-in',
    viewOnSiteBtn: 'View on Site',

    createManagerTitle: 'Create Hostel Manager Account',
    managerNameLabel: 'Manager Full Name',
    managerEmailLabel: 'Manager Login Email',
    assignedHostelLabel: 'Assigned Hostel',
    initialPasswordLabel: 'Initial Password',
    createManagerBtn: 'Create Manager Account',
    activeManagersTitle: 'Active Hostel Managers',
    roleBadge: 'Manager',

    couponsNoticeTitle: 'System Discount Coupons Guide',
    couponsNoticeDesc: 'Discount coupons apply a percentage reduction to the total booking fee. You can add new codes, toggle active status, or delete existing demo codes.',
    createCouponTitle: 'Create New Discount Coupon',
    couponCodeLabel: 'Coupon Code (Latin)',
    couponPercentLabel: 'Discount Percentage (%)',
    couponMinAmountLabel: 'Min Booking Amount (AMD)',
    couponMaxUsesLabel: 'Max Usage Limit',
    couponDescLabel: 'Description / Promotion Note',
    createCouponBtn: 'Create Coupon',
    existingCouponsTitle: 'Configured Coupons in System',
    colCouponCode: 'Code',
    colDiscount: 'Discount',
    colUsage: 'Used / Limit',
    colExpires: 'Expires',
    colDescription: 'Description',
    colStatus: 'Status',
    activeStatus: 'Active',
    inactiveStatus: 'Inactive',
    deleteCouponBtn: 'Delete Code',

    reviewsTitle: 'Guest Reviews Moderation',
    pendingReviewsCount: 'reviews pending moderation',
    ratingLabel: 'Rating:',
    replyToGuestLabel: 'Official Management Reply:',
    replyPlaceholder: 'Type a professional reply to the guest review...',
    btnApprove: 'Approve & Publish',
    noReviewsFound: 'No reviews found in this category.',

    rentalsInquiriesTitle: 'Apartment & House Inquiries',
    colProperty: 'Property',
    colInquirer: 'Inquirer & Contact',
    colRentalType: 'Contract Type',
    colMoveIn: 'Move-in Date',
    colDuration: 'Stay Duration',
    statusPendingReview: 'Pending Review',
    statusContacted: 'Contacted',
    statusClosed: 'Closed',

    articlesTitle: 'Guide Articles Management',
    createArticleTitle: 'Add New Article to Armenia Guide',
    imageStudioTitle: 'Article Image Studio',
    imageStudioDesc: 'Select high-resolution Armenia imagery or upload custom visuals for this guide.',
    modePreset: 'Curated Armenia Presets',
    modeUpload: 'Upload From Device',
    modeUrl: 'Direct Image URL',
    customUrlPlaceholder: 'https://images.unsplash.com/... Direct image URL',
    uploadBtn: 'Choose file from your computer',
    selectedImagePreview: 'Selected Article Featured Image',
    articleTitleLabel: 'Article Title',
    articleCategoryLabel: 'Category',
    articleSummaryLabel: 'Short Summary for Preview',
    articleContentLabel: 'Full Article Content (Markdown / Text)',
    articleTagsLabel: 'Tags (comma-separated)',
    articleLangLabel: 'Article Language',
    articleStatusLabel: 'Publication Status',
    statusPublished: 'Published to Public Guide',
    statusDraft: 'Internal Draft',
    saveArticleBtn: 'Save & Publish Article',
    publishedArticlesTitle: 'Articles in System',
    colImage: 'Image',
    colArticleTitle: 'Title',
    colCategory: 'Category',
    colLanguage: 'Language',
    colVerifiedDate: 'Verified Date',

    auditTitle: 'System Audit Logs & Security',
    auditSubtitle: 'Automated trail of all logins, booking status changes, coupon operations and security events',
    colTimestamp: 'Timestamp',
    colAction: 'Action',
    colUser: 'User',
    colDetails: 'Details',
  },

  ru: {
    panelTitle: 'Панель Главного Администратора',
    panelSubtitle: 'Единое управление хостелами, арендой, бронированиями, скидками, отзывами и статьями',
    tabKpi: 'Дашборд и Метрики',
    tabBookings: 'Управление Бронями',
    tabHostels: 'Хостелы и Места',
    tabManagers: 'Управляющие',
    tabCoupons: 'Скидочные Промокоды',
    tabReviews: 'Модерация Отзывов',
    tabRentals: 'Аренда и Заявки',
    tabArticles: 'Публикация Статей',
    tabAudit: 'Журнал Безопасности',

    urgentArrivalsAlert: 'Срочный приезд без ответа',
    urgentArrivalsDesc: 'Путешественник находится в Ереване и ждет мгновенного подтверждения.',
    entranceIssuesAlert: 'Проблема при заселении',
    entranceIssuesDesc: 'Гость сообщил о проблеме с кодом двери или на стойке регистрации.',
    kpiPendingBookings: 'Брони на проверке',
    kpiUrgentImmediate: 'Срочные заселения',
    kpiEntranceIssues: 'Проблемы с заселением',
    kpiHostelsCount: 'Активных хостелов',
    kpiRentalsCount: 'Объектов аренды',
    kpiActiveCoupons: 'Активных промокодов',
    kpiTotalReviews: 'Всего отзывов',
    kpiSystemLogs: 'Записей журнала',
    quickActionsTitle: 'Быстрые действия',
    manageBookingsAction: 'Проверить и подтвердить брони',
    createCouponAction: 'Создать промокод на скидку',
    publishArticleAction: 'Опубликовать статью в путеводитель',

    filterAll: 'Все',
    filterPending: 'Ожидают',
    filterConfirmed: 'Подтверждены',
    filterCompleted: 'Завершены',
    filterCancelled: 'Отменены',
    filterRejected: 'Отклонены',
    tableColCode: 'Код брони',
    tableColGuest: 'Гость и контакт',
    tableColHostel: 'Хостел',
    tableColRoom: 'Тип номера',
    tableColDates: 'Даты',
    tableColGuests: 'Мест / Гостей',
    tableColAmount: 'Сумма (AMD)',
    tableColStatus: 'Статус',
    tableColActions: 'Действия',
    btnConfirm: 'Подтвердить',
    btnReject: 'Отклонить',
    btnComplete: 'Завершить проживание',
    btnPassengerLink: 'Ссылка для гостя',
    btnSentGuide: 'Гид по входу отправлен',
    noBookingsFound: 'Бронирований в этой категории не найдено.',
    immediateArrivalBadge: 'Срочный приезд',
    entranceIssueBadge: 'Проблема входа',

    hostelsListTitle: 'Хостелы в Армении',
    receptionLabel: 'Стойка регистрации:',
    addressLabel: 'Адрес:',
    phoneLabel: 'Телефон:',
    doorCodeLabel: 'Код двери:',
    priceFromLabel: 'Цена от:',
    instantStayStatusLabel: 'Режим мгновенного заселения:',
    instantStayActive: 'Активен (готов к ночным гостям)',
    instantStayInactive: 'Отключен',
    toggleInstantStayBtn: 'Изменить режим заселения',
    viewOnSiteBtn: 'Посмотреть на сайте',

    createManagerTitle: 'Создать аккаунт управляющего хостелом',
    managerNameLabel: 'ФИО управляющего',
    managerEmailLabel: 'Email для входа',
    assignedHostelLabel: 'Привязанный хостел',
    initialPasswordLabel: 'Начальный пароль',
    createManagerBtn: 'Создать аккаунт',
    activeManagersTitle: 'Действующие управляющие',
    roleBadge: 'Управляющий',

    couponsNoticeTitle: 'Справочник промокодов системы',
    couponsNoticeDesc: 'Промокоды дают процентную скидку на общую сумму бронирования. Вы можете добавлять новые коды или удалять демо-коды.',
    createCouponTitle: 'Создать новый промокод',
    couponCodeLabel: 'Код промокода (латиница)',
    couponPercentLabel: 'Процент скидки (%)',
    couponMinAmountLabel: 'Мин. сумма брони (AMD)',
    couponMaxUsesLabel: 'Лимит использований',
    couponDescLabel: 'Описание / акция',
    createCouponBtn: 'Создать промокод',
    existingCouponsTitle: 'Действующие промокоды в системе',
    colCouponCode: 'Код',
    colDiscount: 'Скидка',
    colUsage: 'Использовано / Лимит',
    colExpires: 'Истекает',
    colDescription: 'Описание',
    colStatus: 'Статус',
    activeStatus: 'Активен',
    inactiveStatus: 'Неактивен',
    deleteCouponBtn: 'Удалить промокод',

    reviewsTitle: 'Модерация отзывов путешественников',
    pendingReviewsCount: 'отзывов на модерации',
    ratingLabel: 'Оценка:',
    replyToGuestLabel: 'Официальный ответ администрации:',
    replyPlaceholder: 'Напишите корректный ответ гостю...',
    btnApprove: 'Одобрить и опубликовать',
    noReviewsFound: 'Нет отзывов в данной категории.',

    rentalsInquiriesTitle: 'Заявки на долгосрочную аренду',
    colProperty: 'Объект',
    colInquirer: 'Заявитель и связь',
    colRentalType: 'Тип аренды',
    colMoveIn: 'Дата заезда',
    colDuration: 'Срок',
    statusPendingReview: 'На рассмотрении',
    statusContacted: 'Связались',
    statusClosed: 'Закрыта',

    articlesTitle: 'Управление статьями путеводителя',
    createArticleTitle: 'Добавить статью в гид по Армении',
    imageStudioTitle: 'Студия изображений статьи',
    imageStudioDesc: 'Выберите качественное фото Еревана или загрузите свое изображение.',
    modePreset: 'Подборка фото Армении',
    modeUpload: 'Загрузить с устройства',
    modeUrl: 'Прямая ссылка на фото',
    customUrlPlaceholder: 'https://images.unsplash.com/... Прямая ссылка',
    uploadBtn: 'Выбрать файл на устройстве',
    selectedImagePreview: 'Выбранное фото для статьи',
    articleTitleLabel: 'Заголовок статьи',
    articleCategoryLabel: 'Категория',
    articleSummaryLabel: 'Краткое описание',
    articleContentLabel: 'Полный текст статьи',
    articleTagsLabel: 'Теги (через запятую)',
    articleLangLabel: 'Язык статьи',
    articleStatusLabel: 'Статус публикации',
    statusPublished: 'Опубликовано',
    statusDraft: 'Черновик',
    saveArticleBtn: 'Сохранить и опубликовать',
    publishedArticlesTitle: 'Статьи в базе данных',
    colImage: 'Фото',
    colArticleTitle: 'Заголовок',
    colCategory: 'Категория',
    colLanguage: 'Язык',
    colVerifiedDate: 'Дата проверки',

    auditTitle: 'Журнал безопасности и событий (Audit Log)',
    auditSubtitle: 'Автоматическая фиксация всех входов, смены статусов и операций с промокодами',
    colTimestamp: 'Время',
    colAction: 'Операция',
    colUser: 'Пользователь',
    colDetails: 'Детали',
  },

  hy: {
    panelTitle: 'Գլխավոր Ադմինիստրատորի Վահանակ',
    panelSubtitle: 'Հոսթելների, վարձակալությունների, ամրագրումների, զեղչերի, կարծիքների և հոդվածների կառավարում',
    tabKpi: 'Վահանակ և Ցուցանիշներ',
    tabBookings: 'Ամրագրումներ',
    tabHostels: 'Հոսթելներ և Մահճակալներ',
    tabManagers: 'Հոսթելապահների Հաշիվներ',
    tabCoupons: 'Զեղչի Կոդեր',
    tabReviews: 'Կարծիքների Ստուգում',
    tabRentals: 'Վարձակալություն և Հարցումներ',
    tabArticles: 'Հոդվածների Հրապարակում',
    tabAudit: 'Անվտանգության Մատյան',

    urgentArrivalsAlert: 'Անհապաղ ժամանում առանց պատասխանի',
    urgentArrivalsDesc: 'Ճանապարհորդը գտնվում է Երևանում և սպասում է անհապաղ հաստատման:',
    entranceIssuesAlert: 'Մուտքի խնդրի ահազանգ',
    entranceIssuesDesc: 'Հյուրը հայտնել է դռան կոդի կամ ընդունարանի հետ կապված խնդրի մասին:',
    kpiPendingBookings: 'Սպասվող ամրագրումներ',
    kpiUrgentImmediate: 'Անհապաղ ժամանումներ',
    kpiEntranceIssues: 'Մուտքի խնդիրներ',
    kpiHostelsCount: 'Ակտիվ հոսթելներ',
    kpiRentalsCount: 'Վարձակալության բնակարաններ',
    kpiActiveCoupons: 'Ակտիվ զեղչի կոդեր',
    kpiTotalReviews: 'Ընդհանուր կարծիքներ',
    kpiSystemLogs: 'Անվտանգության գրառումներ',
    quickActionsTitle: 'Արագ գործողություններ',
    manageBookingsAction: 'Ստուգել և հաստատել ամրագրումները',
    createCouponAction: 'Ստեղծել նոր զեղչի կոդ',
    publishArticleAction: 'Գրել և հրապարակել ուղեցույց',

    filterAll: 'Բոլորը',
    filterPending: 'Սպասվող',
    filterConfirmed: 'Հաստատված',
    filterCompleted: 'Ավարտված',
    filterCancelled: 'Չեղարկված',
    filterRejected: 'Մերժված',
    tableColCode: 'Կոդ',
    tableColGuest: 'Հյուր և Կապ',
    tableColHostel: 'Հոսթել',
    tableColRoom: 'Սենյակի տեսակ',
    tableColDates: 'Ժամկետներ',
    tableColGuests: 'Տեղեր / Հյուրեր',
    tableColAmount: 'Գումար (AMD)',
    tableColStatus: 'Կարգավիճակ',
    tableColActions: 'Գործողություններ',
    btnConfirm: 'Հաստատել',
    btnReject: 'Մերժել',
    btnComplete: 'Ավարտել կեցությունը',
    btnPassengerLink: 'Հյուրի անձնական հղում',
    btnSentGuide: 'Մուտքի ուղեցույցը ուղարկված է',
    noBookingsFound: 'Այս բաժնում ամրագրումներ չկան:',
    immediateArrivalBadge: 'Անհապաղ ժամանում',
    entranceIssueBadge: 'Մուտքի խնդիր',

    hostelsListTitle: 'Գրանցված հոսթելներ Հայաստանում',
    receptionLabel: 'Ընդունարանի ժամեր:',
    addressLabel: 'Հասցե:',
    phoneLabel: 'Հեռախոս:',
    doorCodeLabel: 'Դռան կոդ:',
    priceFromLabel: 'Գինը սկսած:',
    instantStayStatusLabel: 'Անհապաղ ընդունման ռեժիմ:',
    instantStayActive: 'Ակտիվ է (պատրաստ է գիշերային ժամանումներին)',
    instantStayInactive: 'Անջատված է',
    toggleInstantStayBtn: 'Փոխել անհապաղ ընդունման կարգավիճակը',
    viewOnSiteBtn: 'Դիտել կայքում',

    createManagerTitle: 'Ստեղծել հոսթելապահի նոր հաշիվ',
    managerNameLabel: 'Հոսթելապահի ամբողջական անունը',
    managerEmailLabel: 'Մուտքի էլ. հասցե',
    assignedHostelLabel: 'Կցված հոսթել',
    initialPasswordLabel: 'Սկզբնական գաղտնաբառ',
    createManagerBtn: 'Գրանցել հոսթելապահին',
    activeManagersTitle: 'Ակտիվ հոսթելապահներ',
    roleBadge: 'Հոսթելապահ',

    couponsNoticeTitle: 'Համակարգի զեղչի կոդերի ուղեցույց',
    couponsNoticeDesc: 'Զեղչի կոդերը տրամադրում են տոկոսային զեղչ ամրագրման ընդհանուր գումարից: Կարող եք ավելացնել նոր կոդեր կամ ջնջել դեմո կոդերը:',
    createCouponTitle: 'Ստեղծել նոր զեղչի կոդ',
    couponCodeLabel: 'Զեղչի կոդ (լատինատառ)',
    couponPercentLabel: 'Զեղչի տոկոս (%)',
    couponMinAmountLabel: 'Նվազագույն գումար (AMD)',
    couponMaxUsesLabel: 'Օգտագործման առավելագույն քանակ',
    couponDescLabel: 'Նկարագրություն',
    createCouponBtn: 'Ստեղծել կոդ',
    existingCouponsTitle: 'Գործող զեղչի կոդեր',
    colCouponCode: 'Կոդ',
    colDiscount: 'Զեղչ',
    colUsage: 'Օգտագործված / Լիմիտ',
    colExpires: 'Գործում է մինչև',
    colDescription: 'Նկարագրություն',
    colStatus: 'Կարգավիճակ',
    activeStatus: 'Ակտիվ',
    inactiveStatus: 'Ոչ ակտիվ',
    deleteCouponBtn: 'Ջնջել կոդը',

    reviewsTitle: 'Հյուրերի կարծիքների ստուգում',
    pendingReviewsCount: 'կարծիք սպասում է ստուգման',
    ratingLabel: 'Գնահատական:',
    replyToGuestLabel: 'Ղեկավարության պաշտոնական պատասխանը:',
    replyPlaceholder: 'Գրեք պաշտոնական պատասխան հյուրի կարծիքին...',
    btnApprove: 'Հաստատել և հրապարակել',
    noReviewsFound: 'Կարծիքներ չեն գտնվել:',

    rentalsInquiriesTitle: 'Բնակարանների վարձակալության հարցումներ',
    colProperty: 'Գույք',
    colInquirer: 'Դիմող և Կապ',
    colRentalType: 'Վարձակալության տեսակ',
    colMoveIn: 'Մուտքի ամսաթիվ',
    colDuration: 'Տևողություն',
    statusPendingReview: 'Ստուգման փուլում',
    statusContacted: 'Կապ է հաստատվել',
    statusClosed: 'Փակված է',

    articlesTitle: 'Ուղեցույցի հոդվածների կառավարում',
    createArticleTitle: 'Ավելացնել նոր հոդված Հայաստանի ուղեցույցում',
    imageStudioTitle: 'Հոդվածի նկարների ստուդիա',
    imageStudioDesc: 'Ընտրեք բարձրորակ պատկերներ Հայաստանից կամ վերբեռնեք սեփական նկարը:',
    modePreset: 'Հայաստանի ընտրված նկարներ',
    modeUpload: 'Վերբեռնել սարքից',
    modeUrl: 'Նկարի ուղիղ հղում (URL)',
    customUrlPlaceholder: 'https://images.unsplash.com/... Ուղիղ հղում',
    uploadBtn: 'Ընտրել ֆայլը համակարգչից/հեռախոսից',
    selectedImagePreview: 'Ընտրված նկարի նախադիտում',
    articleTitleLabel: 'Հոդվածի վերնագիր',
    articleCategoryLabel: 'Բաժին',
    articleSummaryLabel: 'Կարճ նկարագրություն',
    articleContentLabel: 'Հոդվածի ամբողջական տեքստ',
    articleTagsLabel: 'Թեգեր (ստորակետով բաժանված)',
    articleLangLabel: 'Հոդվածի լեզու',
    articleStatusLabel: 'Հրապարակման կարգավիճակ',
    statusPublished: 'Հրապարակել կայքում',
    statusDraft: 'Սևագիր',
    saveArticleBtn: 'Պահպանել և հրապարակել',
    publishedArticlesTitle: 'Համակարգում առկա հոդվածներ',
    colImage: 'Նկար',
    colArticleTitle: 'Վերնագիր',
    colCategory: 'Բաժին',
    colLanguage: 'Լեզու',
    colVerifiedDate: 'Ստուգման ամսաթիվ',

    auditTitle: 'Անվտանգության և գործողությունների մատյան (Audit Log)',
    auditSubtitle: 'Բոլոր մուտքերի, կարգավիճակների փոփոխությունների և զեղչերի ավտոմատ գրանցում',
    colTimestamp: 'Ժամանակ',
    colAction: 'Գործողություն',
    colUser: 'Օգտատեր',
    colDetails: 'Մանրամասներ',
  },
};

export const MANAGER_TRANSLATIONS: Record<AppLanguage, ManagerTranslations> = {
  fa: {
    panelTitle: 'پنل اختصاصی هاستل‌دار',
    instantStayWidgetTitle: 'پذیرش ورود فوری (برای مسافران تازه‌رسیده):',
    instantStayWidgetDescActive: 'فعال است تا پایان موعد (آماده پذیرش شبانه)',
    instantStayWidgetDescInactive: 'غیرفعال است',
    disableInstantStayBtn: 'غیرفعال کردن ورود فوری',
    enableInstantStayBtn: 'فعال‌سازی ورود فوری',
    pendingBookingsAlert: 'شما {count} درخواست رزرو جدید در انتظار بررسی دارید.',
    bookingsListTitle: 'رزروهای این هاستل ({count})',
    roomLabel: 'اتاق:',
    datesLabel: 'تاریخ:',
    quantityLabel: 'تعداد:',
    amountOnArrivalLabel: 'مبلغ دریافتی در محل:',
    guestRequestLabel: 'درخواست مسافر:',
    passengerLinkBtn: 'پیوند اختصاصی مسافر',
    confirmBtn: 'تأیید رزرو',
    rejectBtn: 'رد رزرو',
    completeBtn: 'تکمیل اقامت',
    noShowBtn: 'عدم حضور (No Show)',
    immediateBadge: 'ورود فوری',
    bedsCountText: 'تخت',
    personsCountText: 'نفر',
  },
  en: {
    panelTitle: 'Hostel Manager Dedicated Panel',
    instantStayWidgetTitle: 'Instant Check-in Acceptance (for just arrived travelers):',
    instantStayWidgetDescActive: 'Active until scheduled expiration (ready for night arrivals)',
    instantStayWidgetDescInactive: 'Currently inactive',
    disableInstantStayBtn: 'Disable Instant Check-in',
    enableInstantStayBtn: 'Enable Instant Check-in',
    pendingBookingsAlert: 'You have {count} pending booking requests to review.',
    bookingsListTitle: 'Hostel Bookings ({count})',
    roomLabel: 'Room:',
    datesLabel: 'Dates:',
    quantityLabel: 'Quantity:',
    amountOnArrivalLabel: 'To Collect on Arrival:',
    guestRequestLabel: 'Guest Request:',
    passengerLinkBtn: 'Guest Private Link',
    confirmBtn: 'Confirm Booking',
    rejectBtn: 'Reject',
    completeBtn: 'Complete Stay',
    noShowBtn: 'No Show',
    immediateBadge: 'Instant Arrival',
    bedsCountText: 'beds',
    personsCountText: 'guests',
  },
  ru: {
    panelTitle: 'Панель Управляющего Хостелом',
    instantStayWidgetTitle: 'Прием мгновенного заселения (для прибывших):',
    instantStayWidgetDescActive: 'Активен (готовность к ночному заселению)',
    instantStayWidgetDescInactive: 'В настоящее время отключен',
    disableInstantStayBtn: 'Отключить мгновенное заселение',
    enableInstantStayBtn: 'Включить мгновенное заселение',
    pendingBookingsAlert: 'У вас {count} новых заявок на бронирование для проверки.',
    bookingsListTitle: 'Бронирования хостела ({count})',
    roomLabel: 'Номер:',
    datesLabel: 'Даты:',
    quantityLabel: 'Количество:',
    amountOnArrivalLabel: 'К оплате на месте:',
    guestRequestLabel: 'Пожелания гостя:',
    passengerLinkBtn: 'Ссылка гостя',
    confirmBtn: 'Подтвердить бронь',
    rejectBtn: 'Отклонить',
    completeBtn: 'Завершить проживание',
    noShowBtn: 'Не заехал (No Show)',
    immediateBadge: 'Срочный приезд',
    bedsCountText: 'мест',
    personsCountText: 'чел.',
  },
  hy: {
    panelTitle: 'Հոսթելապահի Անձնական Վահանակ',
    instantStayWidgetTitle: 'Անհապաղ ընդունում (նոր ժամանածների համար):',
    instantStayWidgetDescActive: 'Ակտիվ է (պատրաստ է գիշերային ժամանումներին)',
    instantStayWidgetDescInactive: 'Ներկայումս անջատված է',
    disableInstantStayBtn: 'Անջատել անհապաղ ընդունումը',
    enableInstantStayBtn: 'Միացնել անհապաղ ընդունումը',
    pendingBookingsAlert: 'Դուք ունեք {count} ստուգման ենթակա նոր ամրագրում:',
    bookingsListTitle: 'Այս հոսթելի ամրագրումները ({count})',
    roomLabel: 'Սենյակ:',
    datesLabel: 'Ժամկետներ:',
    quantityLabel: 'Քանակ:',
    amountOnArrivalLabel: 'Տեղում վճարման ենթակա գումար:',
    guestRequestLabel: 'Հյուրի ցանկություն:',
    passengerLinkBtn: 'Հյուրի անձնական հղում',
    confirmBtn: 'Հաստատել ամրագրումը',
    rejectBtn: 'Մերժել',
    completeBtn: 'Ավարտել կեցությունը',
    noShowBtn: 'Չներկայացավ (No Show)',
    immediateBadge: 'Անհապաղ ժամանում',
    bedsCountText: 'մահճակալ',
    personsCountText: 'հյուր',
  },
};
