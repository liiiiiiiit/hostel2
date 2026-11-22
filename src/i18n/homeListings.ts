import type {AppLanguage} from '../types';
export const homeListings: Record<AppLanguage, {
  jobTitle:string;jobIntro:string;allJobs:string;jobHint:string;jobDetails:string;
  tourTitle:string;tourIntro:string;allTours:string;tourHint:string;tourDetails:string;
}> = {
  fa:{
    jobTitle:'فرصت‌های کاری در ارمنستان',jobIntro:'آگهی‌های فعال را ببین و درخواست همکاری بفرست.',
    allJobs:'همهٔ فرصت‌های کاری',jobHint:'فرصت‌های شغلی و ارسال درخواست',jobDetails:'مشاهده و درخواست همکاری',
    tourTitle:'با تورها ارمنستان را بگرد',tourIntro:'مسیر، زمان و قیمت تورها را بررسی کن و درخواست رزرو بده.',
    allTours:'همهٔ تورها',tourHint:'گشت‌وگذار و رزرو تور',tourDetails:'مشاهده و رزرو تور',
  },
  en:{
    jobTitle:'Work opportunities in Armenia',jobIntro:'Explore active vacancies and send your application.',
    allJobs:'All job opportunities',jobHint:'Find vacancies and apply',jobDetails:'View job and apply',
    tourTitle:'Explore Armenia with a tour',tourIntro:'Compare routes, schedules and prices, then request a booking.',
    allTours:'All tours',tourHint:'Explore and book a tour',tourDetails:'View tour and book',
  },
  ru:{
    jobTitle:'Работа в Армении',jobIntro:'Посмотрите открытые вакансии и отправьте отклик.',
    allJobs:'Все вакансии',jobHint:'Найдите работу и откликнитесь',jobDetails:'Подробнее и откликнуться',
    tourTitle:'Откройте Армению с экскурсией',tourIntro:'Сравните маршруты, даты и цены и оставьте заявку.',
    allTours:'Все туры',tourHint:'Выберите и забронируйте тур',tourDetails:'Подробнее и забронировать',
  },
  hy:{
    jobTitle:'Աշխատանքի հնարավորություններ Հայաստանում',jobIntro:'Դիտեք բաց հաստիքները և ուղարկեք ձեր դիմումը։',
    allJobs:'Բոլոր աշխատանքները',jobHint:'Գտեք աշխատանք և դիմեք',jobDetails:'Դիտել և դիմել',
    tourTitle:'Բացահայտեք Հայաստանը տուրերով',tourIntro:'Համեմատեք երթուղիները, օրերը և գները, ապա ուղարկեք ամրագրման հայտ։',
    allTours:'Բոլոր տուրերը',tourHint:'Ընտրեք և ամրագրեք տուր',tourDetails:'Դիտել և ամրագրել',
  },
};
