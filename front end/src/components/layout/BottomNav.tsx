'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Library, 
  Lightbulb,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  className?: string;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Suggest', href: '/suggest', icon: Lightbulb },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Profile', href: '/profile', icon: User },
];

/**
 * Mobile bottom navigation component
 */
export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-40",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center px-3 py-2 text-xs font-medium rounded-md transition-colors focus-ring min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
