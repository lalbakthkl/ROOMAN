import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'modern_dark' | 'clean_light' | 'emerald_green' | 'deep_ocean';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  description: string;
  iconBg: string;
  badgeColor: string;
  bodyClass: string;
  cardClass: string;
  borderClass: string;
  primaryAccent: string;
  secondaryAccent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  inputBg: string;
  navbarBg: string;
  bottomNavBg: string;
}

export const THEMES: Record<AppTheme, ThemeConfig> = {
  modern_dark: {
    id: 'modern_dark',
    name: 'Modern Dark',
    description: 'OLED pitch black with neon indigo & cyan accents',
    iconBg: 'from-indigo-600 to-indigo-800',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    bodyClass: 'theme-modern-dark bg-slate-950 text-slate-100',
    cardClass: 'bg-slate-900 border-white/10',
    borderClass: 'border-white/10',
    primaryAccent: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondaryAccent: 'text-indigo-400',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    inputBg: 'bg-slate-950 border-white/10 text-white placeholder-slate-500',
    navbarBg: 'bg-slate-950/80 border-white/10',
    bottomNavBg: 'bg-slate-950/90 border-white/10',
  },
  clean_light: {
    id: 'clean_light',
    name: 'Clean Light',
    description: 'Crisp minimalist slate with soft indigo & sky highlights',
    iconBg: 'from-indigo-500 to-blue-600',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    bodyClass: 'theme-clean-light bg-slate-50 text-slate-900',
    cardClass: 'bg-white border-slate-200 shadow-sm',
    borderClass: 'border-slate-200',
    primaryAccent: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondaryAccent: 'text-indigo-600',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    inputBg: 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400',
    navbarBg: 'bg-white/90 border-slate-200',
    bottomNavBg: 'bg-white/95 border-slate-200',
  },
  emerald_green: {
    id: 'emerald_green',
    name: 'Emerald Green',
    description: 'Rich forest canvas with vivid emerald and gold tones',
    iconBg: 'from-emerald-600 to-teal-800',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    bodyClass: 'theme-emerald-green bg-emerald-950 text-emerald-50',
    cardClass: 'bg-emerald-900/60 border-emerald-700/40',
    borderClass: 'border-emerald-700/40',
    primaryAccent: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold',
    secondaryAccent: 'text-emerald-400',
    textPrimary: 'text-white',
    textSecondary: 'text-emerald-200',
    textMuted: 'text-emerald-400/70',
    inputBg: 'bg-emerald-950/80 border-emerald-700/40 text-emerald-50 placeholder-emerald-500/50',
    navbarBg: 'bg-emerald-950/90 border-emerald-700/40',
    bottomNavBg: 'bg-emerald-950/95 border-emerald-700/40',
  },
  deep_ocean: {
    id: 'deep_ocean',
    name: 'Deep Ocean',
    description: 'Navy blue midnight abyss with electric cyan & teal glow',
    iconBg: 'from-cyan-600 to-blue-900',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    bodyClass: 'theme-deep-ocean bg-slate-950 text-cyan-50',
    cardClass: 'bg-slate-900/90 border-cyan-900/40',
    borderClass: 'border-cyan-900/40',
    primaryAccent: 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold',
    secondaryAccent: 'text-cyan-400',
    textPrimary: 'text-white',
    textSecondary: 'text-cyan-100',
    textMuted: 'text-cyan-400/60',
    inputBg: 'bg-slate-950 border-cyan-900/40 text-cyan-50 placeholder-cyan-600/40',
    navbarBg: 'bg-slate-950/90 border-cyan-900/40',
    bottomNavBg: 'bg-slate-950/95 border-cyan-900/40',
  },
};

const THEME_STORAGE_KEY = 'roomex_selected_theme_v1';

interface ThemeContextType {
  theme: AppTheme;
  themeConfig: ThemeConfig;
  setTheme: (theme: AppTheme) => void;
  availableThemes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'modern_dark',
  themeConfig: THEMES.modern_dark,
  setTheme: () => {},
  availableThemes: Object.values(THEMES),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved in THEMES)) {
        return saved as AppTheme;
      }
    } catch {}
    return 'modern_dark';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  useEffect(() => {
    // Apply data-theme and root background style
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'clean_light') {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-slate-50 text-slate-900 antialiased font-sans';
    } else if (theme === 'emerald_green') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-emerald-950 text-emerald-50 antialiased font-sans';
    } else if (theme === 'deep_ocean') {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-950 text-cyan-50 antialiased font-sans';
    } else {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-slate-950 text-slate-100 antialiased font-sans';
    }
  }, [theme]);

  const value = {
    theme,
    themeConfig: THEMES[theme] || THEMES.modern_dark,
    setTheme,
    availableThemes: Object.values(THEMES),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
