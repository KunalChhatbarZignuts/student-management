'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Autocomplete from '@mui/material/Autocomplete';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChatIcon from '@mui/icons-material/Chat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LinkIcon from '@mui/icons-material/Link';
import DescriptionIcon from '@mui/icons-material/Description';

import RequireRole from '@/components/guards/RequireRole';
import { ROLES } from '@/lib/constants';

import {
  diaryApi,
  DiaryEntry,
  DiaryRecipient,
  DiaryConversation,
  TeacherContext,
} from '@/features/diary/api';

const ENTRY_TYPES = [
  { value: 'DAILY_UPDATE', label: 'Daily Classroom Update', color: 'info' },
  { value: 'HOMEWORK', label: 'Homework Assignment', color: 'primary' },
  { value: 'ACADEMIC', label: 'Academic Performance', color: 'secondary' },
  { value: 'BEHAVIOUR', label: 'Behaviour & Discipline', color: 'warning' },
  { value: 'ATTENDANCE', label: 'Attendance-related Remark', color: 'default' },
  { value: 'ACHIEVEMENT', label: 'Student Achievement', color: 'success' },
  { value: 'POSITIVE_FEEDBACK', label: 'Positive Feedback', color: 'success' },
  { value: 'IMPROVEMENT', label: 'Areas for Improvement', color: 'warning' },
  { value: 'NOTICE', label: 'Important Notice', color: 'error' },
  { value: 'PARENT_MEETING', label: 'Parent Meeting Request', color: 'error' },
  { value: 'GENERAL', label: 'General Message', color: 'default' },
  { value: 'CUSTOM', label: 'Custom Entry', color: 'default' },
];

const TYPE_CATEGORY_MAP: Record<string, string> = {
  DAILY_UPDATE: 'ACADEMIC',
  HOMEWORK: 'ACADEMIC',
  ACADEMIC: 'ACADEMIC',
  BEHAVIOUR: 'BEHAVIOUR',
  ATTENDANCE: 'ADMINISTRATIVE',
  ACHIEVEMENT: 'ACADEMIC',
  POSITIVE_FEEDBACK: 'BEHAVIOUR',
  IMPROVEMENT: 'BEHAVIOUR',
  NOTICE: 'GENERAL',
  PARENT_MEETING: 'COMMUNICATION',
  GENERAL: 'GENERAL',
  CUSTOM: 'GENERAL',
};

export default function DigitalDiaryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [entries, setEntries] = React.useState<DiaryEntry[]>([]);
  const [context, setContext] = React.useState<TeacherContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [sectionFilter, setSectionFilter] = React.useState('ALL');

  // Compose / Edit Modal State
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [editingEntryId, setEditingEntryId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [entryType, setEntryType] = React.useState('DAILY_UPDATE');
  const [category, setCategory] = React.useState('ACADEMIC');
  const [entryDate, setEntryDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [selectedSection, setSelectedSection] = React.useState('');
  const [selectedSubject, setSelectedSubject] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [visibility, setVisibility] = React.useState('STUDENT_AND_PARENT');
  const [requiresAck, setRequiresAck] = React.useState(false);
  const [allowConv, setAllowConv] = React.useState(true);
  const [internalNotes, setInternalNotes] = React.useState('');
  const [targetAudience, setTargetAudience] = React.useState<'SECTION' | 'SPECIFIC'>('SECTION');
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [attachments, setAttachments] = React.useState<Array<{ name: string; url: string; file_type?: string; file_size?: number }>>([]);
  const [newAttachmentName, setNewAttachmentName] = React.useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Filtered Students scoped to currently selected class section
  const filteredStudents = React.useMemo(() => {
    if (!context?.students) return [];
    if (!selectedSection) return context.students;
    return context.students.filter(
      (st) => !st.section_id || st.section_id === selectedSection
    );
  }, [context?.students, selectedSection]);

  const handleSectionChange = (newSecId: string) => {
    setSelectedSection(newSecId);
    if (newSecId) {
      setSelectedStudentIds((prev) =>
        prev.filter((id) => {
          const st = context?.students.find((s) => s.id === id);
          return st && (!st.section_id || st.section_id === newSecId);
        })
      );
    }
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(filteredStudents.map((s) => s.id));
  };

  const handleClearSelectedStudents = () => {
    setSelectedStudentIds([]);
  };

  const handleEntryTypeChange = (newType: string) => {
    setEntryType(newType);
    setCategory(TYPE_CATEGORY_MAP[newType] || 'GENERAL');
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    const ext = newAttachmentName.split('.').pop()?.toLowerCase() || 'pdf';
    setAttachments((prev) => [
      ...prev,
      {
        name: newAttachmentName.trim(),
        url: newAttachmentUrl.trim(),
        file_type: ext,
      },
    ]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Recipients Inspection Modal State
  const [recipientsModalOpen, setRecipientsModalOpen] = React.useState(false);
  const [activeEntry, setActiveEntry] = React.useState<DiaryEntry | null>(null);
  const [recipients, setRecipients] = React.useState<DiaryRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = React.useState(false);

  // Conversation Drawer State
  const [convDrawerOpen, setConvDrawerOpen] = React.useState(false);
  const [activeConv, setActiveConv] = React.useState<DiaryConversation | null>(null);
  const [convLoading, setConvLoading] = React.useState(false);
  const [replyMessage, setReplyMessage] = React.useState('');
  const [resolutionNotes, setResolutionNotes] = React.useState('');

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ctx, entriesRes] = await Promise.all([
        diaryApi.getTeacherContext(),
        diaryApi.listTeacherEntries({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          entry_type: typeFilter !== 'ALL' ? typeFilter : undefined,
          section_id: sectionFilter !== 'ALL' ? sectionFilter : undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setContext(ctx);
      setEntries(entriesRes.entries);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to load digital diary.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, sectionFilter, search]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleComposeOpen = () => {
    setEditingEntryId(null);
    setTitle('');
    setDescription('');
    setEntryType('DAILY_UPDATE');
    setCategory('ACADEMIC');
    setEntryDate(new Date().toISOString().slice(0, 10));
    setSelectedSection(context?.sections?.[0]?.id || '');
    setSelectedSubject(context?.subjects?.[0]?.id || '');
    setDueDate('');
    setVisibility('STUDENT_AND_PARENT');
    setRequiresAck(false);
    setAllowConv(true);
    setInternalNotes('');
    setTargetAudience('SECTION');
    setSelectedStudentIds([]);
    setAttachments([]);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setDialogError(null);
    setComposeOpen(true);
  };

  const handleEditEntry = async (entry: DiaryEntry) => {
    setEditingEntryId(entry.id);
    setTitle(entry.title);
    setDescription(entry.description);
    setEntryType(entry.entry_type);
    setCategory(entry.category || TYPE_CATEGORY_MAP[entry.entry_type] || 'GENERAL');
    setEntryDate(entry.entry_date || new Date().toISOString().slice(0, 10));
    setSelectedSection(entry.section_id || '');
    setSelectedSubject(entry.subject_id || '');
    setDueDate(entry.due_date || '');
    setVisibility(entry.visibility);
    setRequiresAck(entry.requires_acknowledgement);
    setAllowConv(entry.is_conversation_allowed);
    setInternalNotes(entry.internal_notes || '');
    setAttachments(entry.attachments || []);
    setNewAttachmentName('');
    setNewAttachmentUrl('');
    setDialogError(null);

    // Fetch existing recipients to accurately restore audience selection
    try {
      const recs = await diaryApi.getEntryRecipients(entry.id);
      const sectionTotal = entry.section_id
        ? context?.students.filter((s) => s.section_id === entry.section_id).length || 0
        : 0;
      if (entry.total_recipients > 0 && sectionTotal > 0 && entry.total_recipients < sectionTotal) {
        setTargetAudience('SPECIFIC');
        setSelectedStudentIds(recs.map((r) => r.student_id));
      } else {
        setTargetAudience('SECTION');
        setSelectedStudentIds([]);
      }
    } catch {
      setTargetAudience('SECTION');
      setSelectedStudentIds([]);
    }

    setComposeOpen(true);
  };

  const handleDeleteEntry = async (id: string, entryTitle: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete diary entry "${entryTitle}"?`)) {
      return;
    }
    try {
      await diaryApi.deleteDiaryEntry(id);
      setSuccessMsg(`Diary entry "${entryTitle}" deleted.`);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to delete diary entry.');
    }
  };

  const handleSaveEntry = async (publishNow: boolean) => {
    setDialogError(null);

    if (!title.trim()) {
      setDialogError('Entry title is required.');
      return;
    }
    if (!description.trim()) {
      setDialogError('Detailed description is required.');
      return;
    }
    if (targetAudience === 'SPECIFIC' && selectedStudentIds.length === 0) {
      setDialogError('Please select at least one student recipient when choosing Specific Selected Students.');
      return;
    }
    if (requiresAck && visibility === 'STUDENT_ONLY') {
      setDialogError('Parent signature cannot be required when audience visibility is restricted to Student Only.');
      return;
    }
    if (dueDate && dueDate < entryDate) {
      setDialogError(`Due date (${dueDate}) cannot be earlier than entry date (${entryDate}).`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const existingStatus = editingEntryId
        ? entries.find((e) => e.id === editingEntryId)?.status || 'DRAFT'
        : 'DRAFT';
      const targetStatus = publishNow ? 'PUBLISHED' : (editingEntryId ? existingStatus : 'DRAFT');

      const payload = {
        title: title.trim(),
        description: description.trim(),
        entry_type: entryType,
        category: category || TYPE_CATEGORY_MAP[entryType] || 'GENERAL',
        entry_date: entryDate,
        section_id: selectedSection || undefined,
        subject_id: selectedSubject || undefined,
        due_date: dueDate || undefined,
        visibility,
        requires_acknowledgement: requiresAck,
        is_conversation_allowed: allowConv,
        status: targetStatus,
        internal_notes: internalNotes.trim() || undefined,
        attachments,
        student_ids: targetAudience === 'SPECIFIC' ? selectedStudentIds : [],
      };

      if (editingEntryId) {
        await diaryApi.updateDiaryEntry(editingEntryId, payload);
        setSuccessMsg('Diary entry updated successfully!');
      } else {
        await diaryApi.createDiaryEntry(payload);
        setSuccessMsg(publishNow ? 'Diary entry published successfully!' : 'Diary entry saved as draft.');
      }

      setComposeOpen(false);
      loadData();
    } catch (err: any) {
      setDialogError(err?.response?.data?.detail || 'Failed to save diary entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublishDraft = async (id: string) => {
    try {
      await diaryApi.publishDiaryEntry(id);
      setSuccessMsg('Draft entry published to students and parents.');
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to publish draft.');
    }
  };

  const handleViewRecipients = async (entry: DiaryEntry) => {
    setActiveEntry(entry);
    setRecipientsModalOpen(true);
    try {
      setRecipientsLoading(true);
      const res = await diaryApi.getEntryRecipients(entry.id);
      setRecipients(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load recipients list.');
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleOpenConversation = async (studentId: string, entryId: string) => {
    try {
      setConvLoading(true);
      setConvDrawerOpen(true);
      // We initiate or get the conversation ID
      const apiClient = (await import('@/lib/axios')).default;
      const convInit = await apiClient.post(`/diary/conversations?entry_id=${entryId}&student_id=${studentId}`);
      const convData = await diaryApi.getConversationDetails(convInit.data.conversation_id);
      setActiveConv(convData);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to open parent conversation thread.');
    } finally {
      setConvLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConv || !replyMessage.trim()) return;
    try {
      const newMsg = await diaryApi.postConversationMessage(activeConv.id, replyMessage.trim());
      setActiveConv({
        ...activeConv,
        messages: [...activeConv.messages, newMsg],
      });
      setReplyMessage('');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to send reply.');
    }
  };

  const handleResolveConv = async (close: boolean) => {
    if (!activeConv) return;
    try {
      await diaryApi.resolveConversation(activeConv.id, resolutionNotes.trim() || undefined, close);
      setActiveConv({
        ...activeConv,
        status: close ? 'CLOSED' : 'RESOLVED',
        resolution_notes: resolutionNotes.trim() || undefined,
      });
      setSuccessMsg(`Conversation marked as ${close ? 'Closed' : 'Resolved'}.`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to resolve conversation.');
    }
  };

  // Metrics
  const totalEntries = entries.length;
  const publishedCount = entries.filter((e) => e.status === 'PUBLISHED').length;
  const draftCount = entries.filter((e) => e.status === 'DRAFT').length;
  const ackRequiredCount = entries.filter((e) => e.requires_acknowledgement).length;

  return (
    <RequireRole roles={[ROLES.TEACHER]}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Page Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MenuBookIcon color="primary" fontSize="large" /> Digital School Diary
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Centralized classroom remarks, homework assignments, student observations, and parent communications.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleComposeOpen}
            sx={{ textTransform: 'none', px: 3, py: 1, borderRadius: 2 }}
          >
            Compose Entry
          </Button>
        </Box>

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

        {/* Metrics Row */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  TOTAL ENTRIES
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {totalEntries}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #2e7d32' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="success.main" fontWeight={600}>
                  PUBLISHED
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {publishedCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #ed6c02' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="warning.main" fontWeight={600}>
                  DRAFTS
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {draftCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #1976d2' }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="primary.main" fontWeight={600}>
                  ACK REQUIRED
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                  {ackRequiredCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filter Toolbar */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search diary title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="PUBLISHED">Published</MenuItem>
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="RETRACTED">Retracted</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                size="small"
                select
                label="Entry Type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Entry Types</MenuItem>
                {ENTRY_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button fullWidth variant="outlined" onClick={loadData} sx={{ textTransform: 'none', height: 40 }}>
                Apply
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Entries Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : entries.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <MenuBookIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary">
              No diary entries found.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create your first classroom update, homework, or behavioural remark.
            </Typography>
            <Button variant="contained" sx={{ mt: 2, textTransform: 'none' }} onClick={handleComposeOpen}>
              Compose First Entry
            </Button>
          </Paper>
        ) : isMobile ? (
          <Stack spacing={2}>
            {entries.map((entry) => {
              const typeObj = ENTRY_TYPES.find((t) => t.value === entry.entry_type) || {
                label: entry.entry_type,
                color: 'default' as any,
              };
              return (
                <Card key={entry.id} sx={{ p: 2, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={typeObj.label} size="small" color={typeObj.color as any} variant="outlined" sx={{ fontWeight: 600 }} />
                      <Chip
                        label={entry.status}
                        size="small"
                        color={entry.status === 'PUBLISHED' ? 'success' : entry.status === 'DRAFT' ? 'warning' : 'error'}
                      />
                    </Box>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                      {entry.entry_date}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                    {entry.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                    {entry.description}
                  </Typography>

                  {entry.due_date && (
                    <Typography variant="caption" color="error.main" fontWeight={600} display="block" sx={{ mb: 1 }}>
                      ⏰ Due: {entry.due_date}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                    {entry.section_name && <Chip label={`Sec: ${entry.section_name}`} size="small" variant="filled" />}
                    {entry.subject_name && <Chip label={entry.subject_name} size="small" variant="filled" />}
                    <Chip label={`${entry.read_count}/${entry.total_recipients} Read`} size="small" variant="outlined" />
                    {entry.requires_acknowledgement && (
                      <Chip label={`✍️ ${entry.acknowledged_count}/${entry.total_recipients} Signed`} size="small" color="primary" variant="outlined" />
                    )}
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewRecipients(entry)}
                      sx={{ textTransform: 'none' }}
                    >
                      Recipients
                    </Button>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton size="small" color="info" onClick={() => handleEditEntry(entry)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {entry.status === 'DRAFT' && (
                        <IconButton size="small" color="success" onClick={() => handlePublishDraft(entry.id)}>
                          <SendIcon fontSize="small" />
                        </IconButton>
                      )}
                      {entry.is_conversation_allowed && (
                        <IconButton size="small" color="secondary" onClick={() => handleViewRecipients(entry)}>
                          <ChatIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id, entry.title)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              );
            })}
          </Stack>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '100%', overflowX: 'auto' }}>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Entry Details</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type & Subject</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Visibility</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Recipients & Acks</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry) => {
                  const typeObj = ENTRY_TYPES.find((t) => t.value === entry.entry_type) || {
                    label: entry.entry_type,
                    color: 'default' as any,
                  };
                  return (
                    <TableRow key={entry.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {entry.entry_date}
                        </Typography>
                        {entry.due_date && (
                          <Typography variant="caption" color="error.main" display="block">
                            Due: {entry.due_date}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {entry.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {entry.description}
                        </Typography>
                        {entry.internal_notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                            🔒 Note: {entry.internal_notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeObj.label}
                          size="small"
                          color={typeObj.color as any}
                          variant="outlined"
                          sx={{ fontWeight: 600, mb: 0.5 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary">
                          {entry.section_name ? `Sec: ${entry.section_name}` : ''}
                          {entry.subject_name ? ` • ${entry.subject_name}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.visibility.replace(/_/g, ' ')}
                          size="small"
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {entry.read_count} / {entry.total_recipients} Read
                        </Typography>
                        {entry.requires_acknowledgement ? (
                          <Typography variant="caption" color="primary.main" fontWeight={600} display="block">
                            ✍️ {entry.acknowledged_count} / {entry.total_recipients} Acknowledged
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Ack not required
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={entry.status}
                          size="small"
                          color={
                            entry.status === 'PUBLISHED'
                              ? 'success'
                              : entry.status === 'DRAFT'
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Tooltip title="View Recipients & Read Status">
                            <IconButton size="small" color="primary" onClick={() => handleViewRecipients(entry)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {entry.is_conversation_allowed && (
                            <Tooltip title="Parent Conversations">
                              <IconButton size="small" color="secondary" onClick={() => handleViewRecipients(entry)}>
                                <ChatIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit Entry">
                            <IconButton size="small" color="info" onClick={() => handleEditEntry(entry)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {entry.status === 'DRAFT' && (
                            <Tooltip title="Publish Now">
                              <IconButton size="small" color="success" onClick={() => handlePublishDraft(entry.id)}>
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Delete Entry">
                            <IconButton size="small" color="error" onClick={() => handleDeleteEntry(entry.id, entry.title)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Compose Entry Dialog */}
        <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {editingEntryId ? 'Edit Digital Diary Entry' : 'Compose Digital Diary Entry'}
          </DialogTitle>
          <DialogContent dividers>
            {dialogError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogError(null)}>
                {dialogError}
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Entry Title"
                  placeholder="e.g. Science Lab Worksheet or Conduct Observation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Entry Type"
                  value={entryType}
                  onChange={(e) => handleEntryTypeChange(e.target.value)}
                >
                  {ENTRY_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Class Section"
                  value={selectedSection}
                  onChange={(e) => handleSectionChange(e.target.value)}
                >
                  {context?.sections.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.grade_name ? `${s.grade_name} - ` : ''}Section {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Subject (Optional)"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <MenuItem value="">-- None --</MenuItem>
                  {context?.subjects.map((sub) => (
                    <MenuItem key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Entry Date"
                  InputLabelProps={{ shrink: true }}
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Due Date (If applicable)"
                  InputLabelProps={{ shrink: true }}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Audience Visibility"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <MenuItem value="STUDENT_AND_PARENT">Student and Parent (Standard)</MenuItem>
                  <MenuItem value="PARENT_ONLY">Parent Only (Private Guardian Remark)</MenuItem>
                  <MenuItem value="STUDENT_ONLY">Student Only</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={targetAudience === 'SPECIFIC' ? 6 : 12}>
                <TextField
                  fullWidth
                  select
                  label="Audience Scope"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as any)}
                >
                  <MenuItem value="SECTION">All Students in Section</MenuItem>
                  <MenuItem value="SPECIFIC">Specific Selected Students</MenuItem>
                </TextField>
              </Grid>

              {targetAudience === 'SPECIFIC' && (
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={filteredStudents}
                    getOptionLabel={(option) => `${option.name} (${option.student_code})`}
                    value={filteredStudents.filter((st) => selectedStudentIds.includes(st.id))}
                    onChange={(_, val) => setSelectedStudentIds(val.map((v) => v.id))}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Student Recipients" placeholder="Choose students..." />
                    )}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button size="small" onClick={handleSelectAllStudents} sx={{ textTransform: 'none', py: 0 }}>
                      Select All ({filteredStudents.length})
                    </Button>
                    <Button size="small" color="secondary" onClick={handleClearSelectedStudents} sx={{ textTransform: 'none', py: 0 }}>
                      Clear
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      Selected {selectedStudentIds.length} of {filteredStudents.length} students
                    </Typography>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Detailed Description / Instruction"
                  placeholder="Write detailed classroom instructions, homework specifics, or student observations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </Grid>

              {/* Attachments & Study Resources Section */}
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <AttachFileIcon fontSize="small" color="primary" /> Attachments & Reference Materials (Optional)
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Document / Resource Name"
                        placeholder="e.g. Exercise_2.1_Worksheet.pdf"
                        value={newAttachmentName}
                        onChange={(e) => setNewAttachmentName(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Resource Link / URL"
                        placeholder="e.g. /files/exercise2.1.pdf or https://..."
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddAttachment}
                        disabled={!newAttachmentName.trim() || !newAttachmentUrl.trim()}
                        sx={{ textTransform: 'none', py: 0.8 }}
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>

                  {attachments.length > 0 && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                      {attachments.map((att, idx) => (
                        <Chip
                          key={idx}
                          icon={<DescriptionIcon fontSize="small" />}
                          label={att.name}
                          onDelete={() => handleRemoveAttachment(idx)}
                          color="primary"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Stack>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Internal Teacher & Admin Notes (Private)"
                  placeholder="Optional private remarks never visible to student or parent..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={<Checkbox checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />}
                    label="Require Parent Signature / Acknowledgement"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={allowConv} onChange={(e) => setAllowConv(e.target.checked)} />}
                    label="Allow Parent Reply & Two-Way Discussion"
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setComposeOpen(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            {(!editingEntryId || entries.find((e) => e.id === editingEntryId)?.status === 'DRAFT') && (
              <Button
                variant="outlined"
                onClick={() => handleSaveEntry(false)}
                disabled={submitting}
                sx={{ textTransform: 'none' }}
              >
                Save as Draft
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => handleSaveEntry(true)}
              disabled={submitting}
              sx={{ textTransform: 'none' }}
            >
              {submitting ? 'Saving...' : editingEntryId ? 'Update Entry' : 'Publish Entry'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Recipients Inspection Modal */}
        <Dialog open={recipientsModalOpen} onClose={() => setRecipientsModalOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Recipients: {activeEntry?.title}
          </DialogTitle>
          <DialogContent dividers>
            {recipientsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Student Code</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Read by Student</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Parent Acknowledgement</TableCell>
                      <TableCell sx={{ fontWeight: 600 }} align="right">Conversation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recipients.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{r.student_name}</TableCell>
                        <TableCell>{r.student_code || '-'}</TableCell>
                        <TableCell>
                          {r.is_read ? (
                            <Chip label={`Read ${r.read_at?.slice(0, 10) || ''}`} size="small" color="success" />
                          ) : (
                            <Chip label="Unread" size="small" variant="outlined" />
                          )}
                        </TableCell>
                        <TableCell>
                          {r.is_acknowledged ? (
                            <Chip
                              label={`Signed by ${r.parent_name || 'Parent'}`}
                              size="small"
                              color="primary"
                              icon={<CheckCircleIcon />}
                            />
                          ) : activeEntry?.requires_acknowledgement ? (
                            <Chip label="Pending Ack" size="small" color="warning" />
                          ) : (
                            <Typography variant="caption" color="text.secondary">Not required</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {activeEntry?.is_conversation_allowed && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ChatIcon />}
                              onClick={() => {
                                setRecipientsModalOpen(false);
                                handleOpenConversation(r.student_id, activeEntry.id);
                              }}
                              sx={{ textTransform: 'none' }}
                            >
                              Open Thread
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRecipientsModalOpen(false)}>Close</Button>
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
                Parent Communication
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Student: {activeConv?.student_name} • Parent: {activeConv?.parent_name}
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
              {/* Status bar */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip
                  label={`Status: ${activeConv.status}`}
                  size="small"
                  color={activeConv.status === 'OPEN' ? 'primary' : 'success'}
                />
                {activeConv.status === 'OPEN' && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleResolveConv(false)}
                    sx={{ textTransform: 'none' }}
                  >
                    Mark as Resolved
                  </Button>
                )}
              </Box>

              {/* Messages list */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
                {activeConv.messages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                    No messages exchanged yet.
                  </Typography>
                ) : (
                  activeConv.messages.map((m) => {
                    const isTeacher = m.sender_role === 'TEACHER';
                    return (
                      <Box
                        key={m.id}
                        sx={{
                          mb: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isTeacher ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            maxWidth: '85%',
                            backgroundColor: isTeacher ? 'primary.main' : 'action.hover',
                            color: isTeacher ? 'primary.contrastText' : 'text.primary',
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

              {/* Reply Input */}
              {activeConv.status !== 'CLOSED' ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a response to parent..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <IconButton color="primary" onClick={handleSendMessage} disabled={!replyMessage.trim()}>
                    <SendIcon />
                  </IconButton>
                </Box>
              ) : (
                <Alert severity="info">This conversation thread has been closed.</Alert>
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
    </RequireRole>
  );
}
