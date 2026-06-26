export const dynamic = "force-dynamic";

// Mirrors /v1/venue/vendors/locality/{slug}/ — locality metadata (the live
// response is null for most venues). Served locally.
export async function GET() {
  return Response.json({ localityName: null, localitySlug: null });
}
