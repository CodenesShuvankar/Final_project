'use client';

import * as React from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { initializeTheme } from '@/lib/store/themeStore';

/**
 * Root providers component that initializes global state and services
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const { initialize, cleanup } = usePlayerStore();

  React.useEffect(() => {
    // Initialize theme system
    const cleanupTheme = initializeTheme();
    
    // Initialize player store
    initialize();

    return () => {
      cleanupTheme();
      cleanup();
    };
  }, [initialize, cleanup]);

  return <>{children}</>;
}
