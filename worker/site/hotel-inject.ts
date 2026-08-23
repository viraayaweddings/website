/**
 * HTMLRewriter handlers that fill the venue page shell with database content.
 */
import type { Hotel } from "../db/schema";
import type { CalculatorConfig } from "./calculator-store";
import { parseNearby, renderNearbyCards, resolveVenues } from "./venue-listing";
import { GLANCE_LABEL_KEYS, renderLabel, type ResolvedLabels } from "./labels";
import { parseFaqs } from "./blog";
import {
  parseHighlights,
  renderGallery,
  renderGalleryThumbnails,
  renderHighlights,
  renderHotelFaqItems,
} from "./hotel";

/** The "at a glance" values, in the order the template lays them out. */
const GLANCE_FIELDS: (keyof Hotel)[] = [
  "roomInventory",
  "indoorVenues",
  "outdoorVenues",
  "guestCapacity",
  "receptionCapacity",
];

export function applyHotelHandlers(
  rewriter: HTMLRewriter,
  hotel: Hotel,
  /** All published venues, used to resolve the nearby strip. */
  allVenues: Hotel[] = [],
  /** Numeric id of this venue's city, for the "View All" filter link. */
  cityId = "",
  /** Editable section headings and field labels. */
  labels?: ResolvedLabels,
  /** Cities, taxes and room capacities from the calculator tables. */
  calculator?: CalculatorConfig | null,
): void {
  const canonical = `/destination-wedding/${hotel.city}/${hotel.slug}`;

  // --- head ---------------------------------------------------------------
  rewriter.on("title", {
    element(element) {
      element.setInnerContent(hotel.seoTitle);
    },
  });

  const metaContent: [string, string][] = [
    ['meta[name="description"]', hotel.metaDescription],
    ['meta[name="keywords"]', hotel.metaKeywords],
    ['meta[property="og:title"]', hotel.seoTitle],
    ['meta[property="og:description"]', hotel.metaDescription],
    ['meta[property="og:image"]', hotel.ogImage],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', hotel.seoTitle],
    ['meta[name="twitter:description"]', hotel.metaDescription],
    ['meta[name="twitter:image"]', hotel.ogImage],
  ];

  for (const [selector, value] of metaContent) {
    rewriter.on(selector, {
      element(element) {
        element.setAttribute("content", value);
      },
    });
  }

  rewriter.on('link[rel="canonical"]', {
    element(element) {
      element.setAttribute("href", canonical);
    },
  });

  // --- banner -------------------------------------------------------------
  rewriter.on("section.listing-details-banner", {
    element(element) {
      if (!hotel.bannerImage) return;
      element.setAttribute("style", `background-image: url('${hotel.bannerImage}');`);
    },
  });

  rewriter.on(".listing-details-banner h1", {
    element(element) {
      element.setInnerContent(hotel.name);
    },
  });

  rewriter.on(".listing-details-banner p.font-family03", {
    element(element) {
      element.setInnerContent(hotel.address);
    },
  });

  if (labels) {
    // The two icons are told apart by the alt text the template ships.
    rewriter.on(".pikup-drop img[alt]", {
      element(element) {
        const alt = element.getAttribute("alt");
        if (alt === "Airport") element.setAttribute("alt", renderLabel(labels, "venue.airport", "").html);
        else if (alt === "Railway Station") {
          element.setAttribute("alt", renderLabel(labels, "venue.station", "").html);
        }
      },
    });

    rewriter.on(".view-more-btn", {
      element(element) {
        element.setInnerContent(renderLabel(labels, "venue.viewMore", "").html, { html: true });
      },
    });
  }

  // Airport time first, then railway station. The icon spans carry a class;
  // the value spans do not, which is what separates them here.
  let timeIndex = 0;
  rewriter.on(".pikup-drop span", {
    element(element) {
      if (element.hasAttribute("class")) return;
      const value = timeIndex === 0 ? hotel.airportTime : hotel.stationTime;
      timeIndex += 1;
      element.setInnerContent(value);
    },
  });

  // --- overview -----------------------------------------------------------
  rewriter.on("h3.fs-37.text-maroon-900", {
    element(element) {
      element.setInnerContent(hotel.name);
    },
  });

  rewriter.on(".description-text", {
    element(element) {
      // Stored as HTML by design; authored only by signed-in editors.
      element.setInnerContent(hotel.description, { html: true });
    },
  });

  // The five entries carry no ids, so both the label and its value are matched
  // by position: the template always lays them out in this order.
  let labelIndex = 0;
  rewriter.on(".feature-items h5", {
    element(element) {
      const key = GLANCE_LABEL_KEYS[labelIndex];
      labelIndex += 1;
      if (!labels || !key) return;
      element.setInnerContent(renderLabel(labels, key, "").html, { html: true });
    },
  });

  let valueIndex = 0;
  rewriter.on(".feature-items p.font-family02", {
    element(element) {
      const field = GLANCE_FIELDS[valueIndex];
      valueIndex += 1;
      if (field) element.setInnerContent(String(hotel[field] ?? ""));
    },
  });

  if (labels) {
    // Four headings share the all-heading class. The gallery one carries mb-3
    // and the similar-hotels one text-white; the remaining two are told apart
    // by order, which the templates keep stable.
    const plainHeadings = ["venue.amenities", "venue.faq"];
    let plainIndex = 0;

    rewriter.on("h2.all-heading", {
      element(element) {
        const classes = element.getAttribute("class") || "";

        let key: string | undefined;
        if (classes.includes("text-white")) key = "venue.similar";
        else if (classes.includes("mb-3")) key = "venue.gallery";
        else {
          key = plainHeadings[plainIndex];
          plainIndex += 1;
        }
        if (!key) return;

        const rendered = renderLabel(labels, key, "fw-600");
        element.setInnerContent(rendered.html, { html: rendered.hasHtml });
      },
    });

    rewriter.on("h4.font-family03.fs-18", {
      element(element) {
        const rendered = renderLabel(labels, "venue.glance", "text-primary fw-800");
        element.setInnerContent(rendered.html, { html: rendered.hasHtml });
      },
    });
  }

  // --- amenities and questions --------------------------------------------
  const highlights = parseHighlights(hotel.highlights);

  rewriter.on(".hotel-amenities", {
    element(element) {
      element.setInnerContent(renderHighlights(highlights), { html: true });
    },
  });

  // The gallery repeats the banner and highlight images, so it is regenerated
  // rather than inherited from whichever venue the shell came from.
  rewriter.on(".slider.main-slider", {
    element(element) {
      element.setInnerContent(renderGallery(hotel, highlights), { html: true });
    },
  });

  rewriter.on(".slider-thumbnails", {
    element(element) {
      element.setInnerContent(renderGalleryThumbnails(hotel, highlights), { html: true });
    },
  });

  // Only a few venues carry a tour video; the shell holds whichever one its
  // source venue used.
  if (hotel.videoId) {
    rewriter.on('iframe[src^="/vendor/youtube-local/"]', {
      element(element) {
        element.setAttribute("src", `/vendor/youtube-local/${hotel.videoId}.html`);
      },
    });
  }

  // "View All" filters the venue listing by this venue's city.
  if (cityId) {
    rewriter.on('a[href^="/hotel-listing?city_ids"]', {
      element(element) {
        element.setAttribute("href", `/hotel-listing?city_ids%5B%5D=${encodeURIComponent(cityId)}`);
      },
    });
  }

  rewriter.on("#weddingFAQ", {
    element(element) {
      element.setInnerContent(renderHotelFaqItems(parseFaqs(hotel.faqs)), { html: true });
    },
  });

  // --- enquiry form and calculator hand-off --------------------------------
  rewriter.on("#hotelId", {
    element(element) {
      element.setAttribute("value", hotel.externalHotelId);
    },
  });

  /**
   * Room capacity, from `calculator_hotels`.
   *
   * `hotels.total_rooms` held the same number in a second admin field that
   * nothing kept in step with this one -- the venue calculator capped from one,
   * /compare-hotel capped from the other, and the two could disagree without
   * anything saying so. The calculator table is the single source now; the
   * venue field is gone. Falling back to whatever the shell already carries is
   * deliberate: an id that names no calculator hotel is a link to fix in the
   * panel, not a reason to uncap the input.
   */
  rewriter.on("#hotelTotalRooms", {
    element(element) {
      const cap = calculator?.roomsByHotel?.[String(hotel.externalHotelId).trim()];
      if (cap === undefined) return;
      element.setAttribute("value", String(cap));
    },
  });

  rewriter.on('input[name="hotel_id"]', {
    element(element) {
      element.setAttribute("value", hotel.externalHotelId);
    },
  });

  rewriter.on('input[name="hotel_name"]', {
    element(element) {
      element.setAttribute("value", hotel.name);
    },
  });

  rewriter.on('input[name="source_page"]', {
    element(element) {
      element.setAttribute("value", canonical);
    },
  });

  // The nearby strip keeps its stored selection; only the card contents are
  // regenerated, so renaming a venue updates every page that references it.
  const nearby = resolveVenues(parseNearby(hotel.nearbySlugs), allVenues);
  if (nearby.length > 0) {
    rewriter.on(".browse-similar-wrapper .row.g-4", {
      element(element) {
        element.setInnerContent(renderNearbyCards(nearby, labels), { html: true });
      },
    });
  }

  // Two modals share this class: the venue enquiry one, and a generic
  // "Write to Us" whose heading carries an extra class. Only the first is ours.
  rewriter.on(".modal-title", {
    element(element) {
      if ((element.getAttribute("class") || "").trim() !== "modal-title") return;
      element.setInnerContent(`Send Enquiry for ${hotel.name}`);
    },
  });
}
