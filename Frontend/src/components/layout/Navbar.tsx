'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Search, 
  HelpCircle, 
  User,
  ChevronLeft,
  ChevronRight,
  LogIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabaseClient';
import { AuthService } from '@/lib/services/auth';

interface NavbarProps {
  className?: string;
}

/**
 * Top navigation bar with search, user menu, and theme toggle
 */
export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false);
  const authService = AuthService.getInstance();

  // Check authentication status
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      // Redirect to home page after logout
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Good evening';
      case '/search':
        return 'Search';
      case '/library':
        return 'Your Library';
      case '/suggest':
        return 'Suggest';
      case '/mood':
        return 'Mood Detection';
      case '/profile':
        return 'Profile';
      case '/feature-requests':
        return 'Feature Requests';
      default:
        if (pathname.startsWith('/playlist/')) {
          return 'Playlist';
        }
        return 'VibeTune';
    }
  };

  const showSearch = pathname === '/search';

  return (
    <header className={cn(
      "sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b lg:ml-64",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left section - Navigation and title */}
        <div className="flex items-center space-x-4">
          {/* Back/Forward buttons */}
          <div className="hidden lg:flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-muted"
              disabled
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Go back</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-muted"
              disabled
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Go forward</span>
            </Button>
          </div>

          {/* Search always visible */}
          <div className="flex-1 max-w-md">
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search songs, artists, or moods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted border-0 focus-visible:ring-1"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Right section - Theme toggle and user menu */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          
          {/* Help menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="focus-ring">
                <HelpCircle className="h-4 w-4" />
                <span className="sr-only">Help menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/feature-requests">
                  Feature Requests
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                Keyboard Shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu - only show if authenticated */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="focus-ring">
                  <User className="h-4 w-4" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="focus-ring"
              onClick={() => router.push('/login')}
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
