import { handleLeadRequest, type LeadEmailEnv, type LeadResponseMode } from "../worker/lead-email";

function leadEnv(): LeadEmailEnv {
  return process.env as LeadEmailEnv;
}

export function leadPost(mode: LeadResponseMode = "lead") {
  return (request: Request) => handleLeadRequest(request, leadEnv(), new URL(request.url), mode);
}

export function leadOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "POST, OPTIONS",
    },
  });
}
