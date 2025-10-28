export type Theme = 'default' | 'kakao';

const THEME_KEY = 'chat_theme';

export function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'default';
  
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return (stored === 'kakao' ? 'kakao' : 'default') as Theme;
  } catch (error) {
    console.error('Failed to load theme:', error);
    return 'default';
  }
}

export function saveTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

