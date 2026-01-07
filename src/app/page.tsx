import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { redirect } from "next/navigation";

export default async function Home() {
  const { isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (isAuth) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-black/95 text-white p-6">
        <div className="text-center space-y-6 max-w-md">
                <div className="relative">
                    <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur"></div>
                    <h1 className="relative text-4xl font-extrabold tracking-tight lg:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                    Competitor Watch
                    </h1>
                </div>
                <p className="text-lg text-muted-foreground">
                AI-powered competitive intelligence. Track updates, analyze changes, and stay ahead.
                </p>
                <div className="flex gap-4 justify-center mt-8">
                <LoginLink className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8">
                    Sign in
                </LoginLink>
                <RegisterLink className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8">
                    Sign up
                </RegisterLink>
                </div>
        </div>
    </div>
  );
}
