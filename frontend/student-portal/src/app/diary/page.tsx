'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CampaignIcon from '@mui/icons-material/Campaign';
import DoneAllIcon from '@mui/icons-material/DoneAll';

import AppShell from '@/components/layout/AppShell';
import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';
import { useAuth } from '@/features/auth/hooks';
import { useMyChildren } from '@/features/parents/hooks';
import {
  studentDiaryApi,
  DiaryEntry,
  DiaryConversation,
} from '@/features/diary/api';

const ENTRY_TYPE_CONFIG: Record<string, { label: string; color: any; icon: any }> = {
  DAILY_UPDATE: { label: 'Classroom Update', color: 'info', icon: <MenuBookIcon fontSize="small" /> },
  HOMEWORK: { label: 'Homework Assignment', color: 'primary', icon: <AssignmentIcon fontSize="small" /> },
  BEHAVIOUR: { label: 'Behaviour Remark', color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
  NOTICE: { label: 'Notice', color: 'error', icon: <CampaignIcon fontSize="small" /> },
  ACHIEVEMENT: { label: 'Achievement', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  POSITIVE_FEEDBACK: { label: 'Positive Feedback', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  IMPROVEMENT: { label: 'Area for Improvement', color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
  PARENT_MEETING: { label: 'Meeting Request', color: 'error', icon: <CampaignIcon fontSize="small" /> },
};

export default function DigitalDiaryPage() {
  const { user, role } = useAuth();
  const isParent = role === 'parent';

  // Multi-children query for parents
  const { data: children, isLoading: loadingChildren } = useMyChildren();
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);

  const activeChild = isParent && children && children.length > 0 ? children[selectedChildIndex] : null;
  const childId = activeChild?.student_id || activeChild?.id;

  // Entries & Filters
  const [entries, setEntries] = React.useState<DiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('ALL');

  // Acknowledgement dialog (Parent)
  const [ackDialogOpen, setAckDialogOpen] = React.useState(false);
  const [selectedEntryForAck, setSelectedEntryForAck] = React.useState<DiaryEntry | null>(null);
  const [ackNotes, setAckNotes] = React.useState('');
  const [submittingAck, setSubmittingAck] = React.useState(false);

  // Conversation thread drawer
  const [convDrawerOpen, setConvDrawerOpen] = React.useState(false);
  const [activeConv, setActiveConv] = React.useState<DiaryConversation | null>(null);
  const [convLoading, setConvLoading] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  const loadEntries = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isParent) {
        if (!childId) {
          setEntries([]);
          setLoading(false);
          return;
        }
        const res = await studentDiaryApi.getParentEntries({
          student_id: childId,
          entry_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          search: search.trim() || undefined,
        });
        setEntries(res.entries);
      } else {
        const res = await studentDiaryApi.getStudentEntries({
          entry_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          search: search.trim() || undefined,
        });
        setEntries(res.entries);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load diary entries.');
    } finally {
      setLoading(false);
    }
  }, [isParent, childId, typeFilter, search]);

  React.useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Student marks entry as read
  const handleMarkAsRead = async (entryId: string) => {
    try {
      await studentDiaryApi.markAsRead(entryId);
      setEntries((prev) =>
        prev.map((e) => (e.id === entryId ? { ...e, is_read_by_student: true } : e))
      );
      setSuccessMsg('Classroom update marked as read.');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Parent acknowledgement
  const handleOpenAckDialog = (entry: DiaryEntry) => {
    setSelectedEntryForAck(entry);
    setAckNotes('');
    setAckDialogOpen(true);
  };

  const handleConfirmAck = async () => {
    if (!selectedEntryForAck || !childId) return;
    try {
      setSubmittingAck(true);
      await studentDiaryApi.acknowledgeEntry(selectedEntryForAck.id, childId, ackNotes.trim() || undefined);
      setAckDialogOpen(false);
      setSuccessMsg('Digital diary note acknowledged successfully!');
      loadEntries();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to acknowledge entry.');
    } finally {
      setSubmittingAck(false);
    }
  };

  // 1-on-1 Conversation
  const handleOpenConversation = async (entry: DiaryEntry) => {
    const targetStudent = isParent ? childId : user?.id;
    if (!targetStudent) return;
    try {
      setConvLoading(true);
      setConvDrawerOpen(true);
      const convInit = await studentDiaryApi.getOrCreateConversation(entry.id, targetStudent);
      const conv = await studentDiaryApi.getConversationDetails(convInit.conversation_id);
      setActiveConv(conv);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to open discussion thread.');
    } finally {
      setConvLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeConv || !replyText.trim()) return;
    try {
      const msg = await studentDiaryApi.postConversationMessage(activeConv.id, replyText.trim());
      setActiveConv({
        ...activeConv,
        messages: [...activeConv.messages, msg],
      });
      setReplyText('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to send reply.');
    }
  };

  return (
    <RequireRole roles={[ROLES.STUDENT, ROLES.PARENT]}>
      <AppShell>
        <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 6 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon color="primary" fontSize="large" /> Digital School Diary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {isParent
                ? 'Review daily remarks, homework, and observations for your linked children with digital acknowledgement.'
                : 'Stay up to date with daily classroom remarks, homework due dates, instructions, and positive feedback.'}
            </Typography>
          </Box>

          {/* Parent Multi-Child Selector */}
          {isParent && children && children.length > 1 && (
            <Paper sx={{ mb: 3, borderRadius: 2 }}>
              <Tabs
                value={selectedChildIndex}
                onChange={(_, val) => setSelectedChildIndex(val)}
                variant="scrollable"
                scrollButtons="auto"
              >
                {children.map((c, idx) => (
                  <Tab key={c.id || idx} label={`${c.first_name} ${c.last_name}`} />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* Alerts */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
              {successMsg}
            </Alert>
          )}

          {/* Filter Bar */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search updates, subjects, or homework..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Entry Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Categories</MenuItem>
                  <MenuItem value="HOMEWORK">Homework Assignment</MenuItem>
                  <MenuItem value="DAILY_UPDATE">Daily Classroom Update</MenuItem>
                  <MenuItem value="ACADEMIC">Academic Performance</MenuItem>
                  <MenuItem value="BEHAVIOUR">Behaviour & Conduct</MenuItem>
                  <MenuItem value="NOTICE">Important Notices</MenuItem>
                  <MenuItem value="ACHIEVEMENT">Achievements</MenuItem>
                  <MenuItem value="POSITIVE_FEEDBACK">Positive Feedback</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button fullWidth variant="outlined" onClick={loadEntries} sx={{ textTransform: 'none', height: 40 }}>
                  Search
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Entries Feed */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : entries.length === 0 ? (
            <Card sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
              <MenuBookIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary">
                No Diary Entries Found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No classroom remarks or homework have been posted matching your filters.
              </Typography>
            </Card>
          ) : (
            <Stack spacing={2.5}>
              {entries.map((entry) => {
                const conf = ENTRY_TYPE_CONFIG[entry.entry_type] || {
                  label: entry.entry_type.replace(/_/g, ' '),
                  color: 'default' as any,
                  icon: <MenuBookIcon fontSize="small" />,
                };

                return (
                  <Card
                    key={entry.id}
                    sx={{
                      borderRadius: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft:
                        isParent && entry.requires_acknowledgement && !entry.is_acknowledged
                          ? '4px solid #ed6c02'
                          : undefined,
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                      {/* Top Badges */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            icon={conf.icon}
                            label={conf.label}
                            color={conf.color}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                          {entry.subject_name && (
                            <Chip label={entry.subject_name} size="small" variant="outlined" />
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Date: {entry.entry_date}
                          </Typography>
                          {entry.due_date && (
                            <Typography variant="caption" color="error.main" fontWeight={700}>
                              • Due: {entry.due_date}
                            </Typography>
                          )}
                        </Box>

                        {/* Status indicators */}
                        {isParent ? (
                          entry.is_acknowledged ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Signed"
                              color="success"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : entry.requires_acknowledgement ? (
                            <Chip
                              label="Signature Required"
                              color="warning"
                              size="small"
                              sx={{ fontWeight: 600 }}
                            />
                          ) : null
                        ) : entry.is_read_by_student ? (
                          <Chip icon={<DoneAllIcon />} label="Read" size="small" color="default" variant="outlined" />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleMarkAsRead(entry.id)}
                            sx={{ textTransform: 'none', py: 0.2, px: 1, fontSize: '0.75rem' }}
                          >
                            Mark Read
                          </Button>
                        )}
                      </Box>

                      {/* Content */}
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                        {entry.title}
                      </Typography>
                      <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                        {entry.description}
                      </Typography>

                      {/* Footer Actions */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                        <Typography variant="caption" color="text.secondary">
                          Teacher: <strong>{entry.teacher_name}</strong>
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {isParent && entry.requires_acknowledgement && !entry.is_acknowledged && (
                            <Button
                              variant="contained"
                              color="warning"
                              size="small"
                              startIcon={<CheckCircleIcon />}
                              onClick={() => handleOpenAckDialog(entry)}
                              sx={{ textTransform: 'none' }}
                            >
                              Acknowledge
                            </Button>
                          )}

                          {isParent && entry.is_conversation_allowed && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<ChatIcon />}
                              onClick={() => handleOpenConversation(entry)}
                              sx={{ textTransform: 'none' }}
                            >
                              Message Teacher
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {/* Parent Signature Dialog */}
          <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Acknowledge School Diary Entry</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Confirming digital parent signature for: <strong>{selectedEntryForAck?.title}</strong>
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Optional Note for Teacher"
                placeholder="e.g. Received and reviewed with child."
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAckDialogOpen(false)}>Cancel</Button>
              <Button
                variant="contained"
                disabled={submittingAck}
                onClick={handleConfirmAck}
                sx={{ textTransform: 'none' }}
              >
                {submittingAck ? 'Signing...' : 'Confirm Signature'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* 1-on-1 Parent-Teacher Conversation Drawer */}
          <Drawer
            anchor="right"
            open={convDrawerOpen}
            onClose={() => setConvDrawerOpen(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 460 } } }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Message Teacher
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Note: {activeConv?.entry_title}
                </Typography>
              </Box>
              <IconButton onClick={() => setConvDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider />

            {convLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : !activeConv ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No conversation active.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={`Status: ${activeConv.status}`}
                    size="small"
                    color={activeConv.status === 'OPEN' ? 'primary' : 'success'}
                  />
                  {activeConv.resolution_notes && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Resolution: {activeConv.resolution_notes}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
                  {activeConv.messages.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                      No messages yet. Send a query to the teacher below.
                    </Typography>
                  ) : (
                    activeConv.messages.map((m) => {
                      const isSender = m.sender_role === (isParent ? 'PARENT' : 'STUDENT');
                      return (
                        <Box
                          key={m.id}
                          sx={{
                            mb: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isSender ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              maxWidth: '85%',
                              backgroundColor: isSender ? 'primary.main' : 'action.hover',
                              color: isSender ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                              {m.sender_name} ({m.sender_role})
                            </Typography>
                            <Typography variant="body2">{m.message}</Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, px: 0.5 }}>
                            {m.created_at?.slice(11, 16) || ''}
                          </Typography>
                        </Box>
                      );
                    })
                  )}
                </Box>

                {activeConv.status !== 'CLOSED' ? (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message to teacher..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <IconButton color="primary" onClick={handleSendReply} disabled={!replyText.trim()}>
                      <SendIcon />
                    </IconButton>
                  </Box>
                ) : (
                  <Alert severity="info">This conversation thread has been closed by the teacher.</Alert>
                )}
              </Box>
            )}
          </Drawer>

          {/* Auto-Dismissing Toast Feedback */}
          <Snackbar
            open={Boolean(successMsg)}
            autoHideDuration={4000}
            onClose={() => setSuccessMsg(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={() => setSuccessMsg(null)} severity="success" sx={{ width: '100%', boxShadow: 3 }}>
              {successMsg}
            </Alert>
          </Snackbar>
        </Box>
      </AppShell>
    </RequireRole>
  );
}
