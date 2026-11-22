import type { AppLanguage } from '../types';

export const HERO_DURATION_MS = 5000;
export type HeroCopy = { chip: string; badge: string; headline: string; subtitle: string; cta: string };
export type HeroSlide = {
  id: string;
  view: 'hostels' | 'rentals' | 'tours' | 'jobs' | 'guide' | 'translator';
  image: string;
  imagePosition?: string;
  /** Source and credit distinguish location photography from illustrative interiors. */
  photoCredit: string;
  photoSource: string;
  copy: Record<AppLanguage, HeroCopy>;
};
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=85`;

export const heroSlides: readonly HeroSlide[] = [
  {
    id: 'hostels', view: 'hostels', image: photo('photo-1555854877-bab0e564b8d5'),
    photoCredit: 'Unsplash · illustrative shared stay', photoSource: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5',
    copy: {
      en: { chip: 'Hostels', badge: 'Hostels & Rooms', headline: 'Stay Smart. Meet Fellow Travelers.', subtitle: 'Compare shared beds, women-only dorms, and private rooms in central Yerevan.', cta: 'Explore Hostels' },
      fa: { chip: 'هاستل‌ها', badge: 'هاستل و اتاق', headline: 'هوشمندانه اقامت کن؛ هم‌سفر پیدا کن.', subtitle: 'تخت اشتراکی، خوابگاه ویژه بانوان و اتاق خصوصی را در مرکز ایروان مقایسه کن.', cta: 'کشف هاستل‌ها' },
      ru: { chip: 'Хостелы', badge: 'Хостелы и номера', headline: 'Живите с умом. Знакомьтесь с путешественниками.', subtitle: 'Сравните общие и женские спальни, а также отдельные номера в центре Еревана.', cta: 'Выбрать хостел' },
      hy: { chip: 'Հոսթելներ', badge: 'Հոսթելներ և սենյակներ', headline: 'Մնացեք խելամիտ։ Գտեք նոր ընկերներ։', subtitle: 'Համեմատեք ընդհանուր և միայն կանանց ննջասենյակներն ու առանձին սենյակները Երևանի կենտրոնում։', cta: 'Դիտել հոսթելները' },
    },
  },
  {
    id: 'apartments', view: 'rentals', image: photo('photo-1522708323590-d24dbb6b0267'),
    photoCredit: 'Unsplash · illustrative apartment', photoSource: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    copy: {
      en: { chip: 'Apartments', badge: 'Homes & Apartments', headline: 'Your Private Home in Yerevan.', subtitle: 'Verified furnished apartments for short stays or monthly living across top neighborhoods.', cta: 'Browse Apartments' },
      fa: { chip: 'آپارتمان‌ها', badge: 'خانه و آپارتمان', headline: 'خانهٔ خصوصی تو در ایروان.', subtitle: 'آپارتمان‌های مبله و بررسی‌شده برای اقامت کوتاه یا زندگی ماهانه در محله‌های محبوب.', cta: 'دیدن آپارتمان‌ها' },
      ru: { chip: 'Квартиры', badge: 'Дома и квартиры', headline: 'Ваш собственный дом в Ереване.', subtitle: 'Проверенные меблированные квартиры на несколько дней или месяцев в лучших районах.', cta: 'Смотреть квартиры' },
      hy: { chip: 'Բնակարաններ', badge: 'Տներ և բնակարաններ', headline: 'Ձեր սեփական տունը Երևանում։', subtitle: 'Ստուգված կահավորված բնակարաններ՝ կարճ կամ ամսական վարձակալությամբ, սիրված թաղամասերում։', cta: 'Դիտել բնակարանները' },
    },
  },
  {
    id: 'tours', view: 'tours', image: photo('photo-1695571803413-77ad09429eeb'), imagePosition: 'center 45%',
    photoCredit: 'Tony Todesky · Garni, Armenia', photoSource: 'https://unsplash.com/photos/sP5DqGyt_fc',
    copy: {
      en: { chip: 'Tours', badge: 'Tours & Excursions', headline: 'Discover Armenia Beyond the City.', subtitle: 'Curated day trips to Lake Sevan, Garni, Geghard, Dilijan, and hidden cultural gems.', cta: 'Explore Tours' },
      fa: { chip: 'تورها', badge: 'تور و گردش', headline: 'ارمنستان را فراتر از شهر کشف کن.', subtitle: 'سفرهای یک‌روزه به دریاچه سوان، گارنی، گغارد، دیلیجان و گنجینه‌های پنهان فرهنگی.', cta: 'کشف تورها' },
      ru: { chip: 'Туры', badge: 'Туры и экскурсии', headline: 'Откройте Армению за пределами города.', subtitle: 'Однодневные поездки на Севан, в Гарни, Гегард, Дилижан и к скрытым сокровищам культуры.', cta: 'Выбрать тур' },
      hy: { chip: 'Տուրեր', badge: 'Տուրեր և էքսկուրսիաներ', headline: 'Բացահայտեք Հայաստանը քաղաքից դուրս։', subtitle: 'Մեկօրյա ուղևորություններ դեպի Սևան, Գառնի, Գեղարդ, Դիլիջան և մշակութային թաքնված գանձեր։', cta: 'Բացահայտել տուրերը' },
    },
  },
  {
    id: 'jobs', view: 'jobs', image: photo('photo-1521737711867-e3b97375f902'),
    photoCredit: 'Unsplash · illustrative collaborative workspace', photoSource: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902',
    copy: {
      en: { chip: 'Jobs', badge: 'Jobs & Careers', headline: 'Find Work & Opportunities in Armenia.', subtitle: 'Browse verified job listings, remote roles, and career openings for locals and expats in Yerevan.', cta: 'Find Jobs' },
      fa: { chip: 'کاریابی', badge: 'کار و فرصت شغلی', headline: 'فرصت کاری خودت را در ارمنستان پیدا کن.', subtitle: 'آگهی‌های شغلی بررسی‌شده، کار دورکاری و فرصت‌های تازه برای ساکنان و مهاجران ایروان.', cta: 'پیدا کردن کار' },
      ru: { chip: 'Работа', badge: 'Работа и карьера', headline: 'Найдите работу и возможности в Армении.', subtitle: 'Проверенные вакансии, удалённая работа и карьерные возможности для жителей и экспатов в Ереване.', cta: 'Найти работу' },
      hy: { chip: 'Աշխատանք', badge: 'Աշխատանք և կարիերա', headline: 'Գտեք աշխատանք և հնարավորություններ Հայաստանում։', subtitle: 'Ստուգված թափուր հաստիքներ, հեռավար աշխատանք և կարիերայի հնարավորություններ Երևանի բնակիչների ու նորեկների համար։', cta: 'Գտնել աշխատանք' },
    },
  },
  {
    id: 'guide', view: 'guide', image: photo('photo-1747598666832-2a106fce4ce7'), imagePosition: 'center 40%',
    photoCredit: 'Rafael Ishkhanyan · Cascade, Yerevan', photoSource: 'https://unsplash.com/photos/9wrmrLH4A_8',
    copy: {
      en: { chip: 'City Guide', badge: 'Travel & City Guide', headline: 'Arrive Ready. Navigate Like a Local.', subtitle: 'Practical step-by-step guides on SIM cards, airport transfers, transport, and daily life.', cta: 'Open Travel Guide' },
      fa: { chip: 'راهنمای شهر', badge: 'راهنمای سفر و شهر', headline: 'آماده برس؛ مثل یک محلی بگرد.', subtitle: 'راهنمای قدم‌به‌قدم سیم‌کارت، ترانسفر فرودگاه، رفت‌وآمد و زندگی روزمره.', cta: 'باز کردن راهنمای سفر' },
      ru: { chip: 'Гид по городу', badge: 'Гид по городу и путешествиям', headline: 'Приезжайте готовыми. Живите как местные.', subtitle: 'Пошаговые советы о SIM-картах, трансфере из аэропорта, транспорте и повседневной жизни.', cta: 'Открыть путеводитель' },
      hy: { chip: 'Քաղաքի ուղեցույց', badge: 'Ճամփորդական և քաղաքային ուղեցույց', headline: 'Ժամանեք պատրաստ։ Շրջեք տեղացու պես։', subtitle: 'Քայլ առ քայլ խորհուրդներ SIM քարտերի, օդանավակայանի տրանսֆերի, տրանսպորտի և առօրյայի մասին։', cta: 'Բացել ուղեցույցը' },
    },
  },
  {
    id: 'translator', view: 'translator', image: photo('photo-1585236616251-9fd0f67b0000'),
    photoCredit: 'Norayr Grigoryan · café culture, Yerevan', photoSource: 'https://unsplash.com/photos/a7HPLJua3KQ',
    copy: {
      en: { chip: 'Translator', badge: '4-Language Companion', headline: 'Speak Freely Anywhere in Yerevan.', subtitle: 'Instant private translator & verified travel phrases in Persian, English, Russian, and Armenian.', cta: 'Try Translator' },
      fa: { chip: 'مترجم', badge: 'همراه چهارزبانه', headline: 'همه‌جای ایروان راحت صحبت کن.', subtitle: 'مترجم خصوصی و فوری و عبارت‌های کاربردی سفر به فارسی، انگلیسی، روسی و ارمنی.', cta: 'امتحان کردن مترجم' },
      ru: { chip: 'Переводчик', badge: 'Помощник на 4 языках', headline: 'Общайтесь свободно в любом уголке Еревана.', subtitle: 'Мгновенный приватный переводчик и проверенные фразы на персидском, английском, русском и армянском.', cta: 'Открыть переводчик' },
      hy: { chip: 'Թարգմանիչ', badge: 'Չորս լեզվով ուղեկից', headline: 'Ազատ խոսեք Երևանի ցանկացած անկյունում։', subtitle: 'Արագ մասնավոր թարգմանիչ և ստուգված ճամփորդական արտահայտություններ՝ պարսկերեն, անգլերեն, ռուսերեն և հայերեն։', cta: 'Փորձել թարգմանիչը' },
    },
  },
];

export const heroLabels = {
  en: { label: 'Discover Yerevan Hub', categories: 'Explore our services', slide: 'Slide', previous: 'Previous slide', next: 'Next slide', pause: 'Pause slideshow', play: 'Play slideshow' },
  fa: { label: 'کشف خدمات یروان هاب', categories: 'خدمات ما را کشف کن', slide: 'اسلاید', previous: 'اسلاید قبلی', next: 'اسلاید بعدی', pause: 'توقف نمایش خودکار', play: 'پخش خودکار' },
  ru: { label: 'Откройте Yerevan Hub', categories: 'Наши услуги', slide: 'Слайд', previous: 'Предыдущий слайд', next: 'Следующий слайд', pause: 'Приостановить показ', play: 'Продолжить показ' },
  hy: { label: 'Բացահայտեք Yerevan Hub-ը', categories: 'Մեր ծառայությունները', slide: 'Սլայդ', previous: 'Նախորդ սլայդ', next: 'Հաջորդ սլայդ', pause: 'Դադարեցնել ցուցադրումը', play: 'Շարունակել ցուցադրումը' },
} satisfies Record<AppLanguage, Record<string, string>>;
