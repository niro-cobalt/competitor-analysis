import type { Metadata } from 'next';
import { Outfit, Syne_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });
const synemono = Syne_Mono({ subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'Competitor Analysis',
  description: 'AI-powered competitor tracking',
};

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { AppSidebar } from '@/components/app-sidebar';
import { syncKindeUser } from '@/lib/users';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (user) {
      console.log('[RootLayout] Found user, attempting sync:', user.id);
      // safe fire-and-forget-ish await (it's fast enough)
      await syncKindeUser(user);
  } else {
      console.log('[RootLayout] No user session found.');
  }

  return (
    <html lang="en">
      <body className={synemono.className}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar user={user} />
          <main className="flex-1 overflow-y-auto relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
