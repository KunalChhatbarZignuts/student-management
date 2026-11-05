'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Card from '@mui/material/Card';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import RequireRole from '@/components/guards/RequireRole';
import AppShell from '@/components/layout/AppShell';
import { useSnackbar } from '@/components/ui/SnackbarProvider';
import { formatErrorMessage } from '@/lib/errorMapper';
import { ROLES } from '@/lib/constants';
import { adminGradeApi } from '@/features/grades/api';
import { adminParentApi } from '@/features/parents/api';
import { adminAdmissionApi } from '@/features/admissions/api';
import { adminFeeApi, StudentFeeAdjustmentItem } from '@/features/fees/api';
import {
  AdmissionCreateRequest,
  AdmissionResponse,
  AdmissionParentPayload,
  ParentFormItem,
  StudentFormData,
} from '@/features/admissions/types';

import {
  StudentPersonalStep,
  ParentGuardianStep,
  AcademicPlacementStep,
  FeeAdjustmentStep,
  AccountSetupReviewStep,
  AdmissionSuccessCard,
} from '@/features/admissions/components';

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

const STEPS = [
  'Student Personal Details',
  'Parent & Guardian Details',
  'Academic Placement & Teacher Assignment',
  'Fee Configuration & Adjustments',
  'Account Setup & Review',
];

export default function StudentAdmissionWizardPage() {
  const { showSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = React.useState<number>(0);

  // --- Step 0: Student Personal Details State ---
  const [studentData, setStudentData] = React.useState<StudentFormData>({
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
    department: 'General',
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
      showSnackbar(
        `Admission successful! Enrollment No: ${data.student.enrollment_number}`,
        'success'
      );
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
          showSnackbar(
            `Parent #${i + 1}: Please select an existing parent from the search list`,
            'error'
          );
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
          showSnackbar(
            `Adjustment #${i + 1}: Percentage rate must be between 1% and 100%`,
            'error'
          );
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
        department: studentData.department.trim() || 'General',
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
      text += `Payable Amount: ₹${Number(
        admissionResult.fee_assignment.final_payable_amount
      ).toLocaleString()}\n`;
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
      department: 'General',
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
              Complete student registration, parent relationships, academic placement, fee
              schedules, and portal credentials in one unified workflow.
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
            <StudentPersonalStep
              studentData={studentData}
              onUpdate={(updates) => setStudentData((prev) => ({ ...prev, ...updates }))}
              onNext={handleNext}
            />
          )}

          {/* Step 1: Parent & Guardian Details */}
          {activeStep === 1 && (
            <ParentGuardianStep
              parents={parents}
              onAddParent={handleAddParent}
              onRemoveParent={handleRemoveParent}
              onUpdateParent={handleUpdateParent}
              onSetPrimaryGuardian={handleSetPrimaryGuardian}
              parentSearchQuery={parentSearchQuery}
              onSearchQueryChange={setParentSearchQuery}
              searchParentsResult={searchParentsResult}
              searchingParents={searchingParents}
              onNext={handleNext}
              onBack={handleBack}
              generatePassword={generateSecurePassword}
            />
          )}

          {/* Step 2: Academic Details & Teacher Assignment */}
          {activeStep === 2 && (
            <AcademicPlacementStep
              academicYears={academicYears}
              selectedAcademicYearId={selectedAcademicYearId}
              onAcademicYearChange={(val) => {
                setSelectedAcademicYearId(val);
                setSelectedGradeId('');
                setSelectedSectionId('');
              }}
              grades={grades}
              selectedGradeId={selectedGradeId}
              onGradeChange={(val) => {
                setSelectedGradeId(val);
                setSelectedSectionId('');
              }}
              loadingGrades={loadingGrades}
              sections={sections}
              selectedSectionId={selectedSectionId}
              onSectionChange={setSelectedSectionId}
              loadingSections={loadingSections}
              admissionDate={admissionDate}
              onAdmissionDateChange={setAdmissionDate}
              notes={notes}
              onNotesChange={setNotes}
              sectionTeacher={sectionTeacher}
              loadingSectionTeacher={loadingSectionTeacher}
              selectedGrade={selectedGrade}
              selectedSection={selectedSection}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {/* Step 3: Fee Configuration & Adjustments */}
          {activeStep === 3 && (
            <FeeAdjustmentStep
              enableFeeAssignment={enableFeeAssignment}
              onToggleEnableFeeAssignment={setEnableFeeAssignment}
              loadingFeeStructure={loadingFeeStructure}
              activeFeeStructure={activeFeeStructure}
              selectedGrade={selectedGrade}
              selectedComponentIds={selectedComponentIds}
              onToggleComponentId={(componentId, checked) => {
                if (checked) {
                  setSelectedComponentIds([...selectedComponentIds, componentId]);
                } else {
                  setSelectedComponentIds(
                    selectedComponentIds.filter((id) => id !== componentId)
                  );
                }
              }}
              adjustments={adjustments}
              onAddAdjustment={handleAddAdjustment}
              onRemoveAdjustment={handleRemoveAdjustment}
              onUpdateAdjustment={handleUpdateAdjustment}
              installmentFrequency={installmentFrequency}
              onInstallmentFrequencyChange={setInstallmentFrequency}
              computedFees={computedFees}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {/* Step 4: Account Setup & Final Review */}
          {activeStep === 4 && (
            <AccountSetupReviewStep
              createStudentAccount={createStudentAccount}
              onToggleCreateStudentAccount={setCreateStudentAccount}
              studentPassword={studentPassword}
              onStudentPasswordChange={setStudentPassword}
              generatePassword={generateSecurePassword}
              studentData={studentData}
              selectedGrade={selectedGrade}
              selectedSection={selectedSection}
              admissionDate={admissionDate}
              sectionTeacher={sectionTeacher}
              enableFeeAssignment={enableFeeAssignment}
              activeFeeStructure={activeFeeStructure}
              computedFees={computedFees}
              installmentFrequency={installmentFrequency}
              parents={parents}
              onSubmit={handleSubmitAdmission}
              isSubmitting={createAdmissionMutation.isPending}
              onBack={handleBack}
            />
          )}

          {/* Step 5: Admission Success Screen */}
          {activeStep === STEPS.length && admissionResult && (
            <AdmissionSuccessCard
              admissionResult={admissionResult}
              onCopyCredentials={handleCopyCredentials}
              onAdmitAnother={handleAdmitAnother}
            />
          )}
        </Box>
      </AppShell>
    </RequireRole>
  );
}
