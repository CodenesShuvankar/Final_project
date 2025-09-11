'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Library, 
  Heart, 
  Plus, 
  Lightbulb,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  className?: string;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Your Library', href: '/library', icon: Library },
];

const quickAccess = [
  { name: 'Liked Songs', href: '/library?tab=liked', icon: Heart },
];

/**
 * Desktop sidebar navigation component
 */
export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-spotify-green rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-lg">Spotify</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Suggest Link */}
        <Link
          href="/suggest"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
            pathname === '/suggest'
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Lightbulb className="mr-3 h-5 w-5" />
          Suggest
        </Link>

        {/* Mood Detection Link */}
        <Link
          href="/mood"
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
            pathname === '/mood'
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <User className="mr-3 h-5 w-5" />
          Mood
        </Link>
      </nav>

      {/* Library Section */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Your Library</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Create playlist</span>
          </Button>
        </div>
        
        <div className="space-y-1">
          {quickAccess.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
