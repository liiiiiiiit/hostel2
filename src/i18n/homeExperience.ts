import type { AppLanguage } from '../types';

const content = {
  fa: {
    first: 'اقامتت در ایروان را', second: 'از اینجا پیدا کن.', intro: 'هاستل‌ها و خانه‌ها را ببین، اطلاعاتشان را مقایسه کن و برای سفرت آماده شو.',
    browse: 'دیدن همهٔ اقامتگاه‌ها', information: 'مشاهدهٔ اطلاعات', flexible: 'هنوز تاریخ سفرم مشخص نیست', searchHostels: 'نمایش هاستل‌ها', searchRentals: 'نمایش خانه‌ها',
    shortcuts: 'برای چه کاری اینجایی؟', hostelHint: 'تخت مشترک یا اتاق خصوصی', rentalHint: 'خانه برای اقامت کوتاه یا بلند', guideHint: 'از ورود تا گشت‌وگذار', translatorHint: 'چهار زبان، یک گفت‌وگوی راحت‌تر',
    howTitle: 'ساده‌تر انتخاب کن', steps: [['۱', 'گزینه‌ها را پیدا کن', 'هاستل یا خانه را انتخاب کن و فهرست را ببین.'], ['۲', 'جزئیات را بررسی کن', 'عکس، نشانی و اطلاعات هر اقامتگاه را مقایسه کن.'], ['۳', 'با آگاهی تصمیم بگیر', 'قیمت، ظرفیت و شرایط را پیش از رزرو تأیید کن.']],
    preview: 'بعضی اقامتگاه‌ها فعلاً فقط برای معرفی نمایش داده می‌شوند. وضعیت امکان رزرو را در صفحهٔ هر مورد ببین.',
    nights: 'شب', guideIntro: 'پاسخ سؤال‌های کاربردی برای قبل و حین سفر.',
  },
  en: {
    first: 'Find your place', second: 'in Yerevan.', intro: 'Explore hostels and homes, compare their details and get ready for your trip.',
    browse: 'Explore all stays', information: 'View information', flexible: 'My dates are flexible', searchHostels: 'Show hostels', searchRentals: 'Show homes',
    shortcuts: 'What would you like to do?', hostelHint: 'Shared beds or private rooms', rentalHint: 'Homes for short or longer stays', guideHint: 'From arrival to exploring', translatorHint: 'Four languages, easier conversations',
    howTitle: 'Choose with confidence', steps: [['1', 'Explore your options', 'Choose hostels or homes and browse the listings.'], ['2', 'Compare the details', 'Look at photos, addresses and property information.'], ['3', 'Check before booking', 'Confirm rates, availability and policies before you book.']],
    preview: 'Some stays are currently information-only listings. Check each property page for booking availability.',
    nights: 'nights', guideIntro: 'Practical answers for before and during your trip.',
  },
  ru: {
    first: 'Найдите своё место', second: 'в Ереване.', intro: 'Изучайте хостелы и квартиры, сравнивайте информацию и готовьтесь к поездке.',
    browse: 'Все варианты жилья', information: 'Информация', flexible: 'Даты пока не определены', searchHostels: 'Показать хостелы', searchRentals: 'Показать жильё',
    shortcuts: 'Что вы ищете?', hostelHint: 'Общие и отдельные комнаты', rentalHint: 'Жильё на короткий или долгий срок', guideHint: 'От прибытия до прогулок', translatorHint: 'Четыре языка для общения',
    howTitle: 'Выбирайте проще', steps: [['1', 'Найдите варианты', 'Выберите хостелы или квартиры и откройте список.'], ['2', 'Сравните информацию', 'Посмотрите фотографии, адреса и описание.'], ['3', 'Уточните условия', 'Перед бронированием подтвердите цены и наличие мест.']],
    preview: 'Некоторые объекты доступны только для ознакомления. Возможность бронирования указана на странице объекта.',
    nights: 'ночей', guideIntro: 'Практические ответы до поездки и во время неё.',
  },
  hy: {
    first: 'Գտեք ձեր կացարանը', second: 'Երևանում։', intro: 'Բացահայտեք հոսթելներն ու տները, համեմատեք տվյալները և պատրաստվեք ճանապարհորդությանը։',
    browse: 'Բոլոր կացությունները', information: 'Դիտել տեղեկությունները', flexible: 'Ամսաթվերը դեռ որոշված չեն', searchHostels: 'Դիտել հոսթելները', searchRentals: 'Դիտել տները',
    shortcuts: 'Ի՞նչ եք փնտրում։', hostelHint: 'Ընդհանուր կամ առանձին սենյակ', rentalHint: 'Տներ կարճ կամ երկար կացության համար', guideHint: 'Ժամանումից մինչև զբոսանք', translatorHint: 'Չորս լեզու՝ հեշտ հաղորդակցություն',
    howTitle: 'Ընտրեք ավելի հեշտ', steps: [['1', 'Գտեք տարբերակները', 'Ընտրեք հոսթելներ կամ տներ և դիտեք ցանկը։'], ['2', 'Համեմատեք տվյալները', 'Դիտեք լուսանկարները, հասցեները և նկարագրությունները։'], ['3', 'Ճշտեք պայմանները', 'Ամրագրելուց առաջ ճշտեք գները և ազատ տեղերը։']],
    preview: 'Որոշ կացարաններ ցուցադրվում են միայն տեղեկացման համար։ Ամրագրման հնարավորությունը նշված է կացարանի էջում։',
    nights: 'գիշեր', guideIntro: 'Գործնական պատասխաններ՝ ճանապարհորդությունից առաջ և ընթացքում։',
  },
};
export const homeExperience = (lang: AppLanguage) => content[lang];
