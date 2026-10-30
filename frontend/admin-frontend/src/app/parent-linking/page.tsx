'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import LinkIcon from '@mui/icons-material/Link';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { adminParentApi } from '@/features/parents/api';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';

const createParentSchema = z.object({
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  phone: z.string().optional(),
});

type CreateParentFormData = z.infer<typeof createParentSchema>;

export default function ParentLinkingPage() {
  const { showSnackbar } = useSnackbar();

  // Link Student to Parent state
  const [parentIdInput, setParentIdInput] = React.useState('');
  const [studentIdInput, setStudentIdInput] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateParentFormData>({
    resolver: zodResolver(createParentSchema),
  });

  const createParentMutation = useMutation({
    mutationFn: (payload: CreateParentFormData) => adminParentApi.createParent(payload),
    onSuccess: (data) => {
      showSnackbar(`Parent account created! Parent ID: ${data.id}`, 'success');
      setParentIdInput(data.id);
      reset();
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to create parent'), 'error');
    },
  });

  const linkMutation = useMutation({
    mutationFn: () => adminParentApi.linkStudent(parentIdInput.trim(), studentIdInput.trim()),
    onSuccess: () => {
      showSnackbar('Student linked to parent successfully!', 'success');
      setStudentIdInput('');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to link parent and student'), 'error');
    },
  });

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 880, mx: 'auto' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Parent & Guardian Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Provision parent accounts and establish verified family relationships with enrolled students.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {/* Create Parent Form */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <PersonAddIcon color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    1. Create Parent Account
                  </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit((d) => createParentMutation.mutate(d))} noValidate>
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Parent Email"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    {...register('email')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="First Name"
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    {...register('first_name')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Last Name"
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    {...register('last_name')}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    label="Phone Number (Optional)"
                    {...register('phone')}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ mt: 3 }}
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
                  >
                    {isSubmitting ? 'Creating...' : 'Create & Invite Parent'}
                  </Button>
                </Box>
              </Paper>
            </Grid>

            {/* Link Parent to Student Form */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <LinkIcon color="secondary" />
                  <Typography variant="h6" fontWeight={700}>
                    2. Link to Student
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Associate a parent ID with an enrolled student ID (UUID).
                </Typography>

                <TextField
                  margin="normal"
                  fullWidth
                  label="Parent Record ID (UUID)"
                  placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                  value={parentIdInput}
                  onChange={(e) => setParentIdInput(e.target.value)}
                />

                <TextField
                  margin="normal"
                  fullWidth
                  label="Student Record ID (UUID)"
                  placeholder="e.g. 987e6543-e21b-12d3-a456-426614174999"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                />

                <Button
                  variant="contained"
                  color="secondary"
                  fullWidth
                  sx={{ mt: 3 }}
                  disabled={linkMutation.isPending || !parentIdInput || !studentIdInput}
                  onClick={() => linkMutation.mutate()}
                  startIcon={linkMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {linkMutation.isPending ? 'Linking...' : 'Link Parent & Student'}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </AppShell>
    </RequireRole>
  );
}

