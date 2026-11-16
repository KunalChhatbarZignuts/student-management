import { sleep } from 'workflow';

// Step 1: Verify and validate user signup
async function validateUser(email: string) {
  'use step';
  if (!email || !email.includes('@')) {
    throw new Error(`Invalid email address: ${email}`);
  }
  console.log(`[Workflow:UserSignup] Step 1: Validated user email: ${email}`);
  return { valid: true, email, timestamp: new Date().toISOString() };
}

// Step 2: Dispatch initial welcome communication
async function sendWelcomeEmail(email: string) {
  'use step';
  console.log(`[Workflow:UserSignup] Step 2: Welcome email dispatched to ${email}`);
  return { delivered: true, sentAt: new Date().toISOString() };
}

// Step 3: Dispatch follow-up onboarding guide
async function sendOnboardingGuide(email: string) {
  'use step';
  console.log(`[Workflow:UserSignup] Step 3: Follow-up onboarding guide dispatched to ${email}`);
  return { guideSent: true, completedAt: new Date().toISOString() };
}

// Main Durable Workflow
export async function handleUserSignup(email: string) {
  'use workflow';

  const validation = await validateUser(email);
  const welcome = await sendWelcomeEmail(email);

  // Durable sleep step provided by Vercel Workflow SDK
  console.log('[Workflow:UserSignup] Pausing for 5 seconds durable delay...');
  await sleep('5s');

  const onboarding = await sendOnboardingGuide(email);

  return {
    success: true,
    workflow: 'user-signup',
    email,
    validation,
    welcome,
    onboarding,
  };
}

