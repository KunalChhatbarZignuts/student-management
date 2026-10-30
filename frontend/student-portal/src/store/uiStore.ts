import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      toggleTheme: () =>
        set((state) => ({
          themeMode: state.themeMode === 'light' ? 'dark' : 'light',
        })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'student-portal-ui-preferences',
      partialize: (state) => ({ themeMode: state.themeMode }),
    }
  )
);
