import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "ngg_session";

/**
 * Cheap edge-level gate: unauthenticated requests to the application areas are sent to /login.
 * Real authorization (role, tenant, project) happens server-side in the services.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const protectedArea = pathname.startsWith("/ngg") || pathname.startsWith("/dashboard");
  if (protectedArea && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/ngg/:path*", "/dashboard/:path*"],
};
