import { handleLeadRequest, type LeadEmailEnv, type LeadResponseMode } from "../worker/lead-email";

const env = process.env as LeadEmailEnv;

export function leadPost(mode: LeadResponseMode = "lead") {
  return (request: Request) => handleLeadRequest(request, env, new URL(request.url), mode);
}

export function leadOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "POST, OPTIONS",
    },
  });
}
