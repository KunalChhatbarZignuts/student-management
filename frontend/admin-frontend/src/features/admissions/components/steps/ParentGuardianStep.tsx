import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoRenewIcon from '@mui/icons-material/Autorenew';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import { ParentFormItem } from '@/features/admissions/types';
import { ParentWithChildren } from '@/features/parents/api';

export interface ParentGuardianStepProps {
  parents: ParentFormItem[];
  onAddParent: () => void;
  onRemoveParent: (index: number) => void;
  onUpdateParent: (index: number, updates: Partial<ParentFormItem>) => void;
  onSetPrimaryGuardian: (index: number) => void;
  parentSearchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchParentsResult?: { items: ParentWithChildren[]; total: number } | null;
  searchingParents: boolean;
  onNext: () => void;
  onBack: () => void;
  generatePassword: () => string;
}

export const ParentGuardianStep: React.FC<ParentGuardianStepProps> = ({
  parents,
  onAddParent,
  onRemoveParent,
  onUpdateParent,
  onSetPrimaryGuardian,
  onSearchQueryChange,
  searchParentsResult,
  searchingParents,
  onNext,
  onBack,
  generatePassword,
}) => {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FamilyRestroomIcon color="primary" sx={{ fontSize: 28 }} />
          <div>
            <Typography variant="h6" fontWeight={700}>
              Step 2: Parent & Guardian Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Link one or more parents/guardians. You can link existing parents or provision new
              accounts.
            </Typography>
          </div>
        </Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onAddParent}>
          Add Another Parent / Guardian
        </Button>
      </Box>

      {parents.map((p, index) => (
        <Paper
          key={p.id}
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            borderColor: p.isPrimaryGuardian ? 'primary.main' : 'divider',
            borderWidth: p.isPrimaryGuardian ? 2 : 1,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Parent / Guardian #{index + 1}
              </Typography>
              {p.isPrimaryGuardian && (
                <Chip label="Primary Guardian" color="primary" size="small" />
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Radio
                    checked={p.isPrimaryGuardian}
                    onChange={() => onSetPrimaryGuardian(index)}
                  />
                }
                label="Set as Primary"
              />
              {parents.length > 1 && (
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => onRemoveParent(index)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          <RadioGroup
            row
            value={p.isExisting ? 'existing' : 'new'}
            onChange={(e) =>
              onUpdateParent(index, { isExisting: e.target.value === 'existing' })
            }
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="new"
              control={<Radio />}
              label="Create New Parent Account"
            />
            <FormControlLabel
              value="existing"
              control={<Radio />}
              label="Select Existing Parent"
            />
          </RadioGroup>

          {p.isExisting ? (
            <Box sx={{ mb: 2 }}>
              <Autocomplete
                options={searchParentsResult?.items || []}
                getOptionLabel={(option) =>
                  `${option.first_name} ${option.last_name} (${option.email})`
                }
                value={p.existingParent}
                loading={searchingParents}
                onInputChange={(_, value) => onSearchQueryChange(value)}
                onChange={(_, value) => onUpdateParent(index, { existingParent: value })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Parent by Name, Email, or Phone"
                    placeholder="Type at least 2 characters..."
                    helperText="Search will list registered parent accounts across the system."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchingParents ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              {p.existingParent && (
                <Alert severity="success" sx={{ mt: 1.5 }}>
                  Selected: <strong>{p.existingParent.first_name} {p.existingParent.last_name}</strong>{' '}
                  ({p.existingParent.email}) — Phone: {p.existingParent.phone || 'N/A'} — Status:{' '}
                  {p.existingParent.user_status}
                </Alert>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  required
                  fullWidth
                  value={p.firstName}
                  onChange={(e) => onUpdateParent(index, { firstName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  required
                  fullWidth
                  value={p.lastName}
                  onChange={(e) => onUpdateParent(index, { lastName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  placeholder="parent@example.com"
                  value={p.email}
                  onChange={(e) => onUpdateParent(index, { email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  placeholder="+1 555-0199"
                  value={p.phone}
                  onChange={(e) => onUpdateParent(index, { phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Residential Address"
                  fullWidth
                  value={p.address}
                  onChange={(e) => onUpdateParent(index, { address: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Initial Portal Password"
                    fullWidth
                    value={p.password}
                    onChange={(e) => onUpdateParent(index, { password: e.target.value })}
                  />
                  <Tooltip title="Generate secure password">
                    <IconButton
                      color="primary"
                      onClick={() =>
                        onUpdateParent(index, { password: generatePassword() })
                      }
                      sx={{ alignSelf: 'center', border: 1, borderColor: 'divider' }}
                    >
                      <AutoRenewIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Relationship Type</InputLabel>
                <Select
                  label="Relationship Type"
                  value={p.relationshipType}
                  onChange={(e) =>
                    onUpdateParent(index, { relationshipType: e.target.value })
                  }
                >
                  <MenuItem value="Father">Father</MenuItem>
                  <MenuItem value="Mother">Mother</MenuItem>
                  <MenuItem value="Guardian">Guardian</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="outlined" onClick={onBack} startIcon={<ArrowBackIcon />}>
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={onNext}
          endIcon={<ArrowForwardIcon />}
        >
          Continue to Academic Assignment
        </Button>
      </Box>
    </Card>
  );
};

