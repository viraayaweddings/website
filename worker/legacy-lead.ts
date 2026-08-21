export function legacyLeadGetResponse(): Response {
  return Response.json(
    {
      deprecated: true,
      method: "POST",
      endpoint: "/api/lead",
      csrf: "/api/lead/csrf",
      message: "Submit enquiries with POST /api/lead and a CSRF token from /api/lead/csrf.",
    },
    {
      status: 410,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-deprecated-endpoint": "/api/lead",
      },
    },
  );
}

export function withDeprecatedLeadHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-deprecated-endpoint", "/api/lead");
  headers.set("x-api-canonical", "/api/lead");
  return new Response(response.body, { status: response.status, headers });
}

export const LEGACY_LEAD_PATHS = new Set(["/contact/save", "/get_in_touch/store", "/blog-form-submit"]);
