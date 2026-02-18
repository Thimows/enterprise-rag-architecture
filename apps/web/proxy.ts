import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/sign-in", "/sign-up", "/api/auth", "/api/trpc"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check for BetterAuth session cookie
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files, _next, and api/auth
    "/((?!_next/static|_next/image|favicon.ico|fonts|api/).*)",
  ],
}
