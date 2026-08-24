/**
 * Puts the wedding-type vocabulary into the listing pages at request time.
 *
 * The six types were written three times over: as checkbox markup on
 * /hotel-listing and all 53 city index pages, as a `weddingTypes` id-to-slug
 * map inside site-public/js/hotel-listing.js, and as tags on each venue in the
 * generated dataset. Nothing kept them in step, and only the third has moved
 * into the database on its own -- so the filter list is rebuilt here from
 * `venue_types` and the map is handed to the page script, leaving one source
 * for all three.
 *
 * The ids are not regenerated. `wedding_types[]=5` appears in shared and
 * indexed listing URLs, so a type keeps the number the original site gave it.
 */
import type { VenueTypeOption } from "./venue-types";
import { escapeHtml } from "./escape";

/** One checkbox, in the markup the accordion already used. */
function checkboxHtml(type: VenueTypeOption): string {
  return (
    '<div class="form-check mb-2">' +
    '<input class="form-check-input filter-checkbox" type="checkbox" ' +
    `name="wedding_types[]" value="${escapeHtml(String(type.id))}">` +
    `<label class="form-check-label">${escapeHtml(type.label)}</label>` +
    "</div>"
  );
}

function configScript(types: VenueTypeOption[]): string {
  // Shaped as hotel-listing.js reads it: the checkbox value to the tag stored
  // on a venue.
  const weddingTypes: Record<string, string> = {};
  for (const type of types) weddingTypes[String(type.id)] = type.slug;

  // `type="application/json"` rather than an executing assignment: this
  // changes with the venue-type list an admin edits, and CSP's `script-src`
  // has no way to allow-list content that varies -- a data block needs no
  // hash at all, since script-src doesn't govern it. hotel-listing.js reads
  // it with `JSON.parse(el.textContent)`.
  const json = JSON.stringify({ weddingTypes }).replace(/</g, "\\u003c");
  return `<script type="application/json" id="viraaya-listing-config">${json}</script>`;
}

/**
 * Registers the listing handlers.
 *
 * `types` is empty when the database could not be read. The checkbox list is
 * then left as the page stored it -- which is nothing, since the baked markup
 * was stripped -- so the Wedding Type filter is absent rather than wrong, and
 * the rest of the listing still works.
 */
export function applyVenueListingHandlers(rewriter: HTMLRewriter, types: VenueTypeOption[]): void {
  if (types.length > 0) {
    rewriter.on("#weddingType .accordion-body", {
      element(element) {
        element.setInnerContent(types.map(checkboxHtml).join(""), { html: true });
      },
    });
  }

  rewriter.on("head", {
    element(element) {
      element.append(configScript(types), { html: true });
    },
  });
}
