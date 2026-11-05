'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import CircularProgress from '@mui/material/CircularProgress';

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import { FeeComponent } from '@/features/fees/api';

export interface FeeComponentsTabProps {
  components: FeeComponent[];
  isLoading: boolean;
  onOpenCreateComponent: () => void;
  onOpenEditComponent: (comp: FeeComponent) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
}

export default function FeeComponentsTab({
  components,
  isLoading,
  onOpenCreateComponent,
  onOpenEditComponent,
  onToggleStatus,
}: FeeComponentsTabProps) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Fee Components Catalog
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onOpenCreateComponent}>
          Add Fee Component
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Component Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nature</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No fee components found. Click &quot;Add Fee Component&quot; to define one.
                </TableCell>
              </TableRow>
            ) : (
              components.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell>
                    <code>{c.code}</code>
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{c.fee_type}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{c.payment_frequency}</TableCell>
                  <TableCell>
                    {c.is_mandatory ? (
                      <Chip label="Mandatory" size="small" color="primary" variant="outlined" />
                    ) : (
                      <Chip label="Optional" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={c.status}
                      size="small"
                      color={c.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Component">
                      <IconButton size="small" onClick={() => onOpenEditComponent(c)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={c.status === 'active' ? 'Deactivate' : 'Activate'}>
                      <IconButton
                        size="small"
                        color={c.status === 'active' ? 'error' : 'success'}
                        onClick={() => onToggleStatus(c.id, c.status)}
                      >
                        <Switch size="small" checked={c.status === 'active'} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

