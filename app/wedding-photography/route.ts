export function GET(request: Request) {
  return Response.redirect(new URL("/wedding-photographers", request.url), 308);
}
