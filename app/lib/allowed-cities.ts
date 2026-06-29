export const allowedCities = [
  { slug: "delhi", name: "Delhi" },
  { slug: "gurugram", name: "Gurugram" },
  { slug: "noida", name: "Noida" },
  { slug: "jaipur", name: "Jaipur" },
  { slug: "udaipur", name: "Udaipur" }
] as const;

export const allowedCitySlugs: string[] = allowedCities.map((city) => city.slug);

const allowedCitySlugSet = new Set<string>(allowedCitySlugs);

export function normalizeCitySlug(value: string | null | undefined) {
  return decodeURIComponent(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isAllowedCitySlug(value: string | null | undefined) {
  return allowedCitySlugSet.has(normalizeCitySlug(value));
}

export function allowedCityName(slug: string) {
  return allowedCities.find((city) => city.slug === normalizeCitySlug(slug))?.name || slug;
}
