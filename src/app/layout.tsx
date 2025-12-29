import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Competitor Analysis',
  description: 'AI-powered competitor tracking',
};

import { AppSidebar } from '@/components/app-sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div className="flex h-screen w-full overflow-hidden bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
