export function GET(request: Request) {
  return Response.redirect(new URL("/partner-onboarding-form", request.url), 308);
}
