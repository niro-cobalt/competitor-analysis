'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, FileText, Settings, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const pathname = usePathname();

  const routes = [
    {
      label: 'Dashboard',
      icon: Home,
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'Test Scans',
      icon: FlaskConical,
      href: '/test',
      active: pathname === '/test',
    },
    {
      label: 'Execution Logs',
      icon: FileText,
      href: '/logs',
      active: pathname === '/logs',
    },
    {
      label: 'Email History',
      icon: FileText,
      href: '/emails',
      active: pathname === '/emails',
    },
    {
      label: 'Admin',
      icon: Settings,
      href: '/admin',
      active: pathname === '/admin',
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LineChart className="h-6 w-6" />
          <span>CompetitorAI</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                route.active ? "bg-muted text-primary" : "text-muted-foreground"
              )}
            >
              <route.icon className="h-4 w-4" />
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
         <div className="text-xs text-muted-foreground text-center">
             &copy; 2025 Competitor Inc.
         </div>
      </div>
    </div>
  );
}
