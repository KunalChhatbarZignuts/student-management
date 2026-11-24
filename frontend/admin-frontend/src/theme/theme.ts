import { createTheme, responsiveFontSizes, ThemeOptions } from '@mui/material/styles';

export const getDesignTokens = (mode: 'light' | 'dark'): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#047857' : '#10b981',
      light: mode === 'light' ? '#10b981' : '#34d399',
      dark: mode === 'light' ? '#065f46' : '#047857',
      contrastText: '#ffffff',
    },
    secondary: {
      main: mode === 'light' ? '#d97706' : '#f59e0b',
      light: '#fbbf24',
      dark: '#b45309',
      contrastText: '#ffffff',
    },
    background: {
      default: mode === 'light' ? '#f8fafc' : '#0f172a',
      paper: mode === 'light' ? '#ffffff' : '#1e293b',
    },
    text: {
      primary: mode === 'light' ? '#0f172a' : '#f8fafc',
      secondary: mode === 'light' ? '#475569' : '#94a3b8',
    },
    divider: mode === 'light' ? '#e2e8f0' : '#334155',
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
          '&:active': {
            transform: 'translateY(1px) scale(0.98)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none !important',
            transition: 'none !important',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease',
          '&:hover': {
            transform: 'scale(1.08)',
          },
          '&:active': {
            transform: 'scale(0.92)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none !important',
            transition: 'none !important',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow:
            mode === 'light'
              ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
              : '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
          border: `1px solid ${mode === 'light' ? '#e2e8f0' : '#334155'}`,
          '&:hover': {
            boxShadow:
              mode === 'light'
                ? '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)'
                : '0 8px 24px -4px rgba(0, 0, 0, 0.35), 0 4px 8px -2px rgba(0, 0, 0, 0.2)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none !important',
            transition: 'none !important',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          transition: 'box-shadow 0.25s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.25s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.18s ease, box-shadow 0.18s ease',
          '&:hover': {
            transform: 'scale(1.03)',
          },
          '&:active': {
            transform: 'scale(0.96)',
          },
          '@media (prefers-reduced-motion: reduce)': {
            transform: 'none !important',
            transition: 'none !important',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: 'border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          '&.Mui-focused': {
            boxShadow:
              mode === 'light'
                ? '0 0 0 3px rgba(4, 120, 87, 0.12)'
                : '0 0 0 3px rgba(16, 185, 129, 0.2)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          fontWeight: 600,
          '&:hover': {
            color: mode === 'light' ? '#047857' : '#10b981',
          },
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return responsiveFontSizes(createTheme(getDesignTokens(mode)));
};
