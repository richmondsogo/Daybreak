import { NextResponse, type NextRequest } from "next/server";
import { getExpectedSessionToken, SESSION_COOKIE_NAME } from "./lib/auth";

export function middleware(request: NextRequest) {
  const configuredPassword = process.env.APP_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const expectedToken = getExpectedSessionToken(configuredPassword);

  if (sessionCookie === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
