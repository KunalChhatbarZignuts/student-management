import { describe, it, expect } from 'vitest';
import { apiClient } from '@/lib/axios';
import { createQueryClient } from '@/lib/queryClient';
import { createAppTheme } from '@/theme/theme';

describe('Phase 1 Foundation Smoke Tests', () => {
  it('apiClient has correct baseURL and credentials flag', () => {
    expect(apiClient.defaults.baseURL).toBe('/api/v1');
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it('queryClient configures sensible defaults and retry rules', () => {
    const qc = createQueryClient();
    const defaults = qc.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('theme creates valid light and dark MUI themes', () => {
    const lightTheme = createAppTheme('light');
    const darkTheme = createAppTheme('dark');

    expect(lightTheme.palette.mode).toBe('light');
    expect(lightTheme.palette.primary.main).toBe('#047857');

    expect(darkTheme.palette.mode).toBe('dark');
    expect(darkTheme.palette.primary.main).toBe('#10b981');
  });
});
