import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";
import { NextResponse } from "next/server";

export default withAuth(async function middleware(req: any) {
  const { user } = req.kindeAuth;
  
  // Check if this is a GitHub OAuth callback (has github_access_token parameter)
  const isGitHubCallback = req.nextUrl.searchParams.has('github_access_token');
  
  if (!user && !isGitHubCallback) {
    return NextResponse.redirect(new URL('/api/auth/login', req.url));
  }
  
  // If it's a GitHub callback but no Kinde user, allow it to proceed
  // The GitHub provider will handle the token processing
  if (!user && isGitHubCallback) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next|github|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"
  ]
};