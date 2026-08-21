import { leadOptions, leadPost } from "../lead-route";
import { legacyLeadGetResponse, withDeprecatedLeadHeaders } from "@/worker/legacy-lead";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** @deprecated Use POST /api/lead */
export function legacyLeadGet(): Response {
  return legacyLeadGetResponse();
}

/** @deprecated Use POST /api/lead */
export async function legacyLeadPost(request: Request): Promise<Response> {
  return withDeprecatedLeadHeaders(await leadPost()(request));
}

export { leadOptions as legacyLeadOptions };
