'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';

import StatusChip from '@/components/ui/StatusChip';
import { ParentWithChildren, LinkedChildDetail } from '@/features/parents/api';

export interface ParentDetailDialogProps {
  viewingParent: ParentWithChildren | null;
  onClose: () => void;
  onLinkNewChild: (parent: ParentWithChildren) => void;
  onUnlinkChild: (parent: ParentWithChildren, child: LinkedChildDetail) => void;
}

export default function ParentDetailDialog({
  viewingParent,
  onClose,
  onLinkNewChild,
  onUnlinkChild,
}: ParentDetailDialogProps) {
  if (!viewingParent) return null;

  return (
    <Dialog open={Boolean(viewingParent)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={700} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Parent Details & Linked Children</span>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LinkIcon />}
          onClick={() => {
            const p = viewingParent;
            onClose();
            onLinkNewChild(p);
          }}
        >
          Link New Child
        </Button>
      </DialogTitle>
      <DialogContent dividers>
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
                  <StatusChip status={viewingParent.user_status} />
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

          {!viewingParent.children || viewingParent.children.length === 0 ? (
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
                            onClick={() => onUnlinkChild(viewingParent, child)}
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

