import type { IncomingMessage, ServerResponse } from "node:http";

const currencies = [
  {
    name: "Indian Rupee",
    code: "INR",
    symbol: "₹",
    rate_to_usd: 94.15,
    is_default: true,
  },
] as const;

export default function handler(_request: IncomingMessage, response: ServerResponse) {
  response.statusCode = 200;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "public, max-age=300");
  response.end(JSON.stringify(currencies));
}
