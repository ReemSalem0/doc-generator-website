import en from "./locales/en.js";
import he from "./locales/he.js";

const dictionaries = { en, he };
const STORAGE_KEY = "language";
let language = loadLanguage();

//Saved choice first, otherwise the phone's language
function loadLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved in dictionaries ? saved : "he";
}

//Looks up a text, e.g. t("home.deleteCount", { count: 3 })
export function t(key, param = {}) {
    const text = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name) => param[name] ?? "");
}

//Translates every marked element inside root (the page, or a freshly cloned card)
export function translate(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-label]").forEach((el) => {
        el.setAttribute("aria-label", t(el.dataset.i18nLabel));
    });
}

//Sets the page language and direction, then translates
export function applyLanguage() {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
    translate();
}

export function setLanguage(newLanguage) {
    language = newLanguage;
    localStorage.setItem(STORAGE_KEY, language);
    applyLanguage();
    window.dispatchEvent(new Event("languagechange"));
}

export function toggleLanguage() {
    setLanguage(language === "he" ? "en" : "he");
}

applyLanguage();