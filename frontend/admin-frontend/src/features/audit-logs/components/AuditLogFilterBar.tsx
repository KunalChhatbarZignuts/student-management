import * as React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

export interface AuditLogFilterBarProps {
  actorFilter: string;
  onActorFilterChange: (val: string) => void;
  actionFilter: string;
  onActionFilterChange: (val: string) => void;
}

export const AuditLogFilterBar: React.FC<AuditLogFilterBarProps> = ({
  actorFilter,
  onActorFilterChange,
  actionFilter,
  onActionFilterChange,
}) => {
  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by actor email..."
            value={actorFilter}
            onChange={(e) => onActorFilterChange(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            size="small"
            label="Action Filter"
            value={actionFilter}
            onChange={(e) => onActionFilterChange(e.target.value)}
          >
            <MenuItem value="">All Actions</MenuItem>
            <MenuItem value="login_success">Login Success</MenuItem>
            <MenuItem value="login_failure">Login Failure</MenuItem>
            <MenuItem value="user_created">User Created</MenuItem>
            <MenuItem value="user_suspended">User Suspended</MenuItem>
            <MenuItem value="user_activated">User Activated</MenuItem>
            <MenuItem value="parent_created">Parent Created</MenuItem>
            <MenuItem value="parent_student_linked">Parent-Student Linked</MenuItem>
            <MenuItem value="application_approved">Application Approved</MenuItem>
            <MenuItem value="bulk_import_completed">Bulk Imported</MenuItem>
          </TextField>
        </Grid>
      </Grid>
    </Paper>
  );
};

