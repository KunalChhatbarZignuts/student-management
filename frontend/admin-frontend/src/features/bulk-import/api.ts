import apiClient from '@/lib/axios';

export interface BulkImportDryRunResult {
  dry_run: boolean;
  total_rows: number;
  valid_count: number;
  error_count: number;
  created_count?: number;
  errors: Array<{
    row: number;
    error: string;
    details?: string;
  }>;
  valid_rows?: Array<Record<string, unknown>>;
}

export const bulkImportApi = {
  uploadCsv: async (file: File, dryRun = true): Promise<BulkImportDryRunResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<BulkImportDryRunResult>(
      `/admin/users/bulk-import?dry_run=${dryRun}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res.data;
  },
};

