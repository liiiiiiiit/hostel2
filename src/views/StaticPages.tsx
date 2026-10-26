import { appStore } from '../services/store';
import React from 'react';
import { AppLanguage } from '../types';
import { ShieldCheck, Phone, Send, MapPin, Clock, HelpCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  currentLang: AppLanguage;
  pageType: 'about' | 'contact' | 'rules' | 'privacy';
}

const STATIC_CONTENT = {
  fa: {
    aboutBadge: 'درباره پلتفرم',
    aboutTitle: 'درباره YEREVANHUB',
    aboutIntro: 'YEREVANHUB پلتفرم تخصصی و مستقل اقامت، اجاره خانه و راهنمای سفر به ارمنستان است. هدف ما ایجاد ارتباطی مستقیم، امن و بدون واسطه بین مسافران و هاستل‌ها و املاک ارمنستان است.',
    aboutCard1Title: 'بدون پیش‌پرداخت آنلاین',
    aboutCard1Desc: 'در شرایطی که دسترسی به کارت‌های بانکی بین‌المللی برای بسیاری از مسافران دشوار است، YEREVANHUB امکان رزرو مطمئن هاستل با پرداخت نقدی در محل (به درام ارمنستان) را فراهم کرده است.',
    aboutCard2Title: 'پشتیبانی مقیم ایروان',
    aboutCard2Desc: 'تیم پشتیبانی ما مستقر در شهر ایروان است و در صورت بروز هرگونه مشکل در ورود شبانه یا پیدا کردن آدرس، در کنار شماست.',

    contactBadge: 'ارتباط با ما',
    contactTitle: 'تماس با پشتیبانی YEREVANHUB',
    contactSubtitle: 'پاسخگویی سریع به سؤالات اقامتی، هماهنگی بازدید املاک و پشتیبانی اضطراری مسافران تازه‌رسیده',
    emergencyPhoneTitle: 'خط اضطراری ایروان',
    emergencyPhoneHours: 'پاسخگویی ۲۴ ساعته شبانه‌روزی',
    telegramTitle: 'پشتیبانی تلگرام',
    telegramHours: 'پاسخگویی آنلاین ۸:۰۰ تا ۲۳:۰۰',
    timezoneTitle: 'منطقه زمانی سرور',
    timezoneValue: 'Asia/Yerevan (GMT+4)',
    timezoneDesc: 'ساعت رسمی جمهوری ارمنستان',
    faqTitle: 'سؤالات متداول مسافران',
    faqs: [
      {
        q: 'آیا برای رزرو هاستل نیازی به پیش‌پرداخت اینترنتی هست؟',
        a: 'خیر، در این نسخه از وبسایت هیچ پرداختی به صورت آنلاین انجام نمی‌شود. هزینه اقامت در هنگام مراجعه حضوری به پذیرش هاستل و به درام ارمنستان پرداخت می‌شود.',
      },
      {
        q: 'اگر ساعت ۳ صبح از اتوبوس تهران به پایانه کیلیکیا برسم چه کنم؟',
        a: 'از مسیر «تازه رسیده‌ام» در بالای سایت استفاده کنید. هاستل‌هایی که ورود فوری دارند نمایش داده می‌شوند و پس از ارسال درخواست، وضعیت تأیید بررسی می‌شود.',
      },
      {
        q: 'آدرس هاستل را چگونه به راننده تاکسی ارمنی نشان دهم؟',
        a: 'پس از ثبت و تأیید رزرو، در لینک پیگیری کارت راهنمای مسافر حاوی متن بزرگ نشانی به خط ارمنی در اختیارتان قرار می‌گیرد که مخصوص نشان دادن به راننده است.',
      },
    ],

    rulesBadge: 'قوانین و حریم خصوصی',
    rulesTitle: 'قوانین رزرو، لغو و شرایط استفاده از YEREVANHUB',
    rule1Title: '۱. شرایط رزرو و پرداخت در محل',
    rule1Desc: 'تمامی مبالغ اعلام‌شده در هاستل‌ها به درام ارمنستان (AMD) است. پرداخت در هنگام تحویل کلید و مدارک در هاستل انجام می‌شود. ثبت درخواست در سایت به معنی پذیرش قوانین هاستل انتخابی است.',
    rule2Title: '۲. سیاست لغو رزرو',
    rule2Desc: 'مسافران محترم می‌توانند تا ۲۴ ساعت قبل از موعد ورود بدون هیچ‌گونه جریمه‌ای رزرو خود را از طریق پیوند اختصاصی لغو نمایند تا ظرفیت برای سایر مسافران آزاد گردد.',
    rule3Title: '۳. ورود در ساعات بامداد و نیمه‌شب',
    rule3Desc: 'تحویل تخت خواب پیش از ساعت ۱۴:۰۰ استاندارد منوط به تأیید پذیرش زودهنگام هاستل یا رزرو شب قبل است. در غیر این صورت مسافر می‌تواند از فضای لابی و نگهداری چمدان استفاده کند.',
    rule4Title: '۴. حفظ حریم خصوصی',
    rule4Desc: 'شماره تماس، ایمیل و لینک‌های اختصاصی پیگیری رزرو کاملاً محرمانه بوده و در اختیار اشخاص ثالث یا موتورهای جستجو قرار نخواهد گرفت.',
  },

  en: {
    aboutBadge: 'About Platform',
    aboutTitle: 'About YEREVANHUB',
    aboutIntro: 'YEREVANHUB is an independent, dedicated platform for hostel booking, apartment rentals, and travel guidance in Armenia. We build a direct, transparent bridge between travelers and verified accommodations in Yerevan and across Armenia.',
    aboutCard1Title: 'Pay on Arrival in AMD (No Prepayment)',
    aboutCard1Desc: 'Understanding the friction of international cards, YEREVANHUB allows travelers to securely book verified hostel beds and pay strictly in cash (Armenian Dram) upon arrival at reception.',
    aboutCard2Title: 'Local Yerevan-Based Support',
    aboutCard2Desc: 'Our ground team is stationed right in Yerevan to assist travelers arriving overnight or finding challenging building entrances.',

    contactBadge: 'Contact Us',
    contactTitle: 'YEREVANHUB Traveler Support',
    contactSubtitle: 'Prompt assistance for accommodation inquiries, apartment visits, and urgent arrival support in Yerevan.',
    emergencyPhoneTitle: 'Yerevan Emergency Hotline',
    emergencyPhoneHours: 'Available 24/7 round the clock',
    telegramTitle: 'Telegram Support',
    telegramHours: 'Online daily 08:00 – 23:00',
    timezoneTitle: 'Official Timezone',
    timezoneValue: 'Asia/Yerevan (GMT+4)',
    timezoneDesc: 'Armenia Standard Time',
    faqTitle: 'Frequently Asked Questions',
    faqs: [
      {
        q: 'Do I need a credit card or online payment to book a hostel?',
        a: 'No. No online payments exist on YEREVANHUB. You pay directly at the hostel reception desk in Armenian Dram (AMD) upon check-in.',
      },
      {
        q: 'What should I do if I arrive at Kilikia Bus Station at 3:00 AM?',
        a: 'Use our "Immediate Stay" flow from the top navigation. It highlights 24-hour reception hostels ready to accept overnight travelers.',
      },
      {
        q: 'How can I show the hostel address to an Armenian taxi driver?',
        a: 'Your private booking tracking link includes an Arrival Pass featuring the complete address rendered in large Armenian letters and a Google Maps route button.',
      },
    ],

    rulesBadge: 'Policies & Privacy',
    rulesTitle: 'Booking, Cancellation & Terms of Use for YEREVANHUB',
    rule1Title: '1. Booking & Pay-on-Arrival Terms',
    rule1Desc: 'All prices are clearly stated in Armenian Dram (AMD). Payment is completed upon key exchange at reception. Submitting a request implies acceptance of the chosen property house rules.',
    rule2Title: '2. Cancellation Policy',
    rule2Desc: 'Guests can cancel reservations free of charge up to 24 hours prior to check-in via their private tracking link, releasing bed capacity for fellow travelers.',
    rule3Title: '3. Midnight & Early Morning Check-ins',
    rule3Desc: 'Standard check-in is 14:00. If arriving between midnight and 06:00 AM, immediate bed access requires booking the previous night or prior early check-in confirmation. Luggage drop and lobby access are always free.',
    rule4Title: '4. Privacy & Data Protection',
    rule4Desc: 'Phone numbers, emails, and private tracking tokens are strictly encrypted and never shared with advertising networks or indexed by search engines.',
  },

  ru: {
    aboutBadge: 'О платформе',
    aboutTitle: 'О сервисе YEREVANHUB',
    aboutIntro: 'YEREVANHUB — специализированная независимая платформа для бронирования хостелов, аренды квартир и гид по Армении. Мы связываем путешественников с проверенными объектами проживания в Ереване напрямую.',
    aboutCard1Title: 'Оплата на месте без предоплаты',
    aboutCard1Desc: 'YEREVANHUB позволяет забронировать проверенные хостелы с оплатой наличными в драмах (AMD) прямо на стойке регистрации при заселении.',
    aboutCard2Title: 'Поддержка в Ереване',
    aboutCard2Desc: 'Наша команда находится в Ереване и помогает путешественникам при ночном прибытии или поиске сложных адресов.',

    contactBadge: 'Контакты',
    contactTitle: 'Поддержка путешественников YEREVANHUB',
    contactSubtitle: 'Быстрые ответы по вопросам бронирования хостелов, осмотра квартир и помощи при въезде в Ереван.',
    emergencyPhoneTitle: 'Горячая линия в Ереване',
    emergencyPhoneHours: 'Круглосуточно 24/7',
    telegramTitle: 'Поддержка в Telegram',
    telegramHours: 'Онлайн ежедневно с 08:00 до 23:00',
    timezoneTitle: 'Часовой пояс',
    timezoneValue: 'Asia/Yerevan (GMT+4)',
    timezoneDesc: 'Официальное время Республики Армения',
    faqTitle: 'Часто задаваемые вопросы',
    faqs: [
      {
        q: 'Нужна ли предоплата онлайн для бронирования?',
        a: 'Нет. В этой версии сайта нет онлайн-платежей. Вы оплачиваете проживание наличными в драмах (AMD) при заселении в хостел.',
      },
      {
        q: 'Что делать, если автобус из Тегерана или Тбилиси прибывает в 3 часа ночи?',
        a: 'Используйте раздел «Срочный заезд» в верхнем меню. Там отображаются хостелы с круглосуточной стойкой и моментальным подтверждением.',
      },
      {
        q: 'Как показать адрес хостела армянскому таксисту?',
        a: 'В персональной ссылке отслеживания брони доступна карточка прибытия с крупным текстом адреса на армянском языке и кнопкой навигатора.',
      },
    ],

    rulesBadge: 'Правила и конфиденциальность',
    rulesTitle: 'Правила бронирования, отмены и условия YEREVANHUB',
    rule1Title: '1. Условия бронирования и оплаты',
    rule1Desc: 'Все цены указаны в армянских драмах (AMD). Оплата производится при получении ключей на стойке регистрации хостела.',
    rule2Title: '2. Политика отмены',
    rule2Desc: 'Вы можете бесплатно отменить бронирование за 24 часа до заезда по персональной ссылке, освободив место для других гостей.',
    rule3Title: '3. Ночной и ранний заезд',
    rule3Desc: 'Стандартный заезд в 14:00. При прибытии ночью (до 06:00) для немедленного сна на кровати требуется бронь с предыдущих суток. Оставить чемодан в лобби можно бесплатно.',
    rule4Title: '4. Защита конфиденциальности',
    rule4Desc: 'Контакты и персональные токены бронирования строго конфиденциальны и не передаются третьим лицам.',
  },

  hy: {
    aboutBadge: 'Հարթակի մասին',
    aboutTitle: 'YEREVANHUB-ի մասին',
    aboutIntro: 'YEREVANHUB-ը մասնագիտացված և անկախ հարթակ է Հայաստանում հոսթելների ամրագրման, բնակարանների վարձակալության և ճանապարհորդական ուղեցույցի համար: Մենք ապահովում ենք ուղիղ կապ ճանապարհորդների և հուսալի կացարանների միջև:',
    aboutCard1Title: 'Վճարում տեղում AMD-ով (Առանց նախավճարի)',
    aboutCard1Desc: 'YEREVANHUB-ը հնարավորություն է տալիս հուսալիորեն ամրագրել հոսթելի տեղեր և վճարել կանխիկ դրամով (AMD) միայն ընդունարանում ժամանելիս:',
    aboutCard2Title: 'Երևանյան աջակցություն',
    aboutCard2Desc: 'Մեր աջակցության թիմը գտնվում է Երևանում և պատրաստ է օգնել ուշ գիշերային ժամանումների կամ հասցեն գտնելու հարցում:',

    contactBadge: 'Կապ մեզ հետ',
    contactTitle: 'YEREVANHUB Աջակցության կենտրոն',
    contactSubtitle: 'Արագ արձագանք ամրագրումների, բնակարանների դիտման և արտակարգ հարցերի վերաբերյալ:',
    emergencyPhoneTitle: 'Երևանի շտապ կապի գիծ',
    emergencyPhoneHours: '24/7 շուրջօրյա աշխատանք',
    telegramTitle: 'Telegram աջակցություն',
    telegramHours: 'Առցանց 08:00 – 23:00',
    timezoneTitle: 'Սերվերի ժամային գոտի',
    timezoneValue: 'Asia/Yerevan (GMT+4)',
    timezoneDesc: 'Հայաստանի Հանրապետության պաշտոնական ժամանակը',
    faqTitle: 'Հաճախ տրվող հարցեր',
    faqs: [
      {
        q: 'Արդյո՞ք առցանց վճարում է պահանջվում հոսթել ամրագրելու համար:',
        a: 'Ոչ: Կայքում առցանց վճարումներ չկան: Կացության գումարը վճարվում է տեղում՝ հոսթելի ընդունարանում, ՀՀ դրամով (AMD):',
      },
      {
        q: 'Ի՞նչ անել, եթե Կիլիկիա կայարան եմ հասնում գիշերը ժամը 3-ին:',
        a: 'Օգտվեք վերևի մենյուի «Անհապաղ կացարան» բաժնից: Այնտեղ ցուցադրված են շուրջօրյա ընդունարան ունեցող հոսթելները:',
      },
      {
        q: 'Ինչպե՞ս ցույց տալ հոսթելի հասցեն տաքսու վարորդին:',
        a: 'Ամրագրումից հետո Ձեր անհատական էջում հասանելի է վարորդի համար մեծ տառերով հայերեն հասցեի քարտը և քարտեզի կոճակը:',
      },
    ],

    rulesBadge: 'Կանոններ և գաղտնիություն',
    rulesTitle: 'YEREVANHUB-ի ամրագրման, չեղարկման և օգտագործման կանոններ',
    rule1Title: '1. Ամրագրման և տեղում վճարման պայմաններ',
    rule1Desc: 'Բոլոր գները նշված են ՀՀ դրամով (AMD): Վճարումը կատարվում է հոսթելի ընդունարանում բանալին ստանալիս:',
    rule2Title: '2. Չեղարկման քաղաքականություն',
    rule2Desc: 'Ճանապարհորդները կարող են անվճար չեղարկել ամրագրումը ժամանումից մինչև 24 ժամ առաջ՝ անհատական հղման միջոցով:',
    rule3Title: '3. Գիշերային և վաղ ժամանում',
    rule3Desc: 'Ստանդարտ մուտքը 14:00-ին է: Եթե ժամանում եք գիշերը (մինչև 06:00), անմիջապես քնելու համար անհրաժեշտ է ամրագրել նախորդ օրվանից: Ուղեբեռը լոբբիում թողնելը միշտ անվճար է:',
    rule4Title: '4. Գաղտնիության պահպանում',
    rule4Desc: 'Հեռախոսահամարները, էլ. հասցեները և անհատական հետևման հղումները խիստ գաղտնի են և չեն տրամադրվում երրորդ կողմերին:',
  },
};

export const StaticPages: React.FC<Props> = ({ currentLang, pageType }) => {
  const content = STATIC_CONTENT[currentLang] || STATIC_CONTENT.fa;
  const settings=appStore.getState().settings;
  const unconfigured={fa:'هنوز اعلام نشده است.',en:'Not provided yet.',ru:'Пока не указано.',hy:'Դեռ նշված չէ։'}[currentLang];

  if (pageType === 'about') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold text-amber-700 uppercase">{content.aboutBadge}</span>
          <h1 className="text-3xl font-black text-slate-900">{content.aboutTitle}</h1>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            {content.aboutIntro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-base">{content.aboutCard1Title}</h3>
            <p className="text-slate-600 leading-relaxed">{content.aboutCard1Desc}</p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-900 text-base">{content.aboutCard2Title}</h3>
            <p className="text-slate-600 leading-relaxed">{content.aboutCard2Desc}</p>
          </div>
        </div>
      </div>
    );
  }

  if (pageType === 'contact') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold text-amber-700 uppercase">{content.contactBadge}</span>
          <h1 className="text-3xl font-black text-slate-900">{content.contactTitle}</h1>
          <p className="text-sm text-slate-600 font-medium">
            {content.contactSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <Phone className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">{content.emergencyPhoneTitle}</h3>
            <p className="font-mono text-sm font-bold text-slate-800 ltr-isolate">{settings.emergencyHotline||unconfigured}</p>
            <span className="text-[11px] text-slate-400 block">{settings.supportHours?.[currentLang]||(currentLang==='fa'?settings.supportWorkingHoursFa:'')||unconfigured}</span>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <Send className="w-8 h-8 text-sky-500 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">{content.telegramTitle}</h3>
            <p className="font-mono text-sm font-bold text-slate-800 ltr-isolate">{settings.telegramSupport||unconfigured}</p>
            <span className="text-[11px] text-slate-400 block">{settings.supportHours?.[currentLang]||(currentLang==='fa'?settings.supportWorkingHoursFa:'')||unconfigured}</span>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2 text-center">
            <Clock className="w-8 h-8 text-amber-500 mx-auto" />
            <h3 className="font-bold text-sm text-slate-900">{content.timezoneTitle}</h3>
            <p className="font-mono text-sm font-bold text-slate-800 ltr-isolate">{content.timezoneValue}</p>
            <span className="text-[11px] text-slate-400 block">{content.timezoneDesc}</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-600" />
            <span>{content.faqTitle}</span>
          </h2>
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 divide-y divide-slate-100">
            {content.faqs.map((faq, i) => (
              <div key={i} className="pt-3 space-y-1">
                <strong className="text-slate-900 block">{faq.q}</strong>
                <p className="text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Rules or Privacy
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3">
        <span className="text-xs font-bold text-amber-700 uppercase">{content.rulesBadge}</span>
        <h1 className="text-3xl font-black text-slate-900">{content.rulesTitle}</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 text-base">{content.rule1Title}</h2>
          <p className="text-slate-600 leading-relaxed">{content.rule1Desc}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 text-base">{content.rule2Title}</h2>
          <p className="text-slate-600 leading-relaxed">{content.rule2Desc}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 text-base">{content.rule3Title}</h2>
          <p className="text-slate-600 leading-relaxed">{content.rule3Desc}</p>
        </div>

        <div className="space-y-2">
          <h2 className="font-bold text-slate-900 text-base">{content.rule4Title}</h2>
          <p className="text-slate-600 leading-relaxed">{content.rule4Desc}</p>
        </div>
      </div>
    </div>
  );
};
