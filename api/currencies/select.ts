import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method && !["POST", "OPTIONS"].includes(request.method)) {
    response.statusCode = 405;
    response.setHeader("allow", "POST, OPTIONS");
    response.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  response.statusCode = 200;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify({ ok: true }));
}
