"use client";

import type { MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type PhotographerCard = {
  vendorId: string;
  name: string;
  href: string;
  city: string;
  citySlug: string;
  place: string;
  rating: string;
  ratingValue: number | null;
  badges: string[];
  isPartner: boolean;
  images: string[];
};

type CityData = {
  slug: string;
  name: string;
  sourceCount?: number;
  importedCount?: number;
};

type QueryResult = {
  size: number;
  nextPageUrl: string | null;
  page: number;
  limit: number;
  results: PhotographerCard[];
};

const popularCities = ["Delhi", "Gurugram", "Noida", "Jaipur", "Udaipur"];
const modalCities = ["Delhi", "Gurugram", "Noida", "Jaipur", "Udaipur"];
const tabs = ["All", "Bestsellers", "Premium", "Viraaya's choice"];

const filterGroups = [
  {
    title: "Photography Style",
    param: "style",
    items: ["Candid", "Traditional", "Pre-wedding", "Cinematic"]
  },
  {
    title: "Experience",
    param: "experience",
    items: ["< 2 years", "2-5 years", "5-10 years", "10+ years"]
  },
  {
    title: "Ratings",
    param: "rating",
    items: ["Rated ★ 4.5+", "Rated ★ 4+", "Rated ★ 3+"]
  }
];

function SearchIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-4.2-4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function titleCity(slug?: string | null) {
  if (!slug) return "Wedding Photographers";
  return `Wedding Photographers in ${slug.slice(0, 1).toUpperCase()}${slug.slice(1)}`;
}

function PhotographerCardComponent({ photographer }: { photographer: PhotographerCard }) {
  const images = photographer.images.length ? photographer.images : ["/twc-next/static/media/hotel-taj.cca019c4.webp"];
  const visibleImages = images.slice(0, Math.max(1, Math.min(images.length, 4)));
  const [activeImage, setActiveImage] = useState(0);
  const hasCarousel = visibleImages.length > 1;

  function changeImage(event: MouseEvent, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImage((current) => (current + direction + visibleImages.length) % visibleImages.length);
  }

  function selectImage(event: MouseEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    setActiveImage(index);
  }

  return (
    <a className="venue-card" href={photographer.href}>
      {photographer.isPartner ? <div className="venue-partner">Viraaya Partner</div> : null}
      <div className="venue-photo-wrap">
        <img
          className="venue-photo active"
          src={visibleImages[activeImage]}
          alt=""
          key={`${visibleImages[activeImage]}-${activeImage}`}
          loading="lazy"
          decoding="async"
        />
        {hasCarousel ? (
          <>
            <button
              aria-label={`Previous photo for ${photographer.name}`}
              className="venue-card-arrow left"
              type="button"
              onClick={(event) => changeImage(event, -1)}
            >
              ‹
            </button>
            <button
              aria-label={`Next photo for ${photographer.name}`}
              className="venue-card-arrow right"
              type="button"
              onClick={(event) => changeImage(event, 1)}
            >
              ›
            </button>
          </>
        ) : null}
        {photographer.badges.length ? (
          <div className="venue-badges">
            {photographer.badges.slice(0, 3).map((badge, index) => (
              <span className={index === photographer.badges.length - 1 ? "gold" : "pink"} key={badge}>
                {badge}
              </span>
            ))}
          </div>
        ) : null}
        {hasCarousel ? (
          <div className="venue-dots">
            {visibleImages.map((image, index) => (
              <button
                aria-label={`Show photo ${index + 1} for ${photographer.name}`}
                className={index === activeImage ? "active" : ""}
                key={`${image}-dot-${index}`}
                type="button"
                onClick={(event) => selectImage(event, index)}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="venue-card-body">
        <h2>{photographer.name}</h2>
        <p className="venue-rating"><span>&#9733;</span>{photographer.rating}</p>
        <p className="venue-place">{photographer.place}</p>
      </div>
    </a>
  );
}

function SeoContent({ citySlug }: { citySlug?: string | null }) {
  const cityName = citySlug ? citySlug.slice(0, 1).toUpperCase() + citySlug.slice(1) : "India";
  return (
    <section className="venues-seo">
      <p>
        Looking for the perfect wedding photographer in {cityName}? Your wedding photographs are memories you will treasure forever. Browse curated wedding photographers, compare styles, ratings, and experience, then shortlist the one who truly captures your story.
      </p>
      <h2>Popular Wedding Photography Styles in {cityName}</h2>
      <p>Couples usually choose between candid photography, traditional photography, cinematic videography, and pre-wedding shoots depending on their style and event needs. Many photographers combine multiple styles.</p>
      <h2>Candid vs Traditional Wedding Photography</h2>
      <p>Candid photography captures natural, unposed moments and emotions as they unfold. Traditional photography focuses on formal portraits and group shots with posed setups. Most couples opt for a blend of both to have a complete wedding album.</p>
      <h2>What should we check before booking a wedding photographer?</h2>
      <ul>
        <li>Portfolio and photography style</li>
        <li>Deliverables such as albums, prints, and raw files</li>
        <li>Number of photographers and videographers</li>
        <li>Turnaround time for edited photos and videos</li>
        <li>Availability for your wedding date</li>
      </ul>
    </section>
  );
}

export default function PhotographersClient({
  initial,
  citySlug,
  cities
}: {
  initial: QueryResult;
  citySlug?: string | null;
  cities: CityData[];
}) {
  const [photographers, setPhotographers] = useState(initial.results);
  const [total, setTotal] = useState(initial.size);
  const [nextPageUrl, setNextPageUrl] = useState(initial.nextPageUrl);
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const didMount = useRef(false);

  const cityName = useMemo(() => titleCity(citySlug), [citySlug]);

  function buildParams(page = 1, tab = activeTab) {
    const params = new URLSearchParams();
    if (citySlug) params.set("city", citySlug);
    params.set("limit", "24");
    params.set("page", String(page));
    params.set("tab", tab);
    if (search.trim()) params.set("search", search.trim());
    Object.entries(selected).forEach(([key, values]) => {
      values.forEach((value) => params.append(key, value));
    });
    return params;
  }

  async function runSearch(page = 1, append = false, tab = activeTab) {
    setLoading(true);
    const params = buildParams(page, tab);
    const response = await fetch(`/api/photographers?${params.toString()}`);
    const data = (await response.json()) as QueryResult;
    setPhotographers((current) => (append ? [...current, ...data.results] : data.results));
    setTotal(data.size);
    setNextPageUrl(data.nextPageUrl);
    setLoading(false);
  }

  function toggleValue(param: string, item: string) {
    setSelected((current) => {
      const existing = current[param] || [];
      const next = existing.includes(item)
        ? existing.filter((value) => value !== item)
        : [...existing, item];
      return { ...current, [param]: next };
    });
  }

  async function changeTab(tab: string) {
    setActiveTab(tab);
  }

  async function showMore() {
    if (!nextPageUrl) return;
    setLoading(true);
    const response = await fetch(nextPageUrl);
    const data = (await response.json()) as QueryResult;
    setPhotographers((current) => [...current, ...data.results]);
    setTotal(data.size);
    setNextPageUrl(data.nextPageUrl);
    setLoading(false);
  }

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timeout = window.setTimeout(() => {
      void runSearch(1, false, activeTab);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, selected, activeTab]);

  return (
    <main className="venues-page">
      <input aria-hidden="true" className="venues-modal-toggle" id="venues-city-modal-toggle" type="checkbox" />
      <a className="venues-mobile-select" href="/wedding-photographers">Select event city</a>
      <section className="venues-hero-band">
        <h1>{cityName}</h1>
        <label className="venues-search">
          <SearchIcon />
          <input
            placeholder="Search photographer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
          />
        </label>
      </section>
      <section className="venues-mobile-cities">
        {modalCities.map((city) => (
          <a className="venues-city-chip" href={`/wedding-photographers/${city.toLowerCase()}`} key={city}>
            {city}
          </a>
        ))}
      </section>
      <div className="venues-shell">
        <aside className="venues-filters">
          <div className="venues-filter-title">Filters</div>
          <section className="venues-filter-section">
            <div className="venues-section-heading">
              <strong>Event City</strong>
              <span>+</span>
            </div>
            <a className="venues-city-search" href="/wedding-photographers">
              <span>o</span>
              Search your event city
            </a>
            <p className="venues-popular-label">POPULAR CITIES</p>
            <div className="venues-city-pills">
              {popularCities.map((city) => (
                <a
                  className={city.toLowerCase() === citySlug ? "active" : ""}
                  href={`/wedding-photographers/${city.toLowerCase()}`}
                  key={city}
                >
                  {city}
                </a>
              ))}
            </div>
          </section>
          {filterGroups.map((group) => (
            <section className="venues-filter-section" key={group.title}>
              <details open>
                <summary>{group.title}<span>^</span></summary>
                <div className="venues-checks">
                  {group.items.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={(selected[group.param] || []).includes(item)}
                        onChange={() => toggleValue(group.param, item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </details>
            </section>
          ))}
          <button className="venues-apply" type="button" onClick={() => runSearch()}>
            Apply filters
          </button>
        </aside>
        <section className="venues-results">
          <p className="venues-breadcrumb">
            Viraaya Weddings / <strong>{citySlug ? `Wedding Photographers / ${cityName.replace("Wedding Photographers in ", "")}` : "Wedding Photographers"}</strong>
          </p>
          <div className="venues-results-head">
            <p>Showing <strong>{total} results</strong> as per your search criteria</p>
            <div className="venues-tabs">
              {tabs.map((tab) => (
                <button className={activeTab === tab ? "active" : ""} type="button" key={tab} onClick={() => changeTab(tab)}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="venues-grid">
            {photographers.map((photographer) => (
              <PhotographerCardComponent photographer={photographer} key={photographer.vendorId} />
            ))}
          </div>
          {nextPageUrl ? (
            <button className="venues-show-more" type="button" onClick={showMore} disabled={loading}>
              {loading ? "Loading..." : "Show More"}
            </button>
          ) : null}
        </section>
      </div>
      <SeoContent citySlug={citySlug} />
      <div className="venues-links">
        <section className="venues-link-group">
          <p>Explore by City</p>
          <div>
            {cities.map((city) => (
              <a href={`/wedding-photographers/${city.slug}`} key={city.slug}>
                Wedding Photographers in {city.name}
              </a>
            ))}
          </div>
        </section>
      </div>
      <div className="venues-fixed-actions">
        <button type="button" className="quote">Get Free Quote</button>
        <button type="button" className="chat">Chat with us</button>
      </div>
      <button className="venues-to-top" type="button">^</button>
    </main>
  );
}
