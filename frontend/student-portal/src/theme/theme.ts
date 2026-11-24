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
          borderRadius: 6,
          padding: '8px 16px',
          fontWeight: 600,
          transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            boxShadow: 'none',
          },
          '&:active': {
            opacity: 0.92,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease, color 0.15s ease',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'border-color 0.15s ease, background-color 0.15s ease',
          boxShadow: 'none',
          border: `1px solid ${mode === 'light' ? '#e2e8f0' : '#27272a'}`,
          '&:hover': {
            borderColor: mode === 'light' ? '#cbd5e1' : '#3f3f46',
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
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 600,
          transition: 'background-color 0.15s ease, border-color 0.15s ease',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          transition: 'border-color 0.15s ease',
          '&.Mui-focused': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.12s ease',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition: 'color 0.15s ease',
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
          transition: 'background-color 0.15s ease',
        },
      },
    },
  },
});

export const createAppTheme = (mode: 'light' | 'dark') => {
  return responsiveFontSizes(createTheme(getDesignTokens(mode)));
};
