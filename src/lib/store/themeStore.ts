import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  setSystemTheme: (theme: 'light' | 'dark') => void;
  getEffectiveTheme: () => 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      systemTheme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme, get().systemTheme);
      },
      setSystemTheme: (systemTheme) => {
        set({ systemTheme });
        applyTheme(get().theme, systemTheme);
      },
      getEffectiveTheme: () => {
        const { theme, systemTheme } = get();
        return theme === 'system' ? systemTheme : theme;
      },
    }),
    {
      name: 'spotify-theme',
      onRehydrate: (state) => {
        if (state) {
          // Detect system theme on hydration
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          state.setSystemTheme(systemTheme);
        }
      },
    }
  )
);

function applyTheme(theme: Theme, systemTheme: 'light' | 'dark') {
  const root = document.documentElement;
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initialize theme system
export function initializeTheme() {
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = (e: MediaQueryListEvent) => {
    useThemeStore.getState().setSystemTheme(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // Set initial system theme
  useThemeStore.getState().setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
  
  return () => mediaQuery.removeEventListener('change', handleChange);
}
