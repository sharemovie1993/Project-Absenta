import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { applyBrandingFromConfig, type SystemConfig } from '@/services/systemConfig';

type ThemePreference = 'light' | 'dark-default';
const THEME_STORAGE_KEY = 'absenta_theme_preference';
const LEGACY_THEME_STORAGE_KEY = 'theme';
export interface ThemeContextType {
  theme: ThemePreference;
  toggle: () => void;
  setTheme: (t: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'light', 
  toggle: () => {},
  setTheme: () => {}
});

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const normalizeTheme = (value: string | null): ThemePreference => {
    if (value === 'light') return 'light';
    if (value === 'dark-default') return 'dark-default';
    return 'light';
  };

  const [theme, setTheme] = useState<ThemePreference>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored) return normalizeTheme(stored);

      const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
      if (legacy) {
        const normalized = normalizeTheme(legacy);
        localStorage.setItem(THEME_STORAGE_KEY, normalized);
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
        return normalized;
      }
    } catch {
      return 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark-default';
    const body = document.body;
    const appRoot = document.getElementById('root');
    
    const enforce = () => {
      root.removeAttribute('data-theme-mode');
      root.removeAttribute('data-mode');

      if (isDark) {
        root.classList.add('dark');
        body.classList.add('dark');
        appRoot?.classList.add('dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        appRoot?.classList.remove('dark');
      }

      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      root.style.colorScheme = isDark ? 'dark' : 'light';
      body.style.colorScheme = isDark ? 'dark' : 'light';

      if (isDark) {
        body.style.backgroundColor = '#111827';
        body.style.color = '#f3f4f6';
      } else {
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#64748B';
      }

      try {
        const meta = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
        if (meta) meta.setAttribute('content', isDark ? 'dark' : 'light');
      } catch {
        void 0;
      }
    };

    enforce();
    
    if (isDark) {
      root.setAttribute('data-dark-variant', 'default');
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-secondary');
      root.style.removeProperty('--color-accent');
    } else {
      root.removeAttribute('data-dark-variant');
      localStorage.removeItem('darkVariant');
      try {
        const raw = localStorage.getItem('active_system_config');
        const cfg = raw ? (JSON.parse(raw) as SystemConfig) : null;
        applyBrandingFromConfig(cfg);
      } catch {
        applyBrandingFromConfig(null);
      }
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
      void 0;
    }

    const observer = new MutationObserver(() => {
      const shouldDark = theme === 'dark-default';
      const rootIsDarkByAttr = root.getAttribute('data-theme') === 'dark';
      const bodyHasDark = body.classList.contains('dark');
      const appHasDark = appRoot?.classList.contains('dark') ?? false;

      if (rootIsDarkByAttr !== shouldDark || bodyHasDark || appHasDark || root.classList.contains('dark')) {
        enforce();
        if (shouldDark) root.setAttribute('data-dark-variant', 'default');
        else root.removeAttribute('data-dark-variant');
      }
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    if (appRoot) observer.observe(appRoot, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === 'light' ? 'dark-default' : 'light'));
  };

  

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
