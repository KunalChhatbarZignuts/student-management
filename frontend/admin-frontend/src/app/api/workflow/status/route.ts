import { NextRequest, NextResponse } from 'next/server';
import { getRun } from 'workflow/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json(
      { success: false, error: 'Missing runId parameter' },
      { status: 400 }
    );
  }

  try {
    const run = getRun(runId);
    const status = await run.status;
    let returnValue = null;

    if (status === 'completed') {
      try {
        returnValue = await run.returnValue;
      } catch {
        // Return value might not be available or may have thrown
      }
    }

    return NextResponse.json({
      success: true,
      runId,
      status,
      returnValue,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to inspect run' },
      { status: 500 }
    );
  }
}

