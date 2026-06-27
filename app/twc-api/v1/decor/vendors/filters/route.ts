export const dynamic = "force-dynamic";

// The mirrored TWC listing bundle's useGetCategoryFilters query applies
// `select: e => e.filters`, so this endpoint MUST return an object of the shape
// { filters: [...groups] }. React Query then hands the inner array to
// FilterAccordian. Each group is a tree node { id, key, label, type, filters }
// whose `key` becomes the query-string param when one of its children is
// selected (so the Special Tags group `key` must be "specialTags"). The
// "Event City" search box is rendered by the component itself, so it does not
// need to be part of this payload.
export async function GET() {
  return Response.json(
    {
      filters: [
        {
          id: "specialTags",
          key: "specialTags",
          groupKey: "specialTags",
          name: "Special Tags",
          label: "Special Tags",
          type: "checkbox",
          filters: [
            { id: "1004", key: "1004", groupKey: "specialTags", label: "Bestsellers", labelSlug: "bestsellers", filters: [] },
            { id: "1002", key: "1002", groupKey: "specialTags", label: "Premium", labelSlug: "premium", filters: [] },
            { id: "1003", key: "1003", groupKey: "specialTags", label: "Budget Friendly", labelSlug: "budget-friendly", filters: [] },
            { id: "1005", key: "1005", groupKey: "specialTags", label: "Viraaya's choice", labelSlug: "viraayas-choice", filters: [] }
          ]
        }
      ]
    },
    {
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex, nofollow, noarchive"
      }
    }
  );
}
