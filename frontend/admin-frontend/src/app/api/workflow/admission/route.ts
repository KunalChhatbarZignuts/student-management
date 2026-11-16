import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { handleStudentAdmission, StudentAdmissionPayload } from '@/workflows/student-admission';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const payload: StudentAdmissionPayload = {
      admissionNumber: body.admissionNumber || `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: body.firstName || 'Aarav',
      lastName: body.lastName || 'Patel',
      email: body.email || 'aarav.patel@example.com',
      parentEmail: body.parentEmail || 'parent.patel@example.com',
      gradeLevel: body.gradeLevel || 'Grade 10',
    };

    const run = await start(handleStudentAdmission, [payload]);

    return NextResponse.json(
      {
        success: true,
        message: 'Student admission workflow started successfully',
        runId: run.runId,
        workflow: 'handleStudentAdmission',
        admissionNumber: payload.admissionNumber,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error starting student admission workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to trigger student admission workflow',
      },
      { status: 500 }
    );
  }
}

