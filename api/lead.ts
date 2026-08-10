import type { IncomingMessage, ServerResponse } from "node:http";
import { handleLeadRequest, type LeadEmailEnv } from "../worker/lead-email";

const env = process.env as LeadEmailEnv;

function requestOrigin(request: IncomingMessage) {
  const proto = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers.host || "localhost";
  const protocol = Array.isArray(proto) ? proto[0] : proto;
  return `${protocol}://${host}`;
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function webHeaders(request: IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(key, value);
    if (Array.isArray(value)) headers.set(key, value.join(", "));
  }

  return headers;
}

async function writeResponse(response: ServerResponse, webResponse: Response) {
  response.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url || "/api/lead", requestOrigin(request));
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : new Uint8Array(await readBody(request));
  const webRequest = new Request(url, {
    method: request.method,
    headers: webHeaders(request),
    body,
  });

  const webResponse = await handleLeadRequest(webRequest, env, url);
  await writeResponse(response, webResponse);
}
