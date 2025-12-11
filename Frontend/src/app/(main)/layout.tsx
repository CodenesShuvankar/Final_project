'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Navbar } from '@/components/layout/Navbar';
import { PlayerBar } from '@/components/player/PlayerBar';
import { QueueDrawer } from '@/components/player/QueueDrawer';
import { AutoMoodDetector } from '@/components/mood/AutoMoodDetector';
import { supabase } from '@/lib/supabaseClient';

/**
 * Main app layout with sidebar, navbar, and player
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queueOpen, setQueueOpen] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Public routes that don't require authentication
    const publicRoutes = ['/home', '/search'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Check authentication on mount
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('🚫 No session found');
        setIsAuthenticated(false);
        
        // Redirect to login only if trying to access protected routes
        if (!isPublicRoute) {
          console.log('🔒 Protected route, redirecting to login');
          router.replace('/login');
        }
        return;
      }
      
      setIsAuthenticated(true);
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      console.log('🔐 Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 User signed out');
        setIsAuthenticated(false);
        
        // Redirect to home page (public) instead of login
        if (!publicRoutes.includes(pathname)) {
          router.replace('/');
        }
      } else if (event === 'SIGNED_IN') {
        console.log('✅ User signed in');
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/home', '/search'];
  const isPublicRoute = publicRoutes.includes(pathname);

  // Show loading while checking auth (except for public routes)
  if (isAuthenticated === null && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render protected routes if not authenticated
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isAuthenticated={isAuthenticated ?? false} />
      <div className="lg:ml-64">
        <Navbar />
        <main id="main-content" className="pb-24 lg:pb-20">
          {children}
        </main>
      </div>
      <BottomNav isAuthenticated={isAuthenticated ?? false} />
      <PlayerBar onQueueOpen={() => setQueueOpen(true)} />
      <QueueDrawer open={queueOpen} onOpenChange={setQueueOpen} />
      
      {/* Auto mood detection on first load - only for authenticated users */}
      {isAuthenticated && <AutoMoodDetector />}
    </div>
  );
}
