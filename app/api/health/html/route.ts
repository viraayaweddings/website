import { sanitiseRichText } from "@/worker/admin/rich-text";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reports whether HTML rewriting works in this runtime.
 *
 * The rewriter is a native/wasm capability rather than plain JS, and when it is
 * missing nothing says so: admin saves fail with a generic server error and
 * content injection quietly returns the page untouched. This exercises it end
 * to end -- a tag that must be dropped and markup that must survive untouched
 * -- so a broken deployment is one request away from being obvious.
 */
export async function GET(): Promise<Response> {
  const sample = '<p class="x">Udaipur &amp; Jaipur</p><script>x()</script>';
  const expected = '<p class="x">Udaipur &amp; Jaipur</p>';

  try {
    const result = await sanitiseRichText(sample);
    if (result !== expected) {
      return Response.json(
        { ok: false, error: "HTML rewriting produced unexpected output.", result },
        { status: 500 },
      );
    }
    return Response.json({ ok: true, rewriter: "available" });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
