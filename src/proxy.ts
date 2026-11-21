import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers, including a Content Security Policy built around a
 * per request nonce so no inline script can run unless Next put it there.
 *
 * Development needs 'unsafe-eval' for the React refresh runtime, so the
 * policy is relaxed there and strict everywhere else.
 */
export default function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
    // Tailwind and Next both inject style tags.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob:${supabase ? ` ${supabase}` : ""}`,
    `connect-src 'self'${supabase ? ` ${supabase}` : ""}${isDev ? " ws: wss:" : ""}`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next's own internals (including the dev HMR socket)
    // and the favicon.
    {
      source: "/((?!_next/|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
