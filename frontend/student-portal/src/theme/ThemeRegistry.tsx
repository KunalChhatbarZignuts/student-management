'use client';

import * as React from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from './theme';
import { useUiStore } from '@/store/uiStore';

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const themeMode = useUiStore((state) => state.themeMode);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const theme = React.useMemo(
    () => createAppTheme(mounted ? themeMode : 'light'),
    [mounted, themeMode]
  );

  return (
    <AppRouterCacheProvider options={{ key: 'mui-sp', enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
