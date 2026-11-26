import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSession(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    return (
      cookie.name === "authjs.session-token" ||
      cookie.name.startsWith("authjs.session-token.") ||
      cookie.name === "__Secure-authjs.session-token" ||
      cookie.name.startsWith("__Secure-authjs.session-token.")
    );
  });
}

/**
 * Sends signed-out visitors to the sign-in page.
 * The staff list, Role, and Active checks happen in the server layout,
 * not here, so a cookie alone never grants access.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/digest") || pathname.startsWith("/sign-in")) {
    return NextResponse.next();
  }
  if (!hasSession(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sw.js).*)"],
};
