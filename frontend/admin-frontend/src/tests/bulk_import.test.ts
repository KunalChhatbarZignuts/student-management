import { describe, it, expect, vi } from 'vitest';
import { bulkImportApi } from '@/features/bulk-import/api';
import apiClient from '@/lib/axios';

describe('Bulk Import Dry Run Tests', () => {
  it('correctly processes CSV dry-run preview and captures row-level errors', async () => {
    const mockResponse = {
      dry_run: true,
      total_rows: 3,
      valid_count: 2,
      error_count: 1,
      errors: [
        {
          row: 3,
          error: 'Email already exists: duplicate@school.edu',
        },
      ],
    };

    const spy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: mockResponse,
    });

    const file = new File(['role,email\nstudent,a@b.com'], 'students.csv', {
      type: 'text/csv',
    });

    const result = await bulkImportApi.uploadCsv(file, true);

    expect(spy).toHaveBeenCalledWith(
      '/admin/users/bulk-import?dry_run=true',
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );

    expect(result.dry_run).toBe(true);
    expect(result.total_rows).toBe(3);
    expect(result.valid_count).toBe(2);
    expect(result.error_count).toBe(1);
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].error).toContain('Email already exists');

    spy.mockRestore();
  });
});
