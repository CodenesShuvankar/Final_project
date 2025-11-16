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
  isAuthenticated: boolean;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home, public: true },
  { name: 'Search', href: '/search', icon: Search, public: true },
  { name: 'Your Library', href: '/library', icon: Library, public: false },
];

const quickAccess = [
  { name: 'Liked Songs', href: '/library?tab=liked', icon: Heart },
];

/**
 * Desktop sidebar navigation component
 */
export function Sidebar({ className, isAuthenticated }: SidebarProps) {
  const pathname = usePathname();

  const handleProtectedClick = (e: React.MouseEvent<HTMLAnchorElement>, isPublic: boolean) => {
    if (!isPublic && !isAuthenticated) {
      e.preventDefault();
      alert('Please login to access this feature');
    }
  };

  return (
    <aside className={cn(
      "hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <span className="font-bold text-lg">VibeTune</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = !item.public && !isAuthenticated;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={(e) => handleProtectedClick(e, item.public)}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : isDisabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
              {isDisabled && <span className="ml-auto text-xs">🔒</span>}
            </Link>
          );
        })}

        {/* Suggest Link */}
        <Link
          href="/suggest"
          onClick={(e) => handleProtectedClick(e, false)}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
            pathname === '/suggest'
              ? "bg-accent text-accent-foreground"
              : !isAuthenticated
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Lightbulb className="mr-3 h-5 w-5" />
          Suggest
          {!isAuthenticated && <span className="ml-auto text-xs">🔒</span>}
        </Link>

        {/* Mood Detection Link */}
        <Link
          href="/mood"
          onClick={(e) => handleProtectedClick(e, false)}
          className={cn(
            "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
            pathname === '/mood'
              ? "bg-accent text-accent-foreground"
              : !isAuthenticated
              ? "text-muted-foreground/50 cursor-not-allowed"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <User className="mr-3 h-5 w-5" />
          Mood
          {!isAuthenticated && <span className="ml-auto text-xs">🔒</span>}
        </Link>
      </nav>

      {/* Library Section */}
      <div className="px-4 py-4 border-t">
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn(
            "text-sm font-medium",
            !isAuthenticated ? "text-muted-foreground/50" : "text-muted-foreground"
          )}>
            Your Library {!isAuthenticated && '🔒'}
          </h3>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            disabled={!isAuthenticated}
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                alert('Please login to create playlists');
              }
            }}
          >
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
                onClick={(e) => handleProtectedClick(e, false)}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus-ring",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : !isAuthenticated
                    ? "text-muted-foreground/50 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
                {!isAuthenticated && <span className="ml-auto text-xs">🔒</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
