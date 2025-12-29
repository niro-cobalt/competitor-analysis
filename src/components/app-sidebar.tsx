'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, FileText, Settings, FlaskConical, BarChart3, Mail, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      icon: Mail,
      href: '/emails',
      active: pathname === '/emails',
    },
    {
      label: 'Admin',
      icon: ShieldCheck,
      href: '/admin',
      active: pathname === '/admin',
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-white/20 glass text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-white/10 px-6 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-blue-600 text-white shadow-md shadow-primary/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">CompetitorAI</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="grid items-start px-3 text-sm font-medium">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2.5 transition-all outline-none",
                route.active 
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20 backdrop-blur-sm" 
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/10"
              )}
            >
              <route.icon className={cn("h-4 w-4", route.active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
              <span>{route.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-white/10">
         <div className="flex items-center gap-3 rounded-lg bg-white/40 p-3 backdrop-blur-sm ring-1 ring-white/20 shadow-sm dark:bg-black/20">
            <div className="h-8 w-8 rounded-full bg-linear-to-tr from-primary to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                CA
            </div>
             <div className="flex flex-col overflow-hidden">
                 <span className="text-xs font-semibold truncate">Workspace</span>
                 <span className="text-[10px] text-muted-foreground truncate">Free Plan</span>
             </div>
         </div>
      </div>
    </div>
  );
}
