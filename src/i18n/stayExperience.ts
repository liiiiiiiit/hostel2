import type { AppLanguage } from '../types';

const copy = {
  en: {
    first: 'Stay curious.', second: 'Feel at home.', intro: 'Find a shared space, a quiet room, or a home of your own. Your next Armenia story starts here.',
    local: 'A little closer to Armenia', discover: 'Explore at your own pace',
    pay: 'Pay at the property', languages: 'At home in four languages', compare: 'Save. Compare. Find your place.',
    all: 'All stays', private: 'Private rooms', female: 'Women-only dorms', shared: 'Shared dorms',
    remove: 'Remove filter', photos: 'See all photos', noPhoto: 'Photos coming soon',
    overview: 'Overview', rooms: 'Rooms', amenities: 'Amenities & rules', location: 'Location', reviews: 'Reviews',
    trip: 'Your stay', details: 'Your details', confirm: 'Review & request', photo: 'Photo',
  },
  fa: {
    first: 'بیشتر کشف کن.', second: 'مثل خانه بمان.', intro: 'یک فضای دوستانه، اتاقی آرام یا خانه‌ای برای خودت؛ داستان سفرت به ارمنستان از اینجا شروع می‌شود.',
    local: 'کمی نزدیک‌تر به ارمنستان', discover: 'با خیال راحت کشف کن',
    pay: 'پرداخت در اقامتگاه', languages: 'همراه شما به چهار زبان', compare: 'ذخیره کن، مقایسه کن، انتخاب کن.',
    all: 'همهٔ اقامتگاه‌ها', private: 'اتاق خصوصی', female: 'خوابگاه بانوان', shared: 'خوابگاه مشترک',
    remove: 'حذف فیلتر', photos: 'دیدن همهٔ عکس‌ها', noPhoto: 'عکس‌ها به‌زودی اضافه می‌شوند',
    overview: 'معرفی', rooms: 'اتاق‌ها', amenities: 'امکانات و قوانین', location: 'موقعیت', reviews: 'نظرها',
    trip: 'اقامت شما', details: 'اطلاعات شما', confirm: 'بررسی و درخواست', photo: 'عکس',
  },
  ru: {
    first: 'Открывайте новое.', second: 'Будьте как дома.', intro: 'Общая комната, тихий номер или целая квартира. Ваша история в Армении начинается здесь.',
    local: 'Чуть ближе к Армении', discover: 'Открывайте в своём ритме',
    pay: 'Оплата на месте', languages: 'Общение на четырёх языках', compare: 'Сохраняйте. Сравнивайте. Выбирайте.',
    all: 'Все варианты', private: 'Отдельные номера', female: 'Женские комнаты', shared: 'Общие комнаты',
    remove: 'Убрать фильтр', photos: 'Все фотографии', noPhoto: 'Фото скоро появятся',
    overview: 'Обзор', rooms: 'Номера', amenities: 'Удобства и правила', location: 'Расположение', reviews: 'Отзывы',
    trip: 'Проживание', details: 'Ваши данные', confirm: 'Проверка и запрос', photo: 'Фото',
  },
  hy: {
    first: 'Բացահայտեք ավելին։', second: 'Զգացեք ինչպես տանը։', intro: 'Ընդհանուր տարածք, հանգիստ սենյակ կամ առանձին տուն։ Ձեր հայկական պատմությունը սկսվում է այստեղ։',
    local: 'Մի փոքր ավելի մոտ Հայաստանին', discover: 'Բացահայտեք ձեր ռիթմով',
    pay: 'Վճարում կացավայրում', languages: 'Հաղորդակցություն չորս լեզվով', compare: 'Պահպանեք, համեմատեք, ընտրեք։',
    all: 'Բոլոր կացությունները', private: 'Առանձին սենյակներ', female: 'Կանանց սենյակներ', shared: 'Ընդհանուր սենյակներ',
    remove: 'Հեռացնել ֆիլտրը', photos: 'Բոլոր լուսանկարները', noPhoto: 'Լուսանկարները շուտով',
    overview: 'Նկարագրություն', rooms: 'Սենյակներ', amenities: 'Հարմարություններ և կանոններ', location: 'Դիրք', reviews: 'Կարծիքներ',
    trip: 'Ձեր կացությունը', details: 'Ձեր տվյալները', confirm: 'Ստուգում և հարցում', photo: 'Լուսանկար',
  },
};
export const stayExperience = (lang: AppLanguage) => copy[lang];
