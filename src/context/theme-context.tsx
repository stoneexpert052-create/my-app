'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type Theme = 'dark' | 'light';
export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme; // The active theme: 'light' or 'dark'
  themeMode: ThemeMode; // The selected setting: 'light' | 'dark' | 'auto'
  dayStart: number; // Day start hour (0-23)
  nightStart: number; // Night start hour (0-23)
  isNight: boolean; // Computed whether it's currently night
  themeOverride: Theme | null; // Active override when in auto mode
  setThemeMode: (mode: ThemeMode) => void;
  setDayStart: (hour: number) => void;
  setNightStart: (hour: number) => void;
  toggleTheme: () => void;
  clearOverride: () => void;
  hydrated: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [dayStart, setDayStartState] = useState<number>(6);
  const [nightStart, setNightStartState] = useState<number>(18);
  const [themeOverride, setThemeOverrideState] = useState<Theme | null>(null);
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  // Helper to check if it's currently night based on system time and day/night limits
  const checkIsNight = (dStart: number, nStart: number): boolean => {
    const hour = new Date().getHours();
    if (dStart <= nStart) {
      // Normal range, e.g., Day is 6 to 18 (6 AM to 6 PM)
      return hour < dStart || hour >= nStart;
    } else {
      // Day spans midnight, e.g., Day is 22 to 6 (10 PM to 6 AM)
      return hour >= nStart && hour < dStart;
    }
  };

  // Run once on load to restore settings from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('app-theme-mode') as ThemeMode;
    const savedDayStart = localStorage.getItem('app-day-start');
    const savedNightStart = localStorage.getItem('app-night-start');
    const savedOverride = localStorage.getItem('app-theme-override') as Theme | null;

    let mode: ThemeMode = 'dark';
    if (savedMode && ['dark', 'light', 'auto'].includes(savedMode)) {
      mode = savedMode;
    } else {
      // Backward compatibility with 'app-theme'
      const legacyTheme = localStorage.getItem('app-theme') as Theme;
      if (legacyTheme && ['dark', 'light'].includes(legacyTheme)) {
        mode = legacyTheme;
      }
    }

    const dStart = savedDayStart ? parseInt(savedDayStart, 10) : 6;
    const nStart = savedNightStart ? parseInt(savedNightStart, 10) : 18;
    const override = (savedOverride && ['dark', 'light'].includes(savedOverride)) ? savedOverride : null;

    setThemeModeState(mode);
    setDayStartState(dStart);
    setNightStartState(nStart);
    setThemeOverrideState(override);

    // Compute initial state
    const night = checkIsNight(dStart, nStart);
    setIsNight(night);

    let active: Theme = 'dark';
    if (mode === 'light') {
      active = 'light';
    } else if (mode === 'dark') {
      active = 'dark';
    } else {
      // auto
      if (override) {
        active = override;
      } else {
        active = night ? 'dark' : 'light';
      }
    }

    setThemeState(active);
    applyTheme(active);
    setHydrated(true);
  }, []);

  // Set up periodic check (e.g., every minute) to keep auto mode in sync
  useEffect(() => {
    if (!hydrated) return;

    const interval = setInterval(() => {
      const night = checkIsNight(dayStart, nightStart);
      setIsNight(night);

      if (themeMode === 'auto') {
        let active: Theme = 'dark';
        if (themeOverride) {
          active = themeOverride;
        } else {
          active = night ? 'dark' : 'light';
        }
        if (active !== theme) {
          setThemeState(active);
          applyTheme(active);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [hydrated, themeMode, dayStart, nightStart, themeOverride, theme]);

  const applyTheme = (t: Theme) => {
    if (typeof window !== 'undefined') {
      const htmlElement = document.documentElement;
      htmlElement.classList.remove('theme-light');
      if (t === 'light') {
        htmlElement.classList.add('theme-light');
      }
    }
  };

  const setThemeMode = (newMode: ThemeMode) => {
    setThemeModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-theme-mode', newMode);
      // Clean legacy theme key
      localStorage.removeItem('app-theme');
    }

    // Reset override when explicitly switching modes
    setThemeOverrideState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app-theme-override');
    }

    const night = checkIsNight(dayStart, nightStart);
    let active: Theme = 'dark';
    if (newMode === 'light') {
      active = 'light';
    } else if (newMode === 'dark') {
      active = 'dark';
    } else {
      // auto
      active = night ? 'dark' : 'light';
    }

    setThemeState(active);
    applyTheme(active);
  };

  const setDayStart = (hour: number) => {
    const validHour = Math.max(0, Math.min(23, hour));
    setDayStartState(validHour);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-day-start', String(validHour));
    }

    const night = checkIsNight(validHour, nightStart);
    setIsNight(night);

    if (themeMode === 'auto' && !themeOverride) {
      const active = night ? 'dark' : 'light';
      setThemeState(active);
      applyTheme(active);
    }
  };

  const setNightStart = (hour: number) => {
    const validHour = Math.max(0, Math.min(23, hour));
    setNightStartState(validHour);
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-night-start', String(validHour));
    }

    const night = checkIsNight(dayStart, validHour);
    setIsNight(night);

    if (themeMode === 'auto' && !themeOverride) {
      const active = night ? 'dark' : 'light';
      setThemeState(active);
      applyTheme(active);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    
    if (themeMode === 'auto') {
      // In auto mode, toggle behaves as an override
      setThemeOverrideState(nextTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app-theme-override', nextTheme);
      }
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    } else {
      // In manual mode, toggle changes the theme mode itself
      setThemeMode(nextTheme);
    }
  };

  const clearOverride = () => {
    setThemeOverrideState(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('app-theme-override');
    }

    const night = checkIsNight(dayStart, nightStart);
    if (themeMode === 'auto') {
      const active = night ? 'dark' : 'light';
      setThemeState(active);
      applyTheme(active);
    }
  };

  const value = {
    theme,
    themeMode,
    dayStart,
    nightStart,
    isNight,
    themeOverride,
    setThemeMode,
    setDayStart,
    setNightStart,
    toggleTheme,
    clearOverride,
    hydrated,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
