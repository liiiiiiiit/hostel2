import type {
  AppLanguage,
  Hostel,
  RentalProperty,
  Article,
} from "../types/index.js";
import { parseRoute, routeHash, type Route } from "./navigation.js";
export const publicLanguages: AppLanguage[] = ["fa", "en", "ru", "hy"];
const list: Record<string, string> = {
  recommendations: "recommendations",
  home: "",
  hostels: "hostels",
  rentals: "rentals",
  guide: "guides",
  translator: "translator",
  about: "about",
  contact: "contact",
  rules: "rules",
  privacy: "privacy",
};
export function parseBrowserRoute(path: string, hash: string): Route {
  if (hash.startsWith("#/")) return parseRoute(hash);
  const url = new URL(path, "https://local.invalid"),
    parts = url.pathname.split("/").filter(Boolean);
  if (!parts.length) return { view: "home", params: {} };
  if (!publicLanguages.includes(parts[0] as AppLanguage))
    return { view: "not-found", params: {} };
  const query = url.search;
  if (parts.length === 1) return parseRoute("#/" + query);
  if (parts.length === 2) {
    const found = Object.entries(list).find(
      ([, segment]) => segment === parts[1],
    );
    return found
      ? parseRoute("#/" + found[0] + query)
      : { view: "not-found", params: {} };
  }
  if (parts.length === 3) {
    const segment = (
      { hostels: "hostel", rentals: "rental", guides: "article" } as Record<
        string,
        string
      >
    )[parts[1]];
    if (segment) return parseRoute("#/" + segment + "/" + parts[2] + query);
  }
  return { view: "not-found", params: {} };
}
export function browserPath(
  view: string,
  params: Record<string, unknown>,
  lang: AppLanguage,
  entities: {
    hostels: Hostel[];
    rentals: RentalProperty[];
    articles: Article[];
  },
) {
  const section =
    view === "hostel-detail"
      ? "hostels"
      : view === "rental-detail"
        ? "rentals"
        : view === "article-detail"
          ? "guides"
          : undefined;
  if (section) {
    const id = String(params.id ?? params.slug ?? "");
    const item =
      section === "hostels"
        ? entities.hostels.find((h) => h.id === id || h.slug === id)
        : section === "rentals"
          ? entities.rentals.find((r) => r.id === id || r.slug === id)
          : entities.articles.find((a) => a.id === id || a.slug === id);
    const raw = routeHash(view, params);
    const query = raw.includes("?") ? "?" + raw.split("?")[1] : "";
    return `/${lang}/${section}/${encodeURIComponent(item?.slug ?? id)}${query}`;
  }
  if (view in list) {
    const raw = routeHash(view, params);
    return `/${lang}/${list[view]}${raw.includes("?") ? "?" + raw.split("?")[1] : ""}`;
  }
  return "/" + routeHash(view, params);
}
