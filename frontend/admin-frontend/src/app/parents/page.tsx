'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SendIcon from '@mui/icons-material/Send';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckIcon from '@mui/icons-material/Check';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ROLES } from '@/lib/constants';
import {
  adminParentApi,
  parentKeys,
  ParentWithChildren,
  LinkedChildDetail,
} from '@/features/parents/api';
import { adminStudentApi } from '@/features/students/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createParentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

const editParentSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CreateParentFormData = z.infer<typeof createParentSchema>;
type EditParentFormData = z.infer<typeof editParentSchema>;

export default function ParentsPage() {
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Search & Pagination state
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingParent, setEditingParent] = React.useState<ParentWithChildren | null>(null);
  const [viewingParent, setViewingParent] = React.useState<ParentWithChildren | null>(null);
  const [linkingParent, setLinkingParent] = React.useState<ParentWithChildren | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'suspend' | 'activate' | 'resend-invite' | 'unlink-child';
    targetId: string;
    extraId?: string;
    targetName: string;
  } | null>(null);

  // Link Child Form states
  const [selectedStudent, setSelectedStudent] = React.useState<any | null>(null);
  const [relationshipType, setRelationshipType] = React.useState('Guardian');
  const [isPrimaryGuardian, setIsPrimaryGuardian] = React.useState(false);

  // Query parents
  const queryParams = {
    skip: paginationModel.page * paginationModel.pageSize,
    limit: paginationModel.pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: parentKeys.list(queryParams),
    queryFn: () => adminParentApi.listParents(queryParams),
    placeholderData: keepPreviousData,
  });

  // Query students for linking
  const { data: studentList } = useQuery({
    queryKey: ['students', 'autocomplete-list'],
    queryFn: () => adminStudentApi.listStudents({ limit: 100 }),
    enabled: Boolean(linkingParent),
  });

  const studentOptions = (studentList?.items || [])
    .filter((u) => u.student)
    .map((u) => ({
      id: u.student!.id,
      label: `${u.student!.first_name} ${u.student!.last_name} (${u.student!.enrollment_number || u.student!.student_code}) - ${u.student!.class_name || 'Class'} (${u.student!.section || 'A'})`,
    }));

  const [createdCredentials, setCreatedCredentials] = React.useState<{
    name: string;
    identifier: string;
    phone?: string;
    password?: string;
    portalUrl: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Create Parent Form
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    setValue: setValueCreate,
    formState: { errors: createErrors, isSubmitting: isCreating },
  } = useForm<CreateParentFormData>({
    resolver: zodResolver(createParentSchema),
  });

  // Edit Parent Form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isUpdating },
  } = useForm<EditParentFormData>({
    resolver: zodResolver(editParentSchema),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateParentFormData) => adminParentApi.createParent(payload),
    onSuccess: (res) => {
      showSnackbar(`Parent account created successfully!`, 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setOpenCreate(false);
      resetCreate();
      if (res.initial_password) {
        setCreatedCredentials({
          name: `${res.first_name} ${res.last_name}`,
          identifier: res.email,
          phone: res.phone || undefined,
          password: res.initial_password,
          portalUrl: 'http://localhost:3001/login',
        });
      }
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to create parent'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: EditParentFormData) => {
      if (!editingParent) throw new Error('No parent selected');
      return adminParentApi.updateParent(editingParent.id, payload);
    },
    onSuccess: () => {
      showSnackbar('Parent details updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setEditingParent(null);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to update parent'), 'error'),
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!linkingParent || !selectedStudent) throw new Error('Parent and student are required');
      return adminParentApi.linkChild(linkingParent.id, {
        student_id: selectedStudent.id,
        relationship_type: relationshipType,
        is_primary_guardian: isPrimaryGuardian,
      });
    },
    onSuccess: () => {
      showSnackbar('Child linked to parent guardian record successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setLinkingParent(null);
      setSelectedStudent(null);
      setRelationshipType('Guardian');
      setIsPrimaryGuardian(false);
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Failed to link child'), 'error'),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: { type: string; targetId: string; extraId?: string }) => {
      if (action.type === 'suspend') {
        return adminParentApi.updateParentStatus(action.targetId, 'suspended');
      } else if (action.type === 'activate') {
        return adminParentApi.updateParentStatus(action.targetId, 'active');
      } else if (action.type === 'resend-invite') {
        return adminParentApi.resendInvite(action.targetId);
      } else if (action.type === 'unlink-child' && action.extraId) {
        return adminParentApi.unlinkChild(action.targetId, action.extraId);
      }
    },
    onSuccess: (_, variables) => {
      const msg =
        variables.type === 'unlink-child'
          ? 'Child unlinked from parent record successfully'
          : `Parent action ${variables.type} completed successfully!`;
      showSnackbar(msg, 'success');
      queryClient.invalidateQueries({ queryKey: parentKeys.all });
      setConfirmAction(null);
      if (viewingParent) {
        adminParentApi.getParent(viewingParent.id).then((fresh) => setViewingParent(fresh));
      }
    },
    onError: (err) => showSnackbar(formatErrorMessage(err, 'Action failed'), 'error'),
  });

  const openEditModal = (p: ParentWithChildren) => {
    setEditingParent(p);
    resetEdit({
      first_name: p.first_name,
      last_name: p.last_name,
      phone: p.phone || '',
      address: p.address || '',
    });
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Parent / Guardian',
      width: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FamilyRestroomIcon color="primary" fontSize="small" />
          <Typography variant="body2" fontWeight={600}>
            {params.row.first_name} {params.row.last_name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'email',
      headerName: 'Email Address',
      flex: 1,
      minWidth: 210,
    },
    {
      field: 'phone',
      headerName: 'Phone Number',
      width: 150,
      valueGetter: (_, row) => row.phone || '-',
    },
    {
      field: 'children_count',
      headerName: 'Linked Children',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          label={`${params.row.children_count || params.row.children?.length || 0} Children`}
          size="small"
          color={params.row.children_count > 0 ? 'primary' : 'default'}
          variant={params.row.children_count > 0 ? 'filled' : 'outlined'}
        />
      ),
    },
    {
      field: 'user_status',
      headerName: 'Account Status',
      width: 130,
      renderCell: (params) => {
        const s = params.row.user_status || 'invited';
        const color =
          s === 'active' ? 'success' : s === 'invited' ? 'warning' : 'error';
        return <Chip label={s.toUpperCase()} color={color} size="small" />;
      },
    },
    {
      field: 'created_at',
      headerName: 'Joined Date',
      width: 130,
      valueGetter: (_, row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '-',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 230,
      sortable: false,
      renderCell: (params) => {
        const p: ParentWithChildren = params.row;
        const pName = `${p.first_name} ${p.last_name}`;

        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="View Details & Children">
              <IconButton size="small" color="info" onClick={() => setViewingParent(p)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Edit Parent Profile">
              <IconButton size="small" color="primary" onClick={() => openEditModal(p)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Link a Student">
              <IconButton size="small" color="secondary" onClick={() => setLinkingParent(p)}>
                <LinkIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {p.user_status === 'invited' && (
              <Tooltip title="Resend Activation Invite">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() =>
                    setConfirmAction({
                      type: 'resend-invite',
                      targetId: p.id,
                      targetName: pName,
                    })
                  }
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

            {p.user_status === 'active' ? (
              <Tooltip title="Suspend Account">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() =>
                    setConfirmAction({
                      type: 'suspend',
                      targetId: p.id,
                      targetName: pName,
                    })
                  }
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Activate Account">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() =>
                    setConfirmAction({
                      type: 'activate',
                      targetId: p.id,
                      targetName: pName,
                    })
                  }
                >
                  <CheckCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Parents & Guardians Directory
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage parent accounts, configure parent-student relationship linkages, and dispatch portal invites.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setOpenCreate(true)}
          >
            Add Parent
          </Button>
        </Box>

        {/* Search & Status Filters */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by parent name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Account Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="invited">Invited</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="deactivated">Deactivated</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {/* DataGrid */}
        <Paper sx={{ height: 530, width: '100%', borderRadius: 3 }}>
          <DataGrid
            rows={data?.items || []}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            rowCount={data?.total || 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            sx={{ border: 0 }}
          />
        </Paper>

        {/* Create Parent Dialog */}
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Create Parent Account</DialogTitle>
          <Box component="form" onSubmit={handleSubmitCreate((d) => createMutation.mutate(d))} noValidate>
            <DialogContent dividers>
              <Alert severity="info" sx={{ mb: 2.5 }}>
                An account invitation with a secure activation link will be automatically sent to the registered email address.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    error={!!createErrors.first_name}
                    helperText={createErrors.first_name?.message}
                    {...registerCreate('first_name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    error={!!createErrors.last_name}
                    helperText={createErrors.last_name?.message}
                    {...registerCreate('last_name')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address *"
                    type="email"
                    error={!!createErrors.email}
                    helperText={createErrors.email?.message}
                    {...registerCreate('email')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    {...registerCreate('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    {...registerCreate('address')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      fullWidth
                      label="Initial Password (Optional)"
                      placeholder="Leave blank to invite via email, or set password now"
                      error={!!createErrors.password}
                      helperText={createErrors.password?.message || "Set a password now to allow instant login to the Parent Portal"}
                      {...registerCreate('password')}
                    />
                    <Button
                      variant="outlined"
                      sx={{ height: 56, whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const randomPwd = `Parent@${Math.floor(1000 + Math.random() * 9000)}`;
                        setValueCreate('password', randomPwd);
                      }}
                    >
                      Generate
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setOpenCreate(false)} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreating}
                startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isCreating ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* Credentials Created Dialog */}
        <Dialog open={Boolean(createdCredentials)} onClose={() => setCreatedCredentials(null)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyIcon color="primary" /> Parent Account Credentials Created
          </DialogTitle>
          <DialogContent dividers>
            {createdCredentials && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Alert severity="success">
                  Parent account is active. The parent can immediately sign in to the Parent Portal with these credentials:
                </Alert>
                <Paper variant="outlined" sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">GUARDIAN NAME</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
                    {createdCredentials.name}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">LOGIN IDENTIFIER (EMAIL)</Typography>
                  <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ mb: 1.5 }}>
                    {createdCredentials.identifier}
                  </Typography>

                  {createdCredentials.phone && (
                    <>
                      <Typography variant="caption" color="text.secondary">REGISTERED PHONE</Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ mb: 1.5 }}>
                        {createdCredentials.phone}
                      </Typography>
                    </>
                  )}

                  <Typography variant="caption" color="text.secondary">PASSWORD</Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'monospace', letterSpacing: 1 }}>
                    {createdCredentials.password || 'Set via invite link'}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">PORTAL LOGIN URL</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {createdCredentials.portalUrl}
                  </Typography>
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              startIcon={copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
              onClick={() => {
                if (createdCredentials) {
                  const text = `Parent Portal Login Credentials:\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.identifier}\nPassword: ${createdCredentials.password}\nPortal URL: ${createdCredentials.portalUrl}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }
              }}
            >
              {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
            </Button>
            <Button
              variant="contained"
              onClick={() => setCreatedCredentials(null)}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Parent Dialog */}
        <Dialog open={Boolean(editingParent)} onClose={() => setEditingParent(null)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Edit Parent Profile</DialogTitle>
          <Box component="form" onSubmit={handleSubmitEdit((d) => updateMutation.mutate(d))} noValidate>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    error={!!editErrors.first_name}
                    helperText={editErrors.first_name?.message}
                    {...registerEdit('first_name')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    error={!!editErrors.last_name}
                    helperText={editErrors.last_name?.message}
                    {...registerEdit('last_name')}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    disabled
                    value={editingParent?.email || ''}
                    helperText="Email cannot be changed directly."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    {...registerEdit('phone')}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    {...registerEdit('address')}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setEditingParent(null)} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isUpdating}
                startIcon={isUpdating ? <CircularProgress size={16} color="inherit" /> : null}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogActions>
          </Box>
        </Dialog>

        {/* View Details & Linked Children Modal */}
        <Dialog open={Boolean(viewingParent)} onClose={() => setViewingParent(null)} maxWidth="md" fullWidth>
          <DialogTitle fontWeight={700} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Parent Details & Linked Children</span>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => {
                const p = viewingParent;
                setViewingParent(null);
                setLinkingParent(p);
              }}
            >
              Link New Child
            </Button>
          </DialogTitle>
          <DialogContent dividers>
            {viewingParent && (
              <Box>
                {/* Parent Summary Card */}
                <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">Full Name</Typography>
                      <Typography variant="body2" fontWeight={700}>
                        {viewingParent.first_name} {viewingParent.last_name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">Email Address</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {viewingParent.email}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {viewingParent.phone || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography variant="caption" color="text.secondary">Account Status</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={viewingParent.user_status.toUpperCase()}
                          size="small"
                          color={viewingParent.user_status === 'active' ? 'success' : 'warning'}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={8}>
                      <Typography variant="caption" color="text.secondary">Address</Typography>
                      <Typography variant="body2">
                        {viewingParent.address || 'None on record'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Linked Students ({viewingParent.children?.length || 0})
                </Typography>

                {(!viewingParent.children || viewingParent.children.length === 0) ? (
                  <Alert severity="info">
                    No active children are currently linked to this parent account. Click <strong>Link New Child</strong> above to associate a student.
                  </Alert>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Enrollment No.</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Grade & Section</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Relationship</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Primary Guardian</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {viewingParent.children.map((child: LinkedChildDetail) => (
                          <TableRow key={child.student_id}>
                            <TableCell sx={{ fontWeight: 600 }}>
                              {child.first_name} {child.last_name}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="primary.main" fontWeight={600}>
                                {child.enrollment_number || child.student_code}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {child.class_name} ({child.section})
                            </TableCell>
                            <TableCell>
                              <Chip label={child.relationship_type || 'Guardian'} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {child.is_primary_guardian ? (
                                <Chip label="Primary" color="success" size="small" />
                              ) : (
                                <Typography variant="caption" color="text.secondary">No</Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Unlink Student">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    setConfirmAction({
                                      type: 'unlink-child',
                                      targetId: viewingParent.id,
                                      extraId: child.student_id,
                                      targetName: `${child.first_name} ${child.last_name}`,
                                    })
                                  }
                                >
                                  <LinkOffIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={() => setViewingParent(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Link Child Modal */}
        <Dialog open={Boolean(linkingParent)} onClose={() => setLinkingParent(null)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>
            Link Student to Parent Account
          </DialogTitle>
          <DialogContent dividers>
            {linkingParent && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Alert severity="info">
                  Linking to: <strong>{linkingParent.first_name} {linkingParent.last_name}</strong> ({linkingParent.email})
                </Alert>

                <Autocomplete
                  options={studentOptions}
                  getOptionLabel={(opt) => opt.label}
                  value={selectedStudent}
                  onChange={(_, val) => setSelectedStudent(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Enrolled Student *"
                      placeholder="Type student name or ID..."
                    />
                  )}
                />

                <TextField
                  select
                  fullWidth
                  label="Relationship Type *"
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                >
                  <MenuItem value="Father">Father</MenuItem>
                  <MenuItem value="Mother">Mother</MenuItem>
                  <MenuItem value="Guardian">Legal Guardian</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>

                <FormControlLabel
                  control={
                    <Switch
                      checked={isPrimaryGuardian}
                      onChange={(e) => setIsPrimaryGuardian(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Designate as Primary Guardian (Syncs contact info to student profile)"
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setLinkingParent(null)} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={!selectedStudent || linkMutation.isPending}
              onClick={() => linkMutation.mutate()}
              startIcon={linkMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
            >
              {linkMutation.isPending ? 'Linking...' : 'Confirm Link'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        {confirmAction && (
          <ConfirmDialog
            open={Boolean(confirmAction)}
            title={`Confirm: ${confirmAction.type.toUpperCase().replace('-', ' ')}`}
            description={
              confirmAction.type === 'unlink-child'
                ? `Are you sure you want to unlink child "${confirmAction.targetName}"? Previous academic records will remain completely intact.`
                : `Are you sure you want to perform "${confirmAction.type}" on parent account: ${confirmAction.targetName}?`
            }
            confirmLabel="Confirm"
            confirmColor={confirmAction.type.includes('unlink') || confirmAction.type === 'suspend' ? 'error' : 'primary'}
            loading={actionMutation.isPending}
            onConfirm={() =>
              actionMutation.mutate({
                type: confirmAction.type,
                targetId: confirmAction.targetId,
                extraId: confirmAction.extraId,
              })
            }
            onClose={() => setConfirmAction(null)}
          />
        )}
      </AppShell>
    </RequireRole>
  );
}

