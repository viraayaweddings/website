import type { IncomingMessage, ServerResponse } from "node:http";

/** @deprecated Vinext dev-only shim. Production uses `worker/index.ts`. */
export default function handler(request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 410;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("x-deprecated-endpoint", "/api/currencies/select");
  response.end(
    JSON.stringify({
      ok: false,
      deprecated: true,
      message: "Use POST /api/currencies/select in production or app route during local dev.",
    }),
  );
}
