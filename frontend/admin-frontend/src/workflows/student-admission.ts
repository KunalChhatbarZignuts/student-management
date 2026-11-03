import { sleep } from 'workflow';

export interface StudentAdmissionPayload {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  parentEmail?: string;
  gradeLevel: string;
}

// Step 1: Validate admission information
async function validateAdmissionData(payload: StudentAdmissionPayload) {
  'use step';
  if (!payload.admissionNumber || !payload.email || !payload.firstName) {
    throw new Error('Admission payload missing required fields: admissionNumber, email, or firstName');
  }
  console.log(`[Workflow:Admission] Step 1: Validated admission for ${payload.firstName} ${payload.lastName} (${payload.admissionNumber})`);
  return {
    valid: true,
    admissionNumber: payload.admissionNumber,
    verifiedAt: new Date().toISOString(),
  };
}

// Step 2: Prepare enrollment record and reference code
async function prepareStudentRecord(payload: StudentAdmissionPayload) {
  'use step';
  const enrollmentCode = `ENR-${Date.now().toString(36).toUpperCase()}-${payload.admissionNumber.slice(-4)}`;
  console.log(`[Workflow:Admission] Step 2: Generated enrollment code ${enrollmentCode} for ${payload.email}`);
  return {
    enrollmentCode,
    status: 'PROVISIONED',
    allocatedGrade: payload.gradeLevel,
    preparedAt: new Date().toISOString(),
  };
}

// Step 3: Send primary confirmation to student and parents
async function notifyStakeholders(payload: StudentAdmissionPayload, enrollmentCode: string) {
  'use step';
  console.log(`[Workflow:Admission] Step 3: Notified student ${payload.email} and parent ${payload.parentEmail || 'N/A'}`);
  return {
    studentNotified: true,
    parentNotified: Boolean(payload.parentEmail),
    dispatchedAt: new Date().toISOString(),
  };
}

// Step 4: Finalize orientation materials after durable delay
async function dispatchOrientationPack(payload: StudentAdmissionPayload, enrollmentCode: string) {
  'use step';
  console.log(`[Workflow:Admission] Step 4: Dispatched orientation pack for enrollment ${enrollmentCode}`);
  return {
    orientationPackUrl: `/docs/orientation/${enrollmentCode}.pdf`,
    completedAt: new Date().toISOString(),
  };
}

// Main Durable Admission Workflow
export async function handleStudentAdmission(payload: StudentAdmissionPayload) {
  'use workflow';

  const validation = await validateAdmissionData(payload);
  const record = await prepareStudentRecord(payload);
  const notification = await notifyStakeholders(payload, record.enrollmentCode);

  // Durable delay simulating administrative intake window
  console.log(`[Workflow:Admission] Entering durable 5s delay before orientation pack dispatch...`);
  await sleep('5s');

  const orientation = await dispatchOrientationPack(payload, record.enrollmentCode);

  return {
    success: true,
    workflow: 'student-admission',
    student: {
      name: `${payload.firstName} ${payload.lastName}`,
      email: payload.email,
      gradeLevel: payload.gradeLevel,
    },
    enrollmentCode: record.enrollmentCode,
    summary: {
      validation,
      record,
      notification,
      orientation,
    },
  };
}

