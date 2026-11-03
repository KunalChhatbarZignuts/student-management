'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Switch from '@mui/material/Switch';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';
import Autocomplete from '@mui/material/Autocomplete';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import AppDatePicker from '@/components/ui/AppDatePicker';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InputAdornment from '@mui/material/InputAdornment';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/Key';
import AutoRenewIcon from '@mui/icons-material/Autorenew';
import PersonIcon from '@mui/icons-material/Person';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import SchoolIcon from '@mui/icons-material/School';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LaunchIcon from '@mui/icons-material/Launch';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { ROLES } from '@/lib/constants';
import { adminGradeApi } from '@/features/grades/api';
import { adminParentApi, ParentWithChildren } from '@/features/parents/api';
import { adminAdmissionApi } from '@/features/admissions/api';
import { adminFeeApi, StudentFeeAdjustmentItem } from '@/features/fees/api';
import {
  AdmissionCreateRequest,
  AdmissionResponse,
  AdmissionParentPayload,
} from '@/features/admissions/types';

function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const num = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + num + special;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += num[Math.floor(Math.random() * num.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 10; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd;
}

interface ParentFormItem {
  id: string;
  isExisting: boolean;
  existingParent: ParentWithChildren | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  relationshipType: string;
  isPrimaryGuardian: boolean;
  password: string;
}

const STEPS = [
  'Student Personal Details',
  'Parent & Guardian Details',
  'Academic Placement & Teacher Assignment',
  'Fee Configuration & Adjustments',
  'Account Setup & Review',
];

export default function StudentAdmissionWizardPage() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = React.useState<number>(0);

  // --- Step 0: Student Personal Details State ---
  const [studentData, setStudentData] = React.useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dob: '',
    gender: 'Male',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    previousSchoolName: '',
    previousSchoolDetails: '',
  });

  // --- Step 1: Parent & Guardian Details State ---
  const [parents, setParents] = React.useState<ParentFormItem[]>([
    {
      id: 'parent-0',
      isExisting: false,
      existingParent: null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      relationshipType: 'Father',
      isPrimaryGuardian: true,
      password: generateSecurePassword(),
    },
  ]);

  // Autocomplete search term for existing parents
  const [parentSearchQuery, setParentSearchQuery] = React.useState('');
  const { data: searchParentsResult, isFetching: searchingParents } = useQuery({
    queryKey: ['parents', 'search-autocomplete', parentSearchQuery],
    queryFn: () => adminParentApi.listParents({ search: parentSearchQuery, limit: 15 }),
    enabled: parentSearchQuery.trim().length > 1,
  });

  // --- Step 2: Academic Details State ---
  const [selectedAcademicYearId, setSelectedAcademicYearId] = React.useState<string>('');
  const [selectedGradeId, setSelectedGradeId] = React.useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>('');
  const [admissionDate, setAdmissionDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = React.useState<string>('');

  // Queries for academic cascading dropdowns
  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: adminGradeApi.listAcademicYears,
  });

  // Auto-select active academic year
  React.useEffect(() => {
    if (academicYears.length > 0 && !selectedAcademicYearId) {
      const activeYear = academicYears.find((ay) => ay.is_current) || academicYears[0];
      setSelectedAcademicYearId(activeYear.id);
    }
  }, [academicYears, selectedAcademicYearId]);

  const { data: gradesData, isLoading: loadingGrades } = useQuery({
    queryKey: ['grades', { academic_year_id: selectedAcademicYearId }],
    queryFn: () =>
      adminGradeApi.listGrades({
        academic_year_id: selectedAcademicYearId || undefined,
        status: 'active',
        size: 100,
      }),
    enabled: Boolean(selectedAcademicYearId),
  });
  const grades = gradesData?.items || [];

  const { data: sections = [], isLoading: loadingSections } = useQuery({
    queryKey: ['sections', selectedGradeId],
    queryFn: () => adminGradeApi.getGradeSections(selectedGradeId),
    enabled: Boolean(selectedGradeId),
  });

  // Query section class teacher
  const { data: sectionTeacher, isLoading: loadingSectionTeacher } = useQuery({
    queryKey: ['section-teacher', selectedSectionId],
    queryFn: () => adminGradeApi.getSectionTeacher(selectedSectionId),
    enabled: Boolean(selectedSectionId),
  });

  const selectedGrade = grades.find((g) => g.id === selectedGradeId);
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  // --- Step 3: Fee Configuration & Adjustments State ---
  const [selectedComponentIds, setSelectedComponentIds] = React.useState<string[]>([]);
  const [adjustments, setAdjustments] = React.useState<StudentFeeAdjustmentItem[]>([]);
  const [installmentFrequency, setInstallmentFrequency] = React.useState<string>('annual');
  const [enableFeeAssignment, setEnableFeeAssignment] = React.useState<boolean>(true);

  // Query Grade Fee Structure
  const { data: activeFeeStructure, isLoading: loadingFeeStructure } = useQuery({
    queryKey: ['fees', 'active-structure', selectedGradeId, selectedAcademicYearId],
    queryFn: () => adminFeeApi.getActiveStructure(selectedGradeId, selectedAcademicYearId),
    enabled: Boolean(selectedGradeId && selectedAcademicYearId),
  });

  // Pre-select mandatory components when fee structure loads
  React.useEffect(() => {
    if (activeFeeStructure && activeFeeStructure.items) {
      const mandatoryIds = activeFeeStructure.items
        .filter((it) => it.is_mandatory)
        .map((it) => it.fee_component_id);
      setSelectedComponentIds(mandatoryIds);
    } else {
      setSelectedComponentIds([]);
    }
  }, [activeFeeStructure]);

  // Compute live fee amounts
  const computedFees = React.useMemo(() => {
    if (!activeFeeStructure || !activeFeeStructure.items) {
      return { base: 0, discounts: 0, additional: 0, final: 0, installments: [] };
    }

    const selSet = new Set(selectedComponentIds);
    let base = 0;
    activeFeeStructure.items.forEach((it) => {
      if (it.is_mandatory || selSet.has(it.fee_component_id)) {
        base += Number(it.amount);
      }
    });

    let discounts = 0;
    let additional = 0;
    adjustments.forEach((adj) => {
      let adjAmt = 0;
      if (adj.calculation_type === 'percentage') {
        const rate = Number(adj.rate) || 0;
        adjAmt = Math.round((base * rate) / 100);
      } else {
        adjAmt = Number(adj.amount) || 0;
      }

      if (adj.category === 'discount' || adj.category === 'concession') {
        discounts += adjAmt;
      } else if (adj.category === 'additional_charge') {
        additional += adjAmt;
      }
    });

    const final = Math.max(0, base - discounts + additional);

    // Installments preview
    const insts: { number: number; name: string; amount: number }[] = [];
    if (installmentFrequency === 'one_time' || installmentFrequency === 'annual') {
      insts.push({ number: 1, name: 'Full / Annual Payment', amount: final });
    } else if (installmentFrequency === 'half_yearly') {
      const p1 = Math.round(final / 2);
      const p2 = final - p1;
      insts.push({ number: 1, name: 'Term 1 (At Admission)', amount: p1 });
      insts.push({ number: 2, name: 'Term 2', amount: p2 });
    } else if (installmentFrequency === 'quarterly') {
      const p = Math.round(final / 4);
      const rem = final - p * 3;
      for (let q = 1; q <= 4; q++) {
        insts.push({ number: q, name: `Quarter ${q}`, amount: q < 4 ? p : rem });
      }
    } else if (installmentFrequency === 'monthly') {
      const months = 10;
      const p = Math.round(final / months);
      const rem = final - p * (months - 1);
      for (let m = 1; m <= months; m++) {
        insts.push({ number: m, name: `Month ${m}`, amount: m < months ? p : rem });
      }
    }

    return { base, discounts, additional, final, installments: insts };
  }, [activeFeeStructure, selectedComponentIds, adjustments, installmentFrequency]);

  // Add / Remove Adjustment handlers
  const handleAddAdjustment = () => {
    setAdjustments((prev) => [
      ...prev,
      {
        adjustment_type: 'DISCOUNT_FIXED',
        category: 'discount',
        description: '',
        calculation_type: 'fixed',
        rate: null,
        amount: 1000,
      },
    ]);
  };

  const handleRemoveAdjustment = (idx: number) => {
    setAdjustments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateAdjustment = (idx: number, updates: Partial<StudentFeeAdjustmentItem>) => {
    setAdjustments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...updates };
      // Sync category with adjustment type
      if (updates.adjustment_type) {
        if (updates.adjustment_type.startsWith('CONCESSION')) {
          next[idx].category = 'concession';
        } else if (updates.adjustment_type.startsWith('DISCOUNT')) {
          next[idx].category = 'discount';
        } else {
          next[idx].category = 'additional_charge';
        }
      }
      return next;
    });
  };

  // --- Step 4: Account Setup State ---
  const [createStudentAccount, setCreateStudentAccount] = React.useState<boolean>(true);
  const [studentPassword, setStudentPassword] = React.useState<string>(generateSecurePassword());

  // --- Step 5: Admission Success Result State ---
  const [admissionResult, setAdmissionResult] = React.useState<AdmissionResponse | null>(null);

  // Submit Mutation
  const createAdmissionMutation = useMutation({
    mutationFn: (payload: AdmissionCreateRequest) => adminAdmissionApi.createAdmission(payload),
    onSuccess: (data) => {
      setAdmissionResult(data);
      setActiveStep(STEPS.length); // step index 5 is the success screen
      showSnackbar(`Admission successful! Enrollment No: ${data.student.enrollment_number}`, 'success');
    },
    onError: (err) => {
      showSnackbar(formatErrorMessage(err, 'Failed to complete admission'), 'error');
    },
  });

  // Step 0 Validation
  const validateStep0 = (): boolean => {
    if (!studentData.firstName.trim()) {
      showSnackbar('Student First Name is required', 'error');
      return false;
    }
    if (!studentData.lastName.trim()) {
      showSnackbar('Student Last Name is required', 'error');
      return false;
    }
    if (!studentData.dob) {
      showSnackbar('Student Date of Birth is required', 'error');
      return false;
    }
    if (!studentData.gender) {
      showSnackbar('Student Gender is required', 'error');
      return false;
    }
    if (studentData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.email)) {
      showSnackbar('Please enter a valid student email address', 'error');
      return false;
    }
    return true;
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (parents.length === 0) {
      showSnackbar('At least one parent or guardian must be added', 'error');
      return false;
    }

    let hasPrimary = false;
    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      if (p.isPrimaryGuardian) hasPrimary = true;

      if (p.isExisting) {
        if (!p.existingParent) {
          showSnackbar(`Parent #${i + 1}: Please select an existing parent from the search list`, 'error');
          return false;
        }
      } else {
        if (!p.firstName.trim() || !p.lastName.trim()) {
          showSnackbar(`Parent #${i + 1}: First and Last Name are required`, 'error');
          return false;
        }
        if (!p.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
          showSnackbar(`Parent #${i + 1}: A valid email address is required`, 'error');
          return false;
        }
      }
    }

    if (!hasPrimary) {
      showSnackbar('Please designate one parent or guardian as the Primary Guardian', 'warning');
      return false;
    }

    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!selectedAcademicYearId) {
      showSnackbar('Please select an Academic Year', 'error');
      return false;
    }
    if (!selectedGradeId) {
      showSnackbar('Please select a Grade', 'error');
      return false;
    }
    if (!selectedSectionId) {
      showSnackbar('Please select a Section', 'error');
      return false;
    }
    if (!admissionDate) {
      showSnackbar('Please specify an Admission Date', 'error');
      return false;
    }
    return true;
  };

  // Step 3 Validation (Fee Configuration)
  const validateStep3 = (): boolean => {
    if (!enableFeeAssignment) return true;

    for (let i = 0; i < adjustments.length; i++) {
      const adj = adjustments[i];
      if (!adj.description.trim()) {
        showSnackbar(`Adjustment #${i + 1}: A description/reason is required`, 'error');
        return false;
      }
      if (adj.calculation_type === 'percentage') {
        const rate = Number(adj.rate) || 0;
        if (rate <= 0 || rate > 100) {
          showSnackbar(`Adjustment #${i + 1}: Percentage rate must be between 1% and 100%`, 'error');
          return false;
        }
      } else {
        if (Number(adj.amount) <= 0) {
          showSnackbar(`Adjustment #${i + 1}: Amount must be greater than ₹0`, 'error');
          return false;
        }
      }
    }

    if (computedFees.discounts > computedFees.base) {
      showSnackbar('Total discounts and concessions cannot exceed the base fee', 'error');
      return false;
    }

    return true;
  };

  // Handle Next
  const handleNext = () => {
    if (activeStep === 0) {
      if (!validateStep0()) return;
    } else if (activeStep === 1) {
      if (!validateStep1()) return;
    } else if (activeStep === 2) {
      if (!validateStep2()) return;
    } else if (activeStep === 3) {
      if (!validateStep3()) return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  // Add / Remove Parent
  const handleAddParent = () => {
    const newId = `parent-${Date.now()}`;
    setParents((prev) => [
      ...prev,
      {
        id: newId,
        isExisting: false,
        existingParent: null,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: studentData.address,
        relationshipType: prev.length === 1 ? 'Mother' : 'Guardian',
        isPrimaryGuardian: false,
        password: generateSecurePassword(),
      },
    ]);
  };

  const handleRemoveParent = (index: number) => {
    if (parents.length <= 1) return;
    const removed = parents[index];
    const updated = parents.filter((_, i) => i !== index);
    if (removed.isPrimaryGuardian && updated.length > 0) {
      updated[0].isPrimaryGuardian = true;
    }
    setParents(updated);
  };

  const handleUpdateParent = (index: number, updates: Partial<ParentFormItem>) => {
    setParents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSetPrimaryGuardian = (index: number) => {
    setParents((prev) =>
      prev.map((p, i) => ({
        ...p,
        isPrimaryGuardian: i === index,
      }))
    );
  };

  // Submit Admission
  const handleSubmitAdmission = () => {
    const parentPayloads: AdmissionParentPayload[] = parents.map((p) => {
      if (p.isExisting && p.existingParent) {
        return {
          existing_parent_id: p.existingParent.id,
          relationship_type: p.relationshipType,
          is_primary_guardian: p.isPrimaryGuardian,
        };
      }
      return {
        first_name: p.firstName.trim(),
        last_name: p.lastName.trim(),
        email: p.email.trim().toLowerCase(),
        phone: p.phone.trim() || undefined,
        address: p.address.trim() || undefined,
        relationship_type: p.relationshipType,
        is_primary_guardian: p.isPrimaryGuardian,
        password: p.password,
      };
    });

    const payload: AdmissionCreateRequest = {
      student: {
        first_name: studentData.firstName.trim(),
        middle_name: studentData.middleName.trim() || undefined,
        last_name: studentData.lastName.trim(),
        dob: studentData.dob,
        gender: studentData.gender,
        email: studentData.email.trim() ? studentData.email.trim().toLowerCase() : undefined,
        phone: studentData.phone.trim() || undefined,
        alternate_phone: studentData.alternatePhone.trim() || undefined,
        address: studentData.address.trim() || undefined,
        city: studentData.city.trim() || undefined,
        state: studentData.state.trim() || undefined,
        country: studentData.country.trim() || undefined,
        postal_code: studentData.postalCode.trim() || undefined,
        previous_school_name: studentData.previousSchoolName.trim() || undefined,
        previous_school_details: studentData.previousSchoolDetails.trim() || undefined,
        password: createStudentAccount ? studentPassword : undefined,
      },
      parents: parentPayloads,
      academic_year_id: selectedAcademicYearId,
      grade_id: selectedGradeId,
      section_id: selectedSectionId,
      admission_date: admissionDate,
      create_student_account: createStudentAccount,
      notes: notes.trim() || undefined,
      fee_assignment:
        enableFeeAssignment && activeFeeStructure
          ? {
              fee_structure_id: activeFeeStructure.id,
              selected_component_ids: selectedComponentIds,
              adjustments: adjustments.map((a) => ({
                ...a,
                description: a.description.trim(),
                rate: a.calculation_type === 'percentage' ? Number(a.rate) : null,
                amount: a.calculation_type === 'fixed' ? Number(a.amount) : 0,
              })),
              installment_frequency: installmentFrequency,
            }
          : undefined,
    };

    createAdmissionMutation.mutate(payload);
  };

  // Copy Credentials Helper
  const handleCopyCredentials = () => {
    if (!admissionResult) return;
    let text = `=== STUDENT ADMISSION CREDENTIALS ===\n`;
    text += `Student Name: ${admissionResult.student.first_name} ${admissionResult.student.last_name}\n`;
    text += `Enrollment Number: ${admissionResult.student.enrollment_number}\n`;
    text += `Student Code: ${admissionResult.student.student_code}\n`;
    text += `Admission Number: ${admissionResult.admission_number}\n`;
    text += `Class: ${admissionResult.academic.grade_name} - ${admissionResult.academic.section_name}\n\n`;

    if (admissionResult.fee_assignment) {
      text += `--- Fee Assignment ---\n`;
      text += `Payable Amount: ₹${Number(admissionResult.fee_assignment.final_payable_amount).toLocaleString()}\n`;
      text += `Installments: ${admissionResult.fee_assignment.installments.length} parts (${admissionResult.fee_assignment.installment_frequency})\n\n`;
    }

    if (admissionResult.student_account.initial_password) {
      text += `--- Student Login Credentials ---\n`;
      text += `Login ID / Enrollment No: ${admissionResult.student.enrollment_number}\n`;
      text += `Email: ${admissionResult.student_account.email}\n`;
      text += `Initial Password: ${admissionResult.student_account.initial_password}\n\n`;
    }

    if (admissionResult.parents.length > 0) {
      text += `--- Parent Login Credentials ---\n`;
      admissionResult.parents.forEach((p, idx) => {
        text += `Parent #${idx + 1}: ${p.first_name} ${p.last_name} (${p.relationship_type})\n`;
        text += `Email: ${p.email}\n`;
        if (p.initial_password) {
          text += `Initial Password: ${p.initial_password}\n`;
        } else {
          text += `Account Status: Existing / Active Account\n`;
        }
        text += `\n`;
      });
    }

    text += `Portal Login URL: http://localhost:3001/login\n`;

    navigator.clipboard.writeText(text);
    showSnackbar('All credentials and admission details copied to clipboard!', 'success');
  };

  // Reset for another admission
  const handleAdmitAnother = () => {
    setStudentData({
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      gender: 'Male',
      email: '',
      phone: '',
      alternatePhone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      previousSchoolName: '',
      previousSchoolDetails: '',
    });
    setParents([
      {
        id: `parent-${Date.now()}`,
        isExisting: false,
        existingParent: null,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        relationshipType: 'Father',
        isPrimaryGuardian: true,
        password: generateSecurePassword(),
      },
    ]);
    setSelectedGradeId('');
    setSelectedSectionId('');
    setNotes('');
    setAdjustments([]);
    setStudentPassword(generateSecurePassword());
    setAdmissionResult(null);
    setActiveStep(0);
  };

  return (
    <RequireRole roles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
      <AppShell>
        <Box sx={{ maxWidth: 1100, mx: 'auto', py: 2 }}>
          {/* Header */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Button
                component={Link}
                href="/students"
                variant="text"
                size="small"
                startIcon={<ArrowBackIcon />}
                sx={{ textTransform: 'none' }}
              >
                Back to Students
              </Button>
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Student Admission Wizard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete student registration, parent relationships, academic placement, fee schedules, and portal credentials in one unified workflow.
            </Typography>
          </Box>

          {/* Stepper Header (Only shown during active steps) */}
          {activeStep < STEPS.length && (
            <Card sx={{ mb: 4, p: 2 }}>
              <Stepper activeStep={activeStep} alternativeLabel>
                {STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Card>
          )}

          {/* Step 0: Student Personal Details */}
          {activeStep === 0 && (
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <PersonIcon color="primary" sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight={700}>
                  Step 1: Student Personal Information
                </Typography>
              </Box>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="First Name"
                    required
                    fullWidth
                    value={studentData.firstName}
                    onChange={(e) => setStudentData({ ...studentData, firstName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Middle Name"
                    fullWidth
                    value={studentData.middleName}
                    onChange={(e) => setStudentData({ ...studentData, middleName: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Last Name"
                    required
                    fullWidth
                    value={studentData.lastName}
                    onChange={(e) => setStudentData({ ...studentData, lastName: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <AppDatePicker
                    label="Date of Birth"
                    required
                    value={studentData.dob}
                    onChange={(val) => setStudentData({ ...studentData, dob: val })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      label="Gender"
                      value={studentData.gender}
                      onChange={(e) => setStudentData({ ...studentData, gender: e.target.value })}
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Student Email (Optional)"
                    type="email"
                    fullWidth
                    placeholder="student@school.edu"
                    helperText="If omitted, an institutional login identifier will be automatically generated."
                    value={studentData.email}
                    onChange={(e) => setStudentData({ ...studentData, email: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    placeholder="+1 555-0100"
                    value={studentData.phone}
                    onChange={(e) => setStudentData({ ...studentData, phone: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Alternate Phone"
                    fullWidth
                    value={studentData.alternatePhone}
                    onChange={(e) => setStudentData({ ...studentData, alternatePhone: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Address & Location" size="small" />
                  </Divider>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Street Address"
                    fullWidth
                    value={studentData.address}
                    onChange={(e) => setStudentData({ ...studentData, address: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    label="City"
                    fullWidth
                    value={studentData.city}
                    onChange={(e) => setStudentData({ ...studentData, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="State / Province"
                    fullWidth
                    value={studentData.state}
                    onChange={(e) => setStudentData({ ...studentData, state: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Country"
                    fullWidth
                    value={studentData.country}
                    onChange={(e) => setStudentData({ ...studentData, country: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    label="Postal Code"
                    fullWidth
                    value={studentData.postalCode}
                    onChange={(e) => setStudentData({ ...studentData, postalCode: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="Previous Academic Background" size="small" />
                  </Divider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Previous School Name"
                    fullWidth
                    placeholder="e.g. St. Mary's Elementary"
                    value={studentData.previousSchoolName}
                    onChange={(e) => setStudentData({ ...studentData, previousSchoolName: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Previous School Details / Remarks"
                    fullWidth
                    placeholder="Grades attended, transfer certificate info..."
                    value={studentData.previousSchoolDetails}
                    onChange={(e) => setStudentData({ ...studentData, previousSchoolDetails: e.target.value })}
                  />
                </Grid>
              </Grid>

              {/* Step Navigation */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
                <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardIcon />}>
                  Continue to Parent Details
                </Button>
              </Box>
            </Card>
          )}

          {/* Step 1: Parent & Guardian Details */}
          {activeStep === 1 && (
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <FamilyRestroomIcon color="primary" sx={{ fontSize: 28 }} />
                  <div>
                    <Typography variant="h6" fontWeight={700}>
                      Step 2: Parent & Guardian Details
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Link one or more parents/guardians. You can link existing parents or provision new accounts.
                    </Typography>
                  </div>
                </Box>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddParent}>
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Parent / Guardian #{index + 1}
                      </Typography>
                      {p.isPrimaryGuardian && <Chip label="Primary Guardian" color="primary" size="small" />}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Radio checked={p.isPrimaryGuardian} onChange={() => handleSetPrimaryGuardian(index)} />
                        }
                        label="Set as Primary"
                      />
                      {parents.length > 1 && (
                        <IconButton color="error" size="small" onClick={() => handleRemoveParent(index)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <RadioGroup
                    row
                    value={p.isExisting ? 'existing' : 'new'}
                    onChange={(e) => handleUpdateParent(index, { isExisting: e.target.value === 'existing' })}
                    sx={{ mb: 2 }}
                  >
                    <FormControlLabel value="new" control={<Radio />} label="Create New Parent Account" />
                    <FormControlLabel value="existing" control={<Radio />} label="Select Existing Parent" />
                  </RadioGroup>

                  {p.isExisting ? (
                    <Box sx={{ mb: 2 }}>
                      <Autocomplete
                        options={searchParentsResult?.items || []}
                        getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.email})`}
                        value={p.existingParent}
                        loading={searchingParents}
                        onInputChange={(_, value) => setParentSearchQuery(value)}
                        onChange={(_, value) => handleUpdateParent(index, { existingParent: value })}
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
                                  {searchingParents ? <CircularProgress color="inherit" size={20} /> : null}
                                  {params.InputProps.endAdornment}
                                </>
                              ),
                            }}
                          />
                        )}
                      />

                      {p.existingParent && (
                        <Alert severity="success" sx={{ mt: 1.5 }}>
                          Selected: <strong>{p.existingParent.first_name} {p.existingParent.last_name}</strong> ({p.existingParent.email}) — Phone: {p.existingParent.phone || 'N/A'} — Status: {p.existingParent.user_status}
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
                          onChange={(e) => handleUpdateParent(index, { firstName: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Last Name"
                          required
                          fullWidth
                          value={p.lastName}
                          onChange={(e) => handleUpdateParent(index, { lastName: e.target.value })}
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
                          onChange={(e) => handleUpdateParent(index, { email: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Phone Number"
                          fullWidth
                          placeholder="+1 555-0199"
                          value={p.phone}
                          onChange={(e) => handleUpdateParent(index, { phone: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Residential Address"
                          fullWidth
                          value={p.address}
                          onChange={(e) => handleUpdateParent(index, { address: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            label="Initial Portal Password"
                            fullWidth
                            value={p.password}
                            onChange={(e) => handleUpdateParent(index, { password: e.target.value })}
                          />
                          <Tooltip title="Generate secure password">
                            <IconButton
                              color="primary"
                              onClick={() => handleUpdateParent(index, { password: generateSecurePassword() })}
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
                          onChange={(e) => handleUpdateParent(index, { relationshipType: e.target.value })}
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
                <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                  Back
                </Button>
                <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardIcon />}>
                  Continue to Academic Assignment
                </Button>
              </Box>
            </Card>
          )}

          {/* Step 2: Academic Details & Teacher Assignment */}
          {activeStep === 2 && (
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
                <div>
                  <Typography variant="h6" fontWeight={700}>
                    Step 3: Academic Placement & Class Teacher
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select the academic session, grade, and section.
                  </Typography>
                </div>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required>
                    <InputLabel>Academic Year</InputLabel>
                    <Select
                      label="Academic Year"
                      value={selectedAcademicYearId}
                      onChange={(e) => {
                        setSelectedAcademicYearId(e.target.value);
                        setSelectedGradeId('');
                        setSelectedSectionId('');
                      }}
                    >
                      {academicYears.map((ay) => (
                        <MenuItem key={ay.id} value={ay.id}>
                          {ay.name} {ay.is_current ? ' (Current Active)' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required disabled={!selectedAcademicYearId || loadingGrades}>
                    <InputLabel>Grade / Level</InputLabel>
                    <Select
                      label="Grade / Level"
                      value={selectedGradeId}
                      onChange={(e) => {
                        setSelectedGradeId(e.target.value);
                        setSelectedSectionId('');
                      }}
                    >
                      {grades.map((g) => (
                        <MenuItem key={g.id} value={g.id}>
                          {g.name} (Level {g.level})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth required disabled={!selectedGradeId || loadingSections}>
                    <InputLabel>Section</InputLabel>
                    <Select
                      label="Section"
                      value={selectedSectionId}
                      onChange={(e) => setSelectedSectionId(e.target.value)}
                    >
                      {sections.map((s) => (
                        <MenuItem key={s.id} value={s.id}>
                          Section {s.name} ({s.total_students ?? 0} / {s.class_capacity ?? 'unlimited'} enrolled)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <AppDatePicker
                    label="Official Admission Date"
                    required
                    value={admissionDate}
                    onChange={(val) => setAdmissionDate(val)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Admission Notes / Remarks"
                    fullWidth
                    placeholder="e.g. Merit scholar, sibling discount..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid>

                {selectedSectionId && (
                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                            SECTION CLASS TEACHER
                          </Typography>
                          {loadingSectionTeacher ? (
                            <CircularProgress size={24} />
                          ) : sectionTeacher && sectionTeacher.teacher_name ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <CheckCircleIcon color="success" />
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {sectionTeacher.teacher_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Emp Code: {sectionTeacher.employee_code || 'N/A'} • Assigned Role: {sectionTeacher.assignment_type}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Alert severity="warning" sx={{ py: 0.5 }}>
                              No active class teacher assigned to Section {selectedSection?.name}.
                            </Alert>
                          )}
                        </Paper>
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                            GRADE COORDINATOR
                          </Typography>
                          {selectedGrade?.coordinator_name ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <CheckCircleIcon color="primary" />
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                  {selectedGrade.coordinator_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Coordinator for Grade {selectedGrade.name}
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No coordinator currently configured for this grade level.
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                  Back
                </Button>
                <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardIcon />}>
                  Continue to Fee Configuration
                </Button>
              </Box>
            </Card>
          )}

          {/* Step 3: Fee Configuration & Adjustments (NEW) */}
          {activeStep === 3 && (
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 28 }} />
                  <div>
                    <Typography variant="h6" fontWeight={700}>
                      Step 4: Grade Fee Configuration & Adjustments
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Grade-level fee plan automatically resolved. Configure optional fees, scholarships, and installment schedules.
                    </Typography>
                  </div>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={enableFeeAssignment}
                      onChange={(e) => setEnableFeeAssignment(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={enableFeeAssignment ? 'Fee Assignment Active' : 'Skip Fee Assignment'}
                />
              </Box>

              {loadingFeeStructure ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : !activeFeeStructure ? (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  No active fee structure is currently configured for <strong>{selectedGrade?.name || 'Selected Grade'}</strong> in this academic year. You can still complete admission without a fee schedule, or configure a fee plan under <strong>Fee Management</strong>.
                </Alert>
              ) : (
                enableFeeAssignment && (
                  <Box>
                    {/* Structure Details Card */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {activeFeeStructure.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Applicable for: Grade {selectedGrade?.name} • Session: {activeFeeStructure.academic_year_name}
                          </Typography>
                        </Box>
                        <Chip label="Grade-Wise Plan Active" color="success" size="small" />
                      </Box>
                    </Paper>

                    {/* Components Selection Table */}
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Fee Components & Optional Add-ons
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                          <TableRow>
                            <TableCell padding="checkbox">Include</TableCell>
                            <TableCell>Component</TableCell>
                            <TableCell>Frequency</TableCell>
                            <TableCell>Nature</TableCell>
                            <TableCell align="right">Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {activeFeeStructure.items.map((it) => {
                            const isMandatory = it.is_mandatory;
                            const isChecked = isMandatory || selectedComponentIds.includes(it.fee_component_id);
                            return (
                              <TableRow key={it.id} hover>
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={isChecked}
                                    disabled={isMandatory}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedComponentIds([...selectedComponentIds, it.fee_component_id]);
                                      } else {
                                        setSelectedComponentIds(
                                          selectedComponentIds.filter((id) => id !== it.fee_component_id)
                                        );
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>{it.component_name || 'Component'}</TableCell>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{it.payment_frequency}</TableCell>
                                <TableCell>
                                  {isMandatory ? (
                                    <Chip label="Mandatory" size="small" color="primary" variant="outlined" />
                                  ) : (
                                    <Chip label="Optional Add-on" size="small" variant="outlined" />
                                  )}
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>
                                  ₹{Number(it.amount).toLocaleString()}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Individual Student Fee Adjustments */}
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <div>
                          <Typography variant="subtitle2" fontWeight={700}>
                            Individual Student Fee Adjustments
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Apply scholarships, sibling discounts, or custom additional charges.
                          </Typography>
                        </div>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={handleAddAdjustment}
                        >
                          Add Adjustment
                        </Button>
                      </Box>

                      {adjustments.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                          <Typography variant="body2">No individual adjustments applied for this student.</Typography>
                        </Paper>
                      ) : (
                        adjustments.map((adj, idx) => (
                          <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} sm={3}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Adjustment Type</InputLabel>
                                  <Select
                                    label="Adjustment Type"
                                    value={adj.adjustment_type}
                                    onChange={(e) =>
                                      handleUpdateAdjustment(idx, { adjustment_type: e.target.value })
                                    }
                                  >
                                    <MenuItem value="DISCOUNT_FIXED">Discount (Fixed ₹)</MenuItem>
                                    <MenuItem value="DISCOUNT_PERCENTAGE">Discount (Percentage %)</MenuItem>
                                    <MenuItem value="CONCESSION_SCHOLARSHIP">Scholarship Concession</MenuItem>
                                    <MenuItem value="CONCESSION_FINANCIAL">Financial Concession</MenuItem>
                                    <MenuItem value="CONCESSION_SPECIAL">Special Institutional Concession</MenuItem>
                                    <MenuItem value="ADDITIONAL_CHARGE">Additional Charge</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>

                              <Grid item xs={12} sm={2}>
                                {adj.calculation_type === 'percentage' || adj.adjustment_type === 'DISCOUNT_PERCENTAGE' ? (
                                  <TextField
                                    label="Rate (%)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={adj.rate ?? ''}
                                    onChange={(e) =>
                                      handleUpdateAdjustment(idx, {
                                        calculation_type: 'percentage',
                                        rate: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    InputProps={{
                                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                    }}
                                  />
                                ) : (
                                  <TextField
                                    label="Amount (₹)"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={adj.amount}
                                    onChange={(e) =>
                                      handleUpdateAdjustment(idx, {
                                        calculation_type: 'fixed',
                                        amount: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                    }}
                                  />
                                )}
                              </Grid>

                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="Reason / Description (Mandatory)"
                                  required
                                  size="small"
                                  fullWidth
                                  placeholder="e.g. Merit scholarship 10%, sibling discount..."
                                  value={adj.description}
                                  onChange={(e) => handleUpdateAdjustment(idx, { description: e.target.value })}
                                />
                              </Grid>

                              <Grid item xs={12} sm={1} sx={{ textAlign: 'center' }}>
                                <IconButton color="error" size="small" onClick={() => handleRemoveAdjustment(idx)}>
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </Paper>
                        ))
                      )}
                    </Box>

                    {/* Payment Installment Frequency & Financial Summary */}
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={5}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Installment Schedule Configuration
                          </Typography>
                          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>Payment Frequency</InputLabel>
                            <Select
                              label="Payment Frequency"
                              value={installmentFrequency}
                              onChange={(e) => setInstallmentFrequency(e.target.value)}
                            >
                              <MenuItem value="annual">Annually (1 payment)</MenuItem>
                              <MenuItem value="half_yearly">Half-Yearly (2 installments)</MenuItem>
                              <MenuItem value="quarterly">Quarterly (4 installments)</MenuItem>
                              <MenuItem value="monthly">Monthly (10 installments)</MenuItem>
                              <MenuItem value="one_time">One-time at Admission</MenuItem>
                            </Select>
                          </FormControl>

                          <Typography variant="caption" color="text.secondary" display="block">
                            Installments will reconcile to the final payable amount. Due dates are spaced automatically across the academic session.
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={7}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2, bgcolor: 'background.paper' }}>
                          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                            Payable Fee Calculation
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">Configured Base Fee:</Typography>
                            <Typography variant="body2" fontWeight={600}>₹{computedFees.base.toLocaleString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: 'success.main' }}>
                            <Typography variant="body2">Discounts & Concessions:</Typography>
                            <Typography variant="body2" fontWeight={600}>-₹{computedFees.discounts.toLocaleString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, color: 'error.main' }}>
                            <Typography variant="body2">Additional Charges:</Typography>
                            <Typography variant="body2" fontWeight={600}>+₹{computedFees.additional.toLocaleString()}</Typography>
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle1" fontWeight={700}>Final Payable Amount:</Typography>
                            <Typography variant="h5" fontWeight={700} color="primary.main">
                              ₹{computedFees.final.toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Split into {computedFees.installments.length} installment(s)
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                )
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                  Back
                </Button>
                <Button variant="contained" size="large" onClick={handleNext} endIcon={<ArrowForwardIcon />}>
                  Continue to Final Review
                </Button>
              </Box>
            </Card>
          )}

          {/* Step 4: Account Setup & Final Review */}
          {activeStep === 4 && (
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <VerifiedUserIcon color="primary" sx={{ fontSize: 28 }} />
                <div>
                  <Typography variant="h6" fontWeight={700}>
                    Step 5: Account Configuration & Final Review
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review all admission details before committing. The backend will atomically create the student record, parent links, fee schedule, and portal credentials.
                  </Typography>
                </div>
              </Box>

              {/* Student Portal Account Configuration */}
              <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Student Portal Account Provisioning
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enable portal login access for the student. Students log in using their unique Enrollment Number (e.g. STU-2026-00001) or email.
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={createStudentAccount}
                        onChange={(e) => setCreateStudentAccount(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={createStudentAccount ? 'Account Enabled' : 'Disabled'}
                  />
                </Box>

                {createStudentAccount && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                          label="Initial Student Password"
                          fullWidth
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                        />
                        <Tooltip title="Generate secure password">
                          <IconButton
                            color="primary"
                            onClick={() => setStudentPassword(generateSecurePassword())}
                            sx={{ alignSelf: 'center', border: 1, borderColor: 'divider' }}
                          >
                            <AutoRenewIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </Paper>

              {/* Review Summaries */}
              <Grid container spacing={2.5}>
                {/* Student Review */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
                      STUDENT DETAILS
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {studentData.firstName} {studentData.middleName ? `${studentData.middleName} ` : ''}{studentData.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      DOB: {studentData.dob} • Gender: {studentData.gender}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email: {studentData.email || 'Auto-generated on submission'}
                    </Typography>
                    {studentData.phone && (
                      <Typography variant="body2" color="text.secondary">
                        Phone: {studentData.phone}
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Academic Placement Review */}
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
                      ACADEMIC PLACEMENT
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      Grade: {selectedGrade?.name} — Section: {selectedSection?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Admission Date: {admissionDate}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Class Teacher: {sectionTeacher?.teacher_name || 'None currently assigned'}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Fee Assignment Review */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700}>
                        FEE ASSIGNMENT SUMMARY
                      </Typography>
                      {enableFeeAssignment && activeFeeStructure && (
                        <Chip
                          label={`Payable: ₹${computedFees.final.toLocaleString()} (${installmentFrequency})`}
                          color="primary"
                          size="small"
                        />
                      )}
                    </Box>

                    {enableFeeAssignment && activeFeeStructure ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Plan:</Typography>
                          <Typography variant="body2" fontWeight={600}>{activeFeeStructure.name}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Base / Adjustments:</Typography>
                          <Typography variant="body2">
                            Base: ₹{computedFees.base.toLocaleString()} • Disc: -₹{computedFees.discounts.toLocaleString()} • Add: +₹{computedFees.additional.toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Typography variant="caption" color="text.secondary">Schedule:</Typography>
                          <Typography variant="body2">{computedFees.installments.length} installment(s)</Typography>
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Fee assignment skipped for this admission.
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Parents Review */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
                      PARENTS & GUARDIANS ({parents.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {parents.map((p) => (
                        <Grid item xs={12} sm={6} key={p.id}>
                          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="body2" fontWeight={700}>
                                {p.isExisting && p.existingParent
                                  ? `${p.existingParent.first_name} ${p.existingParent.last_name}`
                                  : `${p.firstName} ${p.lastName}`}
                              </Typography>
                              <Chip label={p.relationshipType} size="small" />
                              {p.isPrimaryGuardian && (
                                <Chip label="Primary" color="primary" size="small" />
                              )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Email: {p.isExisting && p.existingParent ? p.existingParent.email : p.email}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Submission CTA */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBackIcon />}>
                  Back
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  onClick={handleSubmitAdmission}
                  disabled={createAdmissionMutation.isPending}
                  startIcon={
                    createAdmissionMutation.isPending ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <CheckCircleIcon />
                    )
                  }
                >
                  {createAdmissionMutation.isPending ? 'Processing Admission...' : 'Confirm & Complete Admission'}
                </Button>
              </Box>
            </Card>
          )}

          {/* Step 5: Admission Success Screen */}
          {activeStep === STEPS.length && admissionResult && (
            <Card sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center' }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '50%', bgcolor: 'success.light', color: 'success.dark', mb: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 48 }} />
              </Box>

              <Typography variant="h4" fontWeight={700} gutterBottom>
                Admission Completed Successfully!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
                The student has been enrolled, fee schedule assigned, and all associated accounts provisioned.
              </Typography>

              {/* Key Identifiers Cards */}
              <Grid container spacing={2} sx={{ mb: 4, textAlign: 'left' }}>
                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ENROLLMENT NUMBER
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="primary.main">
                      {admissionResult.student.enrollment_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Student ID
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ADMISSION NUMBER
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {admissionResult.admission_number}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Registry Ref
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      CLASS & ROLL NO
                    </Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {admissionResult.academic.grade_name} - {admissionResult.academic.section_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Roll No: #{admissionResult.academic.roll_no}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      ASSIGNED FEES
                    </Typography>
                    <Typography variant="h5" fontWeight={700} color="success.main">
                      {admissionResult.fee_assignment
                        ? `₹${Number(admissionResult.fee_assignment.final_payable_amount).toLocaleString()}`
                        : 'N/A'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {admissionResult.fee_assignment
                        ? `${admissionResult.fee_assignment.installments.length} installment(s)`
                        : 'No fees assigned'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Login Credentials Card */}
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  borderColor: 'primary.light',
                  textAlign: 'left',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <KeyIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Portal Login Credentials
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopyCredentials}
                    size="small"
                  >
                    Copy All Credentials
                  </Button>
                </Box>

                <Grid container spacing={2}>
                  {/* Student Portal Account */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Student Portal Access
                      </Typography>
                      {admissionResult.student_account.initial_password ? (
                        <>
                          <Typography variant="body2">
                            <strong>Login Identifier:</strong> {admissionResult.student.enrollment_number}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Registered Email:</strong> {admissionResult.student_account.email}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Temporary Password:</strong>{' '}
                            <code style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>
                              {admissionResult.student_account.initial_password}
                            </code>
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No student login account was requested during this admission.
                        </Typography>
                      )}
                    </Box>
                  </Grid>

                  {/* Parents Portal Access */}
                  <Grid item xs={12} md={6}>
                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Parent & Guardian Portal Access
                      </Typography>
                      {admissionResult.parents.map((p, idx) => (
                        <Box key={p.parent_id || idx} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{p.first_name} {p.last_name} ({p.relationship_type}):</strong>
                          </Typography>
                          <Typography variant="caption" display="block">
                            Email: {p.email}
                          </Typography>
                          {p.initial_password ? (
                            <Typography variant="caption" display="block">
                              Password:{' '}
                              <code style={{ background: '#eee', padding: '1px 5px', borderRadius: 4 }}>
                                {p.initial_password}
                              </code>
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary" display="block">
                              Existing account linked successfully.
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LaunchIcon fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    Students and parents can log in directly at{' '}
                    <a href="http://localhost:3001/login" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                      http://localhost:3001/login
                    </a>
                  </Typography>
                </Box>
              </Paper>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleAdmitAnother}
                  startIcon={<AddIcon />}
                >
                  Admit Another Student
                </Button>
                <Button
                  component={Link}
                  href="/fees"
                  variant="outlined"
                  size="large"
                  startIcon={<AccountBalanceWalletIcon />}
                >
                  View in Fee Management
                </Button>
                <Button
                  component={Link}
                  href="/students"
                  variant="contained"
                  size="large"
                  startIcon={<SchoolIcon />}
                >
                  View Students Directory
                </Button>
              </Box>
            </Card>
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
