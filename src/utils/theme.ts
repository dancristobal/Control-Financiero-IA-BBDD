export type ThemeMode = 'dark' | 'light';

const THEME_STORAGE_KEY = 'fa_theme_mode_v1';

export function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Si no hay preferencia guardada, verificar preferencia del sistema operativo
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (e) {
    // LocalStorage puede no estar disponible
  }
  return 'dark'; // Modo oscuro por defecto
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  if (theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    body.classList.remove('dark');
    body.classList.add('light');
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    body.classList.remove('light');
    body.classList.add('dark');
    root.style.colorScheme = 'dark';
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}
}
