import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { corsHeaders, corsPreflightResponse } from "@/lib/server/cors";

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return corsPreflightResponse(origin);
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
