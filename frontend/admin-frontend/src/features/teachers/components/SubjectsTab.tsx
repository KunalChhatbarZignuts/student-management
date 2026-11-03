'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import MenuBookIcon from '@mui/icons-material/MenuBook';

import { teacherSubjectApi, teacherSubjectKeys } from '../subjectApi';
import { SubjectItem } from '../types';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CreateSubjectDialog from './CreateSubjectDialog';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

export default function SubjectsTab() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  const [search, setSearch] = React.useState('');
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [subjectToDelete, setSubjectToDelete] = React.useState<SubjectItem | null>(null);

  const { data: subjects, isLoading } = useQuery({
    queryKey: teacherSubjectKeys.subjects(),
    queryFn: teacherSubjectApi.listSubjects,
  });

  const deleteMutation = useMutation({
    mutationFn: (subjectId: string) => teacherSubjectApi.deleteSubject(subjectId),
    onSuccess: () => {
      showSnackbar('Subject deactivated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: teacherSubjectKeys.all });
      setSubjectToDelete(null);
    },
    onError: (err: any) => {
      showSnackbar(formatErrorMessage(err), 'error');
    },
  });

  const filteredSubjects = React.useMemo(() => {
    if (!subjects) return [];
    if (!search.trim()) return subjects;
    const q = search.toLowerCase();
    return subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }, [subjects, search]);

  const columns: GridColDef<SubjectItem>[] = [
    {
      field: 'name',
      headerName: 'Subject Name',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon fontSize="small" color="primary" />
          <Typography variant="body2" fontWeight={600}>
            {params.row.name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'code',
      headerName: 'Subject Code',
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Chip size="small" label={params.row.code} variant="outlined" color="primary" />
      ),
    },
    {
      field: 'department',
      headerName: 'Department',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Typography variant="body2" color="text.secondary">
          {params.row.department || '-'}
        </Typography>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Remove / Deactivate Subject">
          <IconButton
            size="small"
            color="error"
            onClick={() => setSubjectToDelete(params.row)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Curriculum Subjects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage school academic subjects, codes, and departments.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
        >
          Add Subject
        </Button>
      </Box>

      {/* Filter / Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search subjects by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Subjects DataGrid */}
      <Paper sx={{ height: 500, width: '100%', borderRadius: 2 }}>
        <DataGrid
          rows={filteredSubjects}
          columns={columns}
          loading={isLoading}
          pageSizeOptions={[10, 20, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 15, page: 0 } },
          }}
          disableRowSelectionOnClick
          getRowId={(row) => row.id}
          sx={{ border: 0 }}
        />
      </Paper>

      {/* Create Subject Dialog */}
      <CreateSubjectDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
      />

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        open={Boolean(subjectToDelete)}
        title="Remove Curriculum Subject"
        description={
          subjectToDelete
            ? `Are you sure you want to remove/deactivate "${subjectToDelete.name}" (${subjectToDelete.code})? Any active teacher assignments for this subject will also be deactivated.`
            : ''
        }
        confirmLabel="Remove Subject"
        confirmColor="error"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (subjectToDelete) {
            deleteMutation.mutate(subjectToDelete.id);
          }
        }}
        onClose={() => setSubjectToDelete(null)}
      />
    </Box>
  );
}

