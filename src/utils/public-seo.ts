import { articleInLanguage } from "./article-language.js";
import type { ClientState, AppLanguage } from "../types/index.js";
const languages: AppLanguage[] = ["fa", "en", "ru", "hy"];
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const intro = {
  fa: "اقامت در ارمنستان",
  en: "Stays in Armenia",
  ru: "Проживание в Армении",
  hy: "Կացություն Հայաստանում",
};
export function publicPage(state: ClientState, rawPath: string, base: string) {
  const url = new URL(rawPath, "https://local.invalid");
  let parts: string[];
  try {
    parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  } catch {
    return {
      status: 404,
      title: "YEREVANHUB",
      head: '<meta name="robots" content="noindex">',
      content: "<h1>404</h1>",
      description: "",
      image: "",
      noindex: true,
      lang: "fa" as AppLanguage,
    };
  }
  if (parts.length === 0) parts = ["fa"];
  const lang = languages.includes(parts[0] as AppLanguage)
    ? (parts[0] as AppLanguage)
    : "fa";
  const section = parts[1];
  let title = intro[lang] + " · YEREVANHUB",
    description = intro[lang],
    image = "",
    content = "",
    status = 200,
    noindex = false;
  let available = languages;
  const list = () =>
    `<ul>${state.hostels
      .filter((h) => h.isPublished)
      .map(
        (h) =>
          `<li><a href="/${lang}/hostels/${encodeURIComponent(h.slug)}">${escape(h.name[lang])}</a></li>`,
      )
      .join("")}${state.rentals
      .filter((r) => r.status === "published")
      .map(
        (r) =>
          `<li><a href="/${lang}/rentals/${encodeURIComponent(r.slug)}">${escape(r.title[lang])}</a></li>`,
      )
      .join("")}</ul>`;
  if (!languages.includes(parts[0] as AppLanguage) || parts.length > 3)
    status = 404;
  else if (parts.length === 1)
    content = `<h1>${escape(intro[lang])}</h1>${list()}`;
  else if (
    parts.length === 2 &&
    [
      "hostels",
      "rentals",
      "guides",
      "translator",
      "about",
      "contact",
      "rules",
      "privacy",
      "recommendations",
    ].includes(section)
  ) {
    content = `<h1>${escape(section === "hostels" || section === "rentals" ? intro[lang] : section)}</h1>${
      section === "guides"
        ? "<ul>" +
          state.articles
            .filter((a) => a.status === "published")
            .flatMap((a) => articleInLanguage(a, lang) ?? [])
            .map(
              (a) =>
                `<li><a href="/${lang}/guides/${encodeURIComponent(a.slug)}">${escape(a.title)}</a></li>`,
            )
            .join("") +
          "</ul>"
        : list()
    }`;
  } else if (parts.length === 3 && section === "hostels") {
    const h = state.hostels.find((h) => h.isPublished && h.slug === parts[2]);
    if (!h) status = 404;
    else {
      title = h.name[lang] + " · YEREVANHUB";
      description = h.description?.[lang] ?? h.address[lang];
      image = h.photos[0] ?? "";
      noindex = !!h.sampleContent;
      content = `<h1>${escape(h.name[lang])}</h1><p>${escape(description)}</p><p>${escape(h.address[lang])}</p>${h.sampleContent ? "<p>Sample / unverified content</p>" : ""}<ul>${h.roomTypes.map((room) => `<li>${escape(room.name[lang])} · ${room.pricePerNightAMD} AMD / ${room.type === "private" ? "room" : "bed"} / night</li>`).join("")}</ul>`;
    }
  } else if (parts.length === 3 && section === "rentals") {
    const r = state.rentals.find(
      (r) => r.status === "published" && r.slug === parts[2],
    );
    if (!r) status = 404;
    else {
      title = r.title[lang] + " · YEREVANHUB";
      description = r.description?.[lang] ?? r.approximateLocationLabel;
      image = r.photos[0] ?? "";
      noindex = !!r.sampleContent;
      content = `<h1>${escape(r.title[lang])}</h1><p>${escape(description)}</p><p>${escape(r.addressPublic)}</p><p>${r.areaSqm} m² · ${r.maxResidents} guests</p><p>${r.pricePerNightAMD ?? "—"} AMD / night · ${r.pricePerMonthAMD ?? "—"} AMD / month</p>`;
    }
  } else if (parts.length === 3 && section === "guides") {
    const original = state.articles.find(
      (a) => a.status === "published" && a.slug === parts[2],
    );
    const a = original ? articleInLanguage(original, lang) : undefined;
    if (!a) status = 404;
    else {
      available = languages.filter(
        (language) => !!articleInLanguage(original!, language),
      );
      title = a.title + " · YEREVANHUB";
      description = a.summary;
      image = a.featuredImage;
      content = `<article><h1>${escape(a.title)}</h1><p>${escape(a.summary)}</p><div style="white-space:pre-wrap">${escape(a.content)}</div></article>`;
    }
  } else status = 404;
  if (status === 404) {
    title = "404 · YEREVANHUB";
    description = "";
    noindex = true;
    content = "<h1>404</h1>";
  }
  const canonical =
    base + url.pathname.replace(/\/$/, "") + (parts.length === 1 ? "/" : "");
  const alternate = (language: AppLanguage) =>
    base + url.pathname.replace(/^\/(fa|en|ru|hy)/, "/" + language);
  const head = `<title>${escape(title)}</title><meta name="description" content="${escape(description.slice(0, 300))}"><link rel="canonical" href="${escape(canonical)}"><meta name="robots" content="${noindex ? "noindex,nofollow" : "index,follow"}"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description.slice(0, 300))}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:locale" content="${lang}">${image ? `<meta property="og:image" content="${escape(new URL(image, base || "https://local.invalid").href)}">` : ""}${status === 200 ? available.map((language) => `<link rel="alternate" hreflang="${language}" href="${escape(alternate(language))}">`).join("") : ""}`;
  return { status, lang, title, description, head, content, noindex, image };
}
export function renderPublicHtml(
  template: string,
  state: ClientState,
  rawPath: string,
  base: string,
) {
  const page = publicPage(state, rawPath, base);
  const stripped = template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(
      /<meta[^>]+(?:name="description"|property="og:[^"]+")[^>]*>/gi,
      "",
    );
  return {
    status: page.status,
    html: stripped
      .replace(
        /<html[^>]*>/,
        `<html lang="${page.lang ?? "fa"}" dir="${page.lang === "fa" ? "rtl" : "ltr"}">`,
      )
      .replace("</head>", page.head + "</head>")
      .replace(
        '<div id="root"></div>',
        `<div id="root"><main>${page.content}</main></div>`,
      ),
  };
}
export function sitemap(state: ClientState, base: string) {
  const paths = languages
    .flatMap((lang) => [
      `/${lang}/`,
      `/${lang}/hostels`,
      `/${lang}/rentals`,
      `/${lang}/guides`,
      ...state.hostels
        .filter((h) => h.isPublished && !h.sampleContent)
        .map((h) => `/${lang}/hostels/${encodeURIComponent(h.slug)}`),
      ...state.rentals
        .filter((r) => r.status === "published" && !r.sampleContent)
        .map((r) => `/${lang}/rentals/${encodeURIComponent(r.slug)}`),
    ])
    .concat(
      state.articles
        .filter((a) => a.status === "published")
        .flatMap((a) =>
          languages
            .filter((lang) => !!articleInLanguage(a, lang))
            .map((lang) => `/${lang}/guides/${encodeURIComponent(a.slug)}`),
        ),
    );
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${escape(base + path)}</loc></url>`).join("")}</urlset>`;
}
export const robots = (base: string) =>
  `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /account\nDisallow: /admin\nDisallow: /manager\nSitemap: ${base}/sitemap.xml\n`;
