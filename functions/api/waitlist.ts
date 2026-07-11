const MAX_REQUEST_BYTES = 20_000;

const ROLES = new Set([
  'entrepreneur',
  'business',
  'investor',
  'professional',
  'partner',
  'other',
]);

const INTERESTS = new Set([
  'networking',
  'marketplace',
  'capital',
  'mentorship',
  'growth',
  'exploring',
]);

interface D1Result {
  success: boolean;
  meta: {
    changes?: number;
  };
}

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  run: () => Promise<D1Result>;
}

interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
}

interface Env {
  WAITLIST_DB?: D1Database;
  TURNSTILE_SECRET_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface TurnstileVerification {
  success: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface WaitlistSubmission {
  fullName: string;
  email: string;
  role: string;
  organisation: string | null;
  country: string | null;
  interest: string;
  profileUrl: string | null;
  note: string | null;
  company: string;
  consent: boolean;
  turnstileToken: string;
}

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function cleanString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanNote(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\r\n/g, '\n').slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function isValidOptionalUrl(value: string): boolean {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function parseSubmission(value: unknown): WaitlistSubmission | null {
  if (!isRecord(value)) {
    return null;
  }

  const organisation = cleanString(value.organisation, 120);
  const country = cleanString(value.country, 80);
  const profileUrl = cleanString(value.profileUrl, 300);
  const note = cleanNote(value.note, 600);

  return {
    fullName: cleanString(value.fullName, 100),
    email: cleanString(value.email, 254).toLowerCase(),
    role: cleanString(value.role, 32),
    organisation: organisation || null,
    country: country || null,
    interest: cleanString(value.interest, 32),
    profileUrl: profileUrl || null,
    note: note || null,
    company: cleanString(value.company, 200),
    consent: value.consent === true,
    turnstileToken: cleanString(value.turnstileToken, 2048),
  };
}

function validateSubmission(submission: WaitlistSubmission): string | null {
  if (submission.fullName.length < 2) {
    return 'Please enter your full name.';
  }

  if (!isValidEmail(submission.email)) {
    return 'Please enter a valid email address.';
  }

  if (!ROLES.has(submission.role)) {
    return 'Please select the role that best describes you.';
  }

  if (!INTERESTS.has(submission.interest)) {
    return 'Please select your main interest.';
  }

  if (submission.profileUrl && !isValidOptionalUrl(submission.profileUrl)) {
    return 'Please enter a complete website or LinkedIn URL beginning with http:// or https://.';
  }

  if (!submission.consent) {
    return 'Please confirm that we may manage your waitlist place and send launch updates.';
  }

  if (!submission.turnstileToken) {
    return 'Please complete the security check.';
  }

  return null;
}

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  const formData = new FormData();
  formData.set('secret', secret);
  formData.set('response', token);

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as TurnstileVerification;
  return result.success && (!result.action || result.action === 'waitlist');
}

function countryFromRequest(request: Request): string | null {
  // Cloudflare stamps every proxied request with the visitor's ISO country code.
  // 'XX' means unknown and 'T1' is the Tor network; neither is a real location.
  const code = request.headers.get('CF-IPCountry');
  if (!code || code === 'XX' || code === 'T1') {
    return null;
  }

  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse({ error: 'This submission is too large.' }, 413);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'This endpoint accepts JSON submissions only.' }, 415);
  }

  const requestOrigin = request.headers.get('Origin');
  const endpointOrigin = new URL(request.url).origin;
  if (requestOrigin && requestOrigin !== endpointOrigin) {
    return jsonResponse({ error: 'Cross-site submissions are not accepted.' }, 403);
  }

  let rawSubmission: unknown;
  try {
    rawSubmission = await request.json();
  } catch {
    return jsonResponse({ error: 'The submission could not be read.' }, 400);
  }

  const submission = parseSubmission(rawSubmission);
  if (!submission) {
    return jsonResponse({ error: 'Please review the form and try again.' }, 400);
  }

  // Bots commonly fill fields that are visually hidden from real users. Responding with a
  // normal success prevents the honeypot from revealing itself while avoiding a database write.
  if (submission.company) {
    return jsonResponse({ message: 'You are on the list. We will be in touch as Vendrome opens.' });
  }

  const validationError = validateSubmission(submission);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  if (!env.TURNSTILE_SECRET_KEY || !env.WAITLIST_DB) {
    return jsonResponse(
      { error: 'The waitlist is being prepared. Please check back shortly.' },
      503,
    );
  }

  try {
    const turnstileValid = await verifyTurnstile(
      submission.turnstileToken,
      env.TURNSTILE_SECRET_KEY,
    );

    if (!turnstileValid) {
      return jsonResponse(
        { error: 'The security check expired or could not be verified. Please try again.' },
        400,
      );
    }

    const now = new Date().toISOString();
    const result = await env.WAITLIST_DB.prepare(
      `
        INSERT INTO waitlist_signups (
          id,
          email,
          full_name,
          role,
          organisation,
          country,
          ip_country,
          interest,
          profile_url,
          note,
          consent_at,
          created_at,
          source,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'vendrome-coming-soon', 'waiting')
        ON CONFLICT(email) DO NOTHING
      `,
    )
      .bind(
        crypto.randomUUID(),
        submission.email,
        submission.fullName,
        submission.role,
        submission.organisation,
        submission.country,
        countryFromRequest(request),
        submission.interest,
        submission.profileUrl,
        submission.note,
        now,
        now,
      )
      .run();

    if (!result.success) {
      throw new Error('D1 did not confirm the waitlist write.');
    }

    const duplicate = Number(result.meta.changes || 0) === 0;

    return jsonResponse(
      {
        message: duplicate
          ? 'You are already on the list. We will be in touch as Vendrome opens.'
          : 'You are on the list. We will be in touch as Vendrome opens.',
        duplicate,
      },
      duplicate ? 200 : 201,
    );
  } catch (error) {
    console.error('Vendrome waitlist submission failed.', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return jsonResponse(
      { error: 'We could not save your place right now. Please try again in a moment.' },
      500,
    );
  }
};

export const onRequestGet = async (): Promise<Response> =>
  jsonResponse({ error: 'Method not allowed.' }, 405);
