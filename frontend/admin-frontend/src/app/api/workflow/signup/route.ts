import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { handleUserSignup } from '@/workflows/user-signup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || 'test-user@example.com';

    const run = await start(handleUserSignup, [email]);

    return NextResponse.json(
      {
        success: true,
        message: 'User signup workflow started successfully',
        runId: run.runId,
        workflow: 'handleUserSignup',
        email,
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error('Error starting user signup workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to trigger user signup workflow',
      },
      { status: 500 }
    );
  }
}

