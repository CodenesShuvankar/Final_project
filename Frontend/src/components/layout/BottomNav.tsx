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
  isAuthenticated: boolean;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home, public: true },
  { name: 'Search', href: '/search', icon: Search, public: true },
  { name: 'Suggest', href: '/suggest', icon: Lightbulb, public: false },
  { name: 'Library', href: '/library', icon: Library, public: false },
  { name: 'Profile', href: '/profile', icon: User, public: false },
];

/**
 * Mobile bottom navigation component
 */
export function BottomNav({ className, isAuthenticated }: BottomNavProps) {
  const pathname = usePathname();

  const handleProtectedClick = (e: React.MouseEvent<HTMLAnchorElement>, isPublic: boolean) => {
    if (!isPublic && !isAuthenticated) {
      e.preventDefault();
      alert('Please login to access this feature');
    }
  };

  return (
    <nav className={cn(
      "lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-40",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = !item.public && !isAuthenticated;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleProtectedClick(e, item.public)}
              className={cn(
                "flex flex-col items-center px-3 py-2 text-xs font-medium rounded-md transition-colors focus-ring min-w-0",
                isActive
                  ? "text-primary"
                  : isDisabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  "h-5 w-5 mb-1",
                  isActive ? "text-primary" : isDisabled ? "text-muted-foreground/50" : "text-muted-foreground"
                )} />
                {isDisabled && <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>}
              </div>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
