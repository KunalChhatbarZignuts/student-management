'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CampaignIcon from '@mui/icons-material/Campaign';

import {
  studentDiaryApi,
  DiaryEntry,
  DiaryConversation,
} from '@/features/diary/api';

const ENTRY_TYPE_CONFIG: Record<string, { label: string; color: any; icon: any }> = {
  DAILY_UPDATE: { label: 'Classroom Update', color: 'info', icon: <MenuBookIcon fontSize="small" /> },
  HOMEWORK: { label: 'Homework', color: 'primary', icon: <AssignmentIcon fontSize="small" /> },
  BEHAVIOUR: { label: 'Behaviour Remark', color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
  NOTICE: { label: 'Notice', color: 'error', icon: <CampaignIcon fontSize="small" /> },
  ACHIEVEMENT: { label: 'Achievement', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  POSITIVE_FEEDBACK: { label: 'Positive Feedback', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  IMPROVEMENT: { label: 'Area for Improvement', color: 'warning', icon: <WarningAmberIcon fontSize="small" /> },
  PARENT_MEETING: { label: 'Meeting Request', color: 'error', icon: <CampaignIcon fontSize="small" /> },
};

interface ChildDiaryTabProps {
  childId?: string;
}

export function ChildDiaryTab({ childId }: ChildDiaryTabProps) {
  const [entries, setEntries] = React.useState<DiaryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Acknowledgement dialog state
  const [ackDialogOpen, setAckDialogOpen] = React.useState(false);
  const [selectedEntryForAck, setSelectedEntryForAck] = React.useState<DiaryEntry | null>(null);
  const [ackNotes, setAckNotes] = React.useState('');
  const [submittingAck, setSubmittingAck] = React.useState(false);

  // Conversation thread drawer state
  const [convDrawerOpen, setConvDrawerOpen] = React.useState(false);
  const [activeConv, setActiveConv] = React.useState<DiaryConversation | null>(null);
  const [convLoading, setConvLoading] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  const fetchEntries = React.useCallback(async () => {
    if (!childId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await studentDiaryApi.getParentEntries({ student_id: childId });
      setEntries(res.entries);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load digital diary records.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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
      setSuccessMsg('Diary entry acknowledged successfully!');
      fetchEntries();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to acknowledge entry.');
    } finally {
      setSubmittingAck(false);
    }
  };

  const handleOpenConversation = async (entry: DiaryEntry) => {
    if (!childId) return;
    try {
      setConvLoading(true);
      setConvDrawerOpen(true);
      const convInit = await studentDiaryApi.getOrCreateConversation(entry.id, childId);
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
      setError(err?.response?.data?.detail || 'Failed to send message.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
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

      {entries.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <MenuBookIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            No Diary Entries Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Teacher remarks, daily classroom updates, and homework assignments will appear here.
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
                  borderLeft: entry.requires_acknowledgement && !entry.is_acknowledged ? '4px solid #ed6c02' : undefined,
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
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
                        <Typography variant="caption" color="error.main" fontWeight={600}>
                          • Due: {entry.due_date}
                        </Typography>
                      )}
                    </Box>

                    {/* Acknowledgement Status Badge */}
                    {entry.is_acknowledged ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Acknowledged"
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
                    ) : null}
                  </Box>

                  <Typography variant="h6" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>
                    {entry.title}
                  </Typography>

                  <Typography variant="body2" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                    {entry.description}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                      Teacher: <strong>{entry.teacher_name}</strong>
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {entry.requires_acknowledgement && !entry.is_acknowledged && (
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

                      {entry.is_conversation_allowed && (
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

      {/* Acknowledgement Dialog */}
      <Dialog open={ackDialogOpen} onClose={() => setAckDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Acknowledge School Diary Entry</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Confirming your digital signature for: <strong>{selectedEntryForAck?.title}</strong>
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Optional Note for Teacher"
            placeholder="e.g. Checked with child, working on assignment tonight."
            value={ackNotes}
            onChange={(e) => setAckNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAckDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
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
              Diary Note: {activeConv?.entry_title}
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
            <Typography color="text.secondary">No thread available.</Typography>
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
                  No messages yet. Send a note to the teacher below.
                </Typography>
              ) : (
                activeConv.messages.map((m) => {
                  const isParent = m.sender_role === 'PARENT';
                  return (
                    <Box
                      key={m.id}
                      sx={{
                        mb: 1.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isParent ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          maxWidth: '85%',
                          backgroundColor: isParent ? 'primary.main' : 'action.hover',
                          color: isParent ? 'primary.contrastText' : 'text.primary',
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
                  placeholder="Ask teacher for clarification..."
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
    </Box>
  );
}
export default ChildDiaryTab;
