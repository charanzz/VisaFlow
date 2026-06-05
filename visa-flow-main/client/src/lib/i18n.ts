import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ta from "@/locales/ta.json";
import ja from "@/locales/ja.json";
import zh from "@/locales/zh.json";
import ko from "@/locales/ko.json";

const savedLang = localStorage.getItem("vf_language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ta: { translation: ta },
    ja: { translation: ja },
    zh: { translation: zh },
    ko: { translation: ko },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
