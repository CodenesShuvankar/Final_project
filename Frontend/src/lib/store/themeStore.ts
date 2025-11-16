import { create } from "zustand"

type ThemePreference = "light" | "dark" | "system"
type EffectiveTheme = "light" | "dark"

interface ThemeState {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  getEffectiveTheme: () => EffectiveTheme
}

const THEME_STORAGE_KEY = "vibetune_theme"

const getSystemTheme = (): EffectiveTheme =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"

const applyThemeClass = (theme: ThemePreference) => {
  if (typeof document === "undefined") return
  const effective = theme === "system" ? getSystemTheme() : theme
  const root = document.documentElement
  root.classList.toggle("dark", effective === "dark")
  root.style.colorScheme = effective
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "system",
  setTheme: (theme) => {
    set({ theme })
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    }
    applyThemeClass(theme)
  },
  getEffectiveTheme: () => {
    const preference = get().theme
    return preference === "system" ? getSystemTheme() : preference
  },
}))

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null
  if (stored) {
    useThemeStore.setState({ theme: stored })
  }
  applyThemeClass(useThemeStore.getState().theme)
}

export const initializeTheme = () => {
  if (typeof window === "undefined") {
    return () => {}
  }

  applyThemeClass(useThemeStore.getState().theme)

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
  const handleMediaChange = () => {
    if (useThemeStore.getState().theme === "system") {
      applyThemeClass("system")
    }
  }

  mediaQuery.addEventListener("change", handleMediaChange)
  const unsubscribe = useThemeStore.subscribe((state) => applyThemeClass(state.theme))

  return () => {
    mediaQuery.removeEventListener("change", handleMediaChange)
    unsubscribe()
  }
}

