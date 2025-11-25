import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeContextType {
  currentTheme: string;
  setTheme: (theme: string) => void;
  applyTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeColors = {
  default: {
    primary: '315 18% 32%',
    secondary: '43 45% 58%',
    accent: '105 10% 45%',
  },
  blue: {
    primary: '217 91% 60%',
    secondary: '199 89% 48%',
    accent: '195 53% 79%',
  },
  green: {
    primary: '142 71% 45%',
    secondary: '158 64% 52%',
    accent: '142 76% 73%',
  },
  purple: {
    primary: '271 76% 53%',
    secondary: '280 87% 65%',
    accent: '270 100% 86%',
  },
  pink: {
    primary: '340 82% 52%',
    secondary: '350 100% 71%',
    accent: '340 100% 89%',
  },
  orange: {
    primary: '25 95% 53%',
    secondary: '38 92% 50%',
    accent: '48 100% 67%',
  },
  red: {
    primary: '0 84% 60%',
    secondary: '0 72% 51%',
    accent: '0 100% 87%',
  },
  teal: {
    primary: '174 62% 47%',
    secondary: '180 77% 47%',
    accent: '177 70% 82%',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<string>('default');

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    const colors = themeColors[theme as keyof typeof themeColors] || themeColors.default;

    // Apply theme colors as CSS variables
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);

    // Store in localStorage for immediate access
    localStorage.setItem('userTheme', theme);
  };

  const setTheme = async (theme: string) => {
    setCurrentTheme(theme);
    applyTheme(theme);

    // Update in Supabase if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ color_theme: theme })
        .eq('id', session.user.id);
    }
  };

  useEffect(() => {
    // Load theme on mount
    const loadTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user's theme from Supabase
        const { data } = await supabase
          .from('profiles')
          .select('color_theme')
          .eq('id', session.user.id)
          .single();

        const userTheme = data?.color_theme || 'default';
        setCurrentTheme(userTheme);
        applyTheme(userTheme);
      } else {
        // Check localStorage for non-logged-in users
        const storedTheme = localStorage.getItem('userTheme') || 'default';
        setCurrentTheme(storedTheme);
        applyTheme(storedTheme);
      }
    };

    loadTheme();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('color_theme')
          .eq('id', session.user.id)
          .single();

        const userTheme = data?.color_theme || 'default';
        setCurrentTheme(userTheme);
        applyTheme(userTheme);
      } else if (event === 'SIGNED_OUT') {
        // Reset to default on logout
        setCurrentTheme('default');
        applyTheme('default');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export { themeColors };
