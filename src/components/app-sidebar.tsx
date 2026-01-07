'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, FileText, Settings, FlaskConical, BarChart3, Mail, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

interface User {
    id?: string;
    email?: string | null;
    given_name?: string | null;
    family_name?: string | null;
    picture?: string | null;
}

export function AppSidebar({ user }: { user?: User | null }) {
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
    {
      label: 'Settings',
      icon: Settings,
      href: '/settings',
      active: pathname === '/settings',
    },
  ];

  // Logic to determine organization
  const organization = user?.email ? user.email.split('@')[1].split('.')[0] : 'Unknown Org';
  
  if (user) {
      console.log(`User Organization: ${organization}`);
  }

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
      {user && (
        <div className="mt-auto p-4 border-t border-white/10">
           <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 backdrop-blur-sm ring-1 ring-white/10 shadow-sm dark:bg-black/20 hover:bg-white/10 transition-colors">
              {user.picture ? (
                  <img src={user.picture} alt="Profile" className="h-9 w-9 rounded-full ring-2 ring-primary/20" />
              ) : (
                  <div className="h-9 w-9 rounded-full bg-linear-to-tr from-primary to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      {user.given_name?.[0]}{user.family_name?.[0]}
                  </div>
              )}
               <div className="flex flex-col overflow-hidden w-full">
                   <span className="text-xs font-semibold truncate leading-none mb-1">{user.given_name} {user.family_name}</span>
                   <span className="text-[10px] text-muted-foreground truncate leading-none mb-1.5">{user.email}</span>
                   <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider font-medium text-primary/70">{organization}</span>
                        <LogoutLink className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors font-medium">Sign out</LogoutLink>
                   </div>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}
