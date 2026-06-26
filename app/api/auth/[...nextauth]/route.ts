// Local stub for the mirror's next-auth client. Handles every /api/auth/*
// sub-path (session, csrf, providers, _log, …). The "_log" endpoint MUST exist
// and succeed — otherwise next-auth loops (error → _log → 404 → error …),
// spamming CLIENT_FETCH_ERROR and pegging the main thread.

function endpoint(pathname: string): string {
  return pathname.split("/").filter(Boolean).pop() || "";
}

export function GET(_req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return resolve(_req, ctx);
}

export function POST(_req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  return resolve(_req, ctx);
}

async function resolve(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const segs = (await ctx.params).nextauth || [];
  const last = segs[segs.length - 1] || endpoint(new URL(req.url).pathname);

  switch (last) {
    case "session":
      return Response.json({}); // unauthenticated session (must be an object)
    case "csrf":
      return Response.json({ csrfToken: "" });
    case "providers":
      return Response.json({});
    case "_log":
      return new Response(null, { status: 204 });
    default:
      return Response.json({});
  }
}
