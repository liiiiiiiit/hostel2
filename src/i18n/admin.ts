import type { AppLanguage } from "../types";
const copy = {
  en: {
    edit: "Edit",
    results: "Results",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
    activity: "Latest activity",
    manage: "Manage booking",
  },
  fa: {
    edit: "ویرایش",
    results: "نتایج",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    of: "از",
    activity: "آخرین فعالیت‌ها",
    manage: "مدیریت رزرو",
  },
  ru: {
    edit: "Изменить",
    results: "Результаты",
    previous: "Назад",
    next: "Далее",
    page: "Страница",
    of: "из",
    activity: "Последние действия",
    manage: "Управление бронью",
  },
  hy: {
    edit: "Խմբագրել",
    results: "Արդյունքներ",
    previous: "Նախորդ",
    next: "Հաջորդ",
    page: "Էջ",
    of: "/",
    activity: "Վերջին գործողություններ",
    manage: "Կառավարել ամրագրումը",
  },
};
export const adminText = (language: AppLanguage) => copy[language];
