import { useEffect, useRef, useState, type FormEvent } from 'react';

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '1x00000000000000000000AA';

const PILLARS = [
  {
    index: '01',
    name: 'Network',
    copy: 'Find the people, conversations, and opportunities that move your work forward.',
  },
  {
    index: '02',
    name: 'Marketplace',
    copy: 'Discover trusted businesses, products, services, and collaborations in one place.',
  },
  {
    index: '03',
    name: 'Capital',
    copy: 'Bring builders and backers closer through clearer, more human deal flow.',
  },
  {
    index: '04',
    name: 'Mentorship',
    copy: 'Turn experience into momentum through practical guidance and meaningful access.',
  },
  {
    index: '05',
    name: 'Growth',
    copy: 'Build visibility, strengthen your reputation, and create room for what comes next.',
  },
];

const ROLE_OPTIONS = [
  ['entrepreneur', 'Entrepreneur / founder'],
  ['business', 'Business / organisation'],
  ['investor', 'Investor / funder'],
  ['professional', 'Professional / future member'],
  ['partner', 'Ecosystem partner'],
  ['other', 'Something else'],
] as const;

const INTEREST_OPTIONS = [
  ['networking', 'Networking and community'],
  ['marketplace', 'Marketplace and trade'],
  ['capital', 'Funding or investing'],
  ['mentorship', 'Mentorship and learning'],
  ['growth', 'Marketing and growth'],
  ['exploring', 'Exploring the ecosystem'],
] as const;

type SubmissionState =
  | { kind: 'idle'; message: '' }
  | { kind: 'submitting'; message: string }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

interface WaitlistResponse {
  message?: string;
  error?: string;
}

interface TurnstileOptions {
  sitekey: string;
  action: string;
  appearance: 'interaction-only';
  theme: 'light';
  size: 'flexible';
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function ComingSoonPage() {
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ kind: 'idle', message: '' });

  useEffect(() => {
    const renderTurnstile = () => {
      if (
        !window.turnstile ||
        !turnstileContainerRef.current ||
        turnstileWidgetIdRef.current
      ) {
        return;
      }

      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'waitlist',
        appearance: 'interaction-only',
        theme: 'light',
        size: 'flexible',
        callback: (token) => {
          setTurnstileToken(token);
          setTurnstileReady(true);
        },
        'expired-callback': () => {
          setTurnstileToken('');
          setTurnstileReady(false);
        },
        'error-callback': () => {
          setTurnstileToken('');
          setTurnstileReady(false);
          setSubmission({
            kind: 'error',
            message: 'The security check could not load. Please refresh and try again.',
          });
        },
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-vendrome-turnstile]',
    );
    const script = existingScript ?? document.createElement('script');

    if (!existingScript) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.vendromeTurnstile = 'true';
      document.head.appendChild(script);
    }

    script.addEventListener('load', renderTurnstile);

    if (window.turnstile) {
      renderTurnstile();
    }

    return () => {
      script.removeEventListener('load', renderTurnstile);
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!turnstileToken) {
      setSubmission({
        kind: 'error',
        message: 'Please complete the security check before joining.',
      });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmission({ kind: 'submitting', message: 'Saving your place…' });

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fullName: readFormValue(formData, 'fullName'),
          email: readFormValue(formData, 'email'),
          role: readFormValue(formData, 'role'),
          organisation: readFormValue(formData, 'organisation'),
          country: readFormValue(formData, 'country'),
          interest: readFormValue(formData, 'interest'),
          profileUrl: readFormValue(formData, 'profileUrl'),
          note: readFormValue(formData, 'note'),
          company: readFormValue(formData, 'company'),
          consent: formData.get('consent') === 'on',
          turnstileToken,
        }),
      });

      const result = (await response.json().catch(() => null)) as WaitlistResponse | null;

      if (!response.ok) {
        throw new Error(result?.error || 'We could not save your details. Please try again.');
      }

      setSubmission({
        kind: 'success',
        message: result?.message || 'You are on the list. We will be in touch as Vendrome opens.',
      });
      form.reset();
      setTurnstileToken('');
      setTurnstileReady(false);
      if (turnstileWidgetIdRef.current) {
        window.turnstile?.reset(turnstileWidgetIdRef.current);
      }
    } catch (error) {
      setSubmission({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'We could not save your details. Please try again.',
      });
      setTurnstileToken('');
      setTurnstileReady(false);
      if (turnstileWidgetIdRef.current) {
        window.turnstile?.reset(turnstileWidgetIdRef.current);
      }
    }
  };

  return (
    <main className="launch-page">
      <header className="launch-nav">
        <a className="brand" href="#top" aria-label="Vendrome home">
          <img src="/vendrome-tab-icon.png" alt="" width="44" height="44" />
          <span>VENDROME</span>
        </a>

        <div className="nav-status" aria-label="Launch status">
          <span className="status-pulse" aria-hidden="true" />
          Opening in waves
        </div>

        <a className="nav-cta" href="#waitlist">
          Join the waitlist
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-glow hero-glow-one" aria-hidden="true" />
        <div className="hero-glow hero-glow-two" aria-hidden="true" />

        <div className="hero-copy">
          <p className="eyebrow"><span /> A new economy is forming</p>
          <h1>
            The social economy
            <span>is taking shape.</span>
          </h1>
          <p className="hero-intro">
            Vendrome is the place for people who build, back, buy, sell, learn, and grow—brought
            together in one trusted ecosystem.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#waitlist">
              Reserve your place
              <span aria-hidden="true">→</span>
            </a>
            <a className="text-button" href="#vision">
              See the vision
              <span aria-hidden="true">↓</span>
            </a>
          </div>

          <div className="hero-proof" aria-label="Who Vendrome is for">
            <span>For founders</span>
            <span>For businesses</span>
            <span>For investors</span>
            <span>For everyone growing</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Vendrome marble emblem">
          <div className="orbit orbit-outer" aria-hidden="true" />
          <div className="orbit orbit-inner" aria-hidden="true" />
          <div className="orbit-dot dot-one" aria-hidden="true" />
          <div className="orbit-dot dot-two" aria-hidden="true" />
          <div className="orbit-dot dot-three" aria-hidden="true" />
          <div className="statue-frame">
            <img
              src="/landing/VendromeStatue.png"
              alt="Sculpted white marble Vendrome emblem"
              width="1217"
              height="848"
              fetchPriority="high"
            />
          </div>
          <div className="orbit-label label-connect">CONNECT</div>
          <div className="orbit-label label-build">BUILD</div>
          <div className="orbit-label label-back">BACK</div>
          <div className="art-caption"><span>EST.</span> 2026 / GLOBAL</div>
        </div>
      </section>

      <div className="signal-strip" aria-label="Vendrome possibilities">
        <div className="signal-track">
          {[...Array(2)].map((_, repetition) => (
            <div className="signal-set" aria-hidden={repetition === 1} key={repetition}>
              <span>Connect</span><i />
              <span>Build</span><i />
              <span>Trade</span><i />
              <span>Learn</span><i />
              <span>Fund</span><i />
              <span>Grow</span><i />
            </div>
          ))}
        </div>
      </div>

      <section className="vision-section" id="vision">
        <div className="section-heading">
          <p className="section-kicker">ONE ECOSYSTEM / MANY WAYS FORWARD</p>
          <h2>Where ambition compounds.</h2>
          <p>
            Vendrome is designed to reduce the distance between a good idea and the people,
            knowledge, market, and capital that can help it move.
          </p>
        </div>

        <div className="pillar-grid">
          {PILLARS.map((pillar) => (
            <article className="pillar-card" key={pillar.name}>
              <span className="pillar-index">{pillar.index}</span>
              <div className="pillar-mark" aria-hidden="true"><span /></div>
              <h3>{pillar.name}</h3>
              <p>{pillar.copy}</p>
            </article>
          ))}
        </div>

        <div className="vision-statement">
          <p>Not another feed.</p>
          <p>Not another directory.</p>
          <strong>A living economy built around people.</strong>
        </div>
      </section>

      <section className="waitlist-section" id="waitlist">
        <div className="waitlist-glow" aria-hidden="true" />
        <div className="waitlist-copy">
          <p className="section-kicker">EARLY ACCESS / FOUNDING COMMUNITY</p>
          <h2>Be there when the doors open.</h2>
          <p>
            Tell us where you fit into the ecosystem. We will use your details to shape early
            access and let you know when your part of Vendrome is ready.
          </p>

          <div className="waitlist-notes">
            <div><span>01</span><p>Priority invitations will open in focused waves.</p></div>
            <div><span>02</span><p>Your role and interests help us build a stronger first community.</p></div>
            <div><span>03</span><p>Your details stay private and are never sold.</p></div>
          </div>
        </div>

        <form className="waitlist-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <div>
              <span className="form-step">YOUR PLACE / 01</span>
              <h3>Join the Vendrome waitlist</h3>
            </div>
            <span className="form-availability">Limited first wave</span>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Full name *</span>
              <input name="fullName" autoComplete="name" maxLength={100} required placeholder="Your name" />
            </label>

            <label className="field">
              <span>Email address *</span>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                placeholder="you@example.com"
              />
            </label>

            <label className="field">
              <span>I am a… *</span>
              <select name="role" required defaultValue="">
                <option value="" disabled>Select your role</option>
                {ROLE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Main interest *</span>
              <select name="interest" required defaultValue="">
                <option value="" disabled>What brings you here?</option>
                {INTEREST_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>

            <label className="field">
              <span>Business or organisation</span>
              <input
                name="organisation"
                autoComplete="organization"
                maxLength={120}
                placeholder="Optional"
              />
            </label>

            <label className="field">
              <span>Country or region</span>
              <input
                name="country"
                autoComplete="country-name"
                maxLength={80}
                placeholder="Optional"
              />
            </label>

            <label className="field field-wide">
              <span>Website or LinkedIn</span>
              <input
                name="profileUrl"
                type="url"
                inputMode="url"
                autoComplete="url"
                maxLength={300}
                placeholder="https://"
              />
            </label>

            <label className="field field-wide">
              <span>What do you hope to find or contribute?</span>
              <textarea
                name="note"
                rows={3}
                maxLength={600}
                placeholder="A short note, if you would like to share one."
              />
            </label>

            <label className="honeypot" aria-hidden="true">
              Company website
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <label className="consent-field">
            <input name="consent" type="checkbox" required />
            <span>
              I agree that Vendrome may use these details to manage the waitlist and send me
              launch or early-access updates. *
            </span>
          </label>

          <div className="turnstile-wrap">
            <div ref={turnstileContainerRef} />
            <span>{turnstileReady ? 'Security check complete' : 'Protected by Cloudflare Turnstile'}</span>
          </div>

          <button
            className="submit-button"
            type="submit"
            disabled={submission.kind === 'submitting'}
          >
            <span>{submission.kind === 'submitting' ? 'Saving your place…' : 'Join the waitlist'}</span>
            <span aria-hidden="true">↗</span>
          </button>

          <p
            className={`form-status ${submission.kind}`}
            role={submission.kind === 'error' ? 'alert' : 'status'}
            aria-live="polite"
          >
            {submission.message}
          </p>

          <p className="form-privacy">
            No spam. No selling your data. Just meaningful Vendrome launch and access updates.
          </p>
        </form>
      </section>

      <footer className="launch-footer">
        <a className="brand footer-brand" href="#top" aria-label="Back to the top">
          <img src="/vendrome-tab-icon.png" alt="" width="42" height="42" loading="lazy" />
          <span>VENDROME</span>
        </a>
        <p>The social economy, taking shape.</p>
        <div>
          <span>© 2026 Vendrome</span>
          <a href="#waitlist">Early access</a>
        </div>
      </footer>
    </main>
  );
}

export default ComingSoonPage;
