import { NextResponse, type NextRequest } from "next/server";
import { createClientMiddleware } from "./lib/supabase-middleware";

const PUBLIC_ROUTES = ["/sign-in", "/unauthorized-platform"];

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClientMiddleware(request);

  const { data: { user } } = await supabase.auth.getUser();

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
