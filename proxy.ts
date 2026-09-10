import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClientMiddleware } from "./lib/supabase-middleware";

const PUBLIC_ROUTES = ["/sign-in", "/unauthorized-platform"];
const MOBILE_AUTH_EXEMPT_ROUTES = new Set([
  '/api/mobile-auth/sign-in',
  '/api/mobile-auth/sign-out',
  '/api/mobile-auth/bind',
]);

function createBearerClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

async function hasActiveMobileSession(accessToken: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/has_valid_application_session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  });
  return response.ok && (await response.json()) === true;
}

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClientMiddleware(request);
  const bearer = request.headers.get('authorization');
  const accessToken = bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null;
  const authClient = accessToken ? createBearerClient(accessToken) : supabase;

  const { data: { user } } = await authClient.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // Redirect unauthenticated users to sign-in if they are not on a public route
  if (!user && !isPublicRoute && !isApiRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // If authenticated, check for platform restrictions
  if (user) {
    const role = user.app_metadata?.role;
    const status = user.app_metadata?.status;
    const isInactive = status === "SUSPENDED" || status === "DEACTIVATED";
    const isUnauthorizedPage = request.nextUrl.pathname === "/unauthorized-platform";

    if (isInactive) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Forbidden: Account is suspended or deactivated" }, { status: 403 });
      }
      if (!isUnauthorizedPage) {
        return NextResponse.redirect(new URL("/unauthorized-platform?reason=inactive", request.url));
      }
      return response;
    }

    // Bearer-token API calls cannot rely on an installed app to enforce the
    // one-device rule. The function permits dashboard roles but requires a
    // current session binding for mobile roles; cookie sessions stay separate.
    if (
      isApiRoute
      && accessToken
      && !MOBILE_AUTH_EXEMPT_ROUTES.has(request.nextUrl.pathname)
    ) {
      try {
        if (!(await hasActiveMobileSession(accessToken))) {
          return NextResponse.json({
            code: 'MOBILE_SESSION_INVALID',
            error: 'This mobile session is no longer active. Please sign in again.',
          }, { status: 401 });
        }
      } catch {
        // Fail closed: a security check that cannot be completed must never
        // allow a bearer-token request to continue to a protected route.
        return NextResponse.json({ error: 'Unable to verify the mobile session.' }, { status: 503 });
      }
    }

    if (!isApiRoute) {
      const isMobileOnlyRole = role === 'public_user' || role === 'ambulance_responder';

      if (isMobileOnlyRole && !isUnauthorizedPage) {
        return NextResponse.redirect(new URL("/unauthorized-platform", request.url));
      }

      if (!isMobileOnlyRole && isUnauthorizedPage) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Role-based route protection for User Approval
      if (request.nextUrl.pathname.startsWith("/users/approval")) {
        if (role !== "cdrrmo_super_admin") {
          return NextResponse.redirect(new URL("/unauthorized-platform", request.url));
        }
      }

      // Role-based route protection for administrative analytics
      if (request.nextUrl.pathname.startsWith("/analytics")) {
        if (role !== "cdrrmo_super_admin") {
          return NextResponse.redirect(new URL("/unauthorized-platform", request.url));
        }
      }

      // Role-based route protection for Incident Request Verification
      if (request.nextUrl.pathname.startsWith("/verification")) {
        if (role !== "pacc_admin") {
          return NextResponse.redirect(new URL("/unauthorized-platform", request.url));
        }
      }

      // Redirect authenticated users from root or sign-in to dashboard
      if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/sign-in")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
