import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-in/mobile"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Redirect unauthenticated users to sign-in if they are not on a public route
  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // If authenticated, check for platform restrictions
  if (userId) {
    const role = sessionClaims?.metadata?.role;
    const isMobileOnlyRole = role === 'public_user' || role === 'ambulance_responder';
    const isUnauthorizedPage = req.nextUrl.pathname === "/unauthorized-platform";

    if (isMobileOnlyRole && !isUnauthorizedPage) {
      return NextResponse.redirect(new URL("/unauthorized-platform", req.url));
    }

    if (!isMobileOnlyRole && isUnauthorizedPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Redirect authenticated users from root or sign-in to dashboard
    if (req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/sign-in")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
