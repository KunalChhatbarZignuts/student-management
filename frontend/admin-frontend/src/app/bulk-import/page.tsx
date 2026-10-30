'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DownloadIcon from '@mui/icons-material/Download';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { bulkImportApi, BulkImportDryRunResult } from '@/features/bulk-import/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function BulkImportPage() {
  const { showSnackbar } = useSnackbar();

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [dryRunResult, setDryRunResult] = React.useState<BulkImportDryRunResult | null>(null);
  const [commitResult, setCommitResult] = React.useState<BulkImportDryRunResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        showSnackbar('Only CSV files (.csv) are supported', 'error');
        return;
      }
      setSelectedFile(file);
      setDryRunResult(null);
      setCommitResult(null);
    }
  };

  const handleDryRun = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await bulkImportApi.uploadCsv(selectedFile, true);
      setDryRunResult(res);
      showSnackbar(`Validation complete: ${res.valid_count} valid, ${res.error_count} errors`, 'info');
    } catch (err) {
      showSnackbar(formatErrorMessage(err, 'Failed to perform dry-run preview'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const res = await bulkImportApi.uploadCsv(selectedFile, false);
      setCommitResult(res);
      showSnackbar(`Import confirmed! Successfully enrolled accounts.`, 'success');
    } catch (err) {
      showSnackbar(formatErrorMessage(err, 'Import execution failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadErrorReport = () => {
    if (!dryRunResult || dryRunResult.errors.length === 0) return;
    const header = 'Row,Error,Details\n';
    const csvContent = dryRunResult.errors
      .map((e) => `"${e.row}","${e.error.replace(/"/g, '""')}","${(e.details || '').replace(/"/g, '""')}"`)
      .join('\n');

    const blob = new Blob([header + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `import-errors-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 940, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Bulk CSV User Import
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Import cohorts of students and staff with pre-flight dry-run validation and automatic invite dispatch.
            </Typography>
          </Box>

          <Paper sx={{ p: 4, mb: 4, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
              <CloudUploadIcon sx={{ fontSize: 52, color: 'primary.main' }} />
              <Typography variant="h6" fontWeight={600}>
                Upload CSV File
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={500}>
                Required columns: <code>role</code>, <code>email</code>, <code>first_name</code>, <code>last_name</code>, <code>department</code>. For students, include <code>class_name</code>, <code>section</code>, <code>dob</code>.
              </Typography>

              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <label htmlFor="csv-file-input">
                <Button variant="outlined" component="span" startIcon={<CloudUploadIcon />}>
                  {selectedFile ? selectedFile.name : 'Select CSV File'}
                </Button>
              </label>

              {selectedFile && !commitResult && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleDryRun}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {loading ? 'Validating...' : 'Validate CSV (Dry Run)'}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Dry Run Summary Results */}
          {dryRunResult && (
            <Box sx={{ mb: 4 }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        TOTAL ROWS SCANNED
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {dryRunResult.total_rows}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        READY TO IMPORT (VALID)
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {dryRunResult.valid_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="caption" color="error.main" fontWeight={600}>
                        VALIDATION ERRORS
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="error.main">
                        {dryRunResult.error_count}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Action Buttons: Confirm Import & Download Errors */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleConfirmImport}
                  disabled={loading || dryRunResult.valid_count === 0}
                  startIcon={<CheckCircleIcon />}
                >
                  Confirm & Commit {dryRunResult.valid_count} Records
                </Button>

                {dryRunResult.error_count > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDownloadErrorReport}
                    startIcon={<DownloadIcon />}
                  >
                    Download Error CSV Report ({dryRunResult.error_count})
                  </Button>
                )}
              </Box>

              {/* Error Rows Table Preview */}
              {dryRunResult.errors.length > 0 && (
                <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                  <Box sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorOutlineIcon fontSize="small" /> Rows with Errors
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Row #</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Error Description</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dryRunResult.errors.slice(0, 15).map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 700 }}>{err.row}</TableCell>
                          <TableCell color="error.main">{err.error}</TableCell>
                          <TableCell>{err.details || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Final Commit Banner */}
          {commitResult && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Bulk Import Executed Successfully!
              </Typography>
              Accounts have been registered and single-use activation email invitations have been queued for dispatch.
            </Alert>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}

