import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Armchair, Handshake } from 'lucide-react';

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '1x00000000000000000000AA';

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

const WORLD_TICKER = [
  'Founders in Lagos',
  'Investors in London',
  'Creators in Seoul',
  'Traders in Mumbai',
  'Mentors in Nairobi',
  'Builders in Sao Paulo',
  'Dreamers in Manila',
  'Designers in Berlin',
  'Sellers in Cairo',
  'Backers in New York',
  'Makers in Jakarta',
  'Entrepreneurs in Johannesburg',
];

const ART_STARS = [
  [27, 5, 0, 2], [35, 13, 1.2, 1], [44, 7, 2.4, 1], [52, 16, 0.7, 2],
  [60, 4, 3.1, 1], [69, 12, 1.8, 1], [77, 7, 0.4, 2], [45, 23, 2.8, 1],
  [66, 21, 1.5, 1], [31, 8, 3.7, 2], [80, 13, 2.1, 1], [40, 17, 0.2, 1],
  [62, 18, 3.4, 1], [38, 21, 1.1, 2], [74, 20, 2.5, 1], [70, 31, 0.9, 1],
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

function DromeScene() {
  return (
    <div className="cs-showcase cs-approved-art rise d2">
      <img
        className="cs-approved-image"
        src="/coming-soon/vendrome-rotunda-clean.png"
        alt="A global social economy inside the Vendrome Drome, where diverse founders, investors, buyers, sellers, mentors, and professionals connect around the illuminated Vendrome logo."
        width="1672"
        height="941"
        fetchPriority="high"
      />

      <div className="cs-art-effects" aria-hidden="true">
        <div className="cs-live-stars">
          {ART_STARS.map(([left, top, delay, size], index) => (
            <span
              key={`${left}-${top}-${index}`}
              style={{
                '--star-left': `${left}%`,
                '--star-top': `${top}%`,
                '--star-delay': `${delay}s`,
                '--star-size': `${size + 1}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        <div className="cs-logo-aura" />
      </div>
    </div>
  );
}

function ComingSoonPage() {
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ kind: 'idle', message: '' });
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [showComing, setShowComing] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let timer: number;
    let coming = false;

    const tick = () => {
      coming = !coming;
      setShowComing(coming);
      timer = window.setTimeout(tick, coming ? 3600 : 5400);
    };

    timer = window.setTimeout(tick, 5400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!waitlistOpen) {
      return;
    }

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
    if (window.turnstile) renderTurnstile();

    return () => {
      script.removeEventListener('load', renderTurnstile);
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetIdRef.current);
        turnstileWidgetIdRef.current = null;
      }
      setTurnstileToken('');
      setTurnstileReady(false);
    };
  }, [waitlistOpen]);

  useEffect(() => {
    if (!waitlistOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setWaitlistOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [waitlistOpen]);

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
    setSubmission({ kind: 'submitting', message: 'Saving your place...' });

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
          interest: readFormValue(formData, 'interest'),
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
      if (turnstileWidgetIdRef.current) window.turnstile?.reset(turnstileWidgetIdRef.current);
    } catch (error) {
      setSubmission({
        kind: 'error',
        message: error instanceof Error
          ? error.message
          : 'We could not save your details. Please try again.',
      });
      setTurnstileToken('');
      setTurnstileReady(false);
      if (turnstileWidgetIdRef.current) window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  };

  const succeeded = submission.kind === 'success';

  return (
    <main className="cs">
      <header className="cs-top">
        <a className="cs-brand" href="/" aria-label="Vendrome">
          <img src="/vendrome-logo.svg" alt="" width="42" height="42" />
          <span>VENDROME</span>
        </a>
        <span className="cs-est">Est. 2026</span>
      </header>

      <section className="cs-stage">
        <div className="cs-copy">
          <p className="cs-eyebrow rise">
            <span className="cs-dot" aria-hidden="true" />
            Coming soon
          </p>

          <h1 className="cs-title rise d1">
            <span className={`cs-title-layer${showComing ? ' is-away' : ''}`}>
              The <br />
              <span className="cs-gradient-word">Social</span> <br />
              Economy.
            </span>
            <span
              className={`cs-title-layer cs-title-alt${showComing ? '' : ' is-away'}`}
              aria-hidden="true"
            >
              Coming <br />
              <span className="cs-gradient-word">Soon.</span>
            </span>
          </h1>

          <p className="cs-sub rise d2">
            Vendrome is where business happens naturally.{' '}
            <strong>Connect, build, fund, trade, share, and grow</strong> in one verified ecosystem.
          </p>

          <button type="button" className="cs-cta rise d3" onClick={() => setWaitlistOpen(true)}>
            Join the waitlist{' '}
            <span aria-hidden="true">
              <Handshake size={20} strokeWidth={2.1} />
            </span>
          </button>

          <div className="cs-tagline rise d3">
            <span className="cs-rule" aria-hidden="true" />
            <span>Connect &middot; Build &middot; Fund &middot; Trade &middot; Share &middot; Grow</span>
          </div>
        </div>

        <DromeScene />
      </section>

      {waitlistOpen && (
        <div
          className="cs-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Join the Vendrome waitlist"
          onClick={() => setWaitlistOpen(false)}
        >
          <div className="cs-modal-panel" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="cs-modal-close"
              onClick={() => setWaitlistOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="cs-card">
            {succeeded && (
              <div className="cs-success" role="status">
                <span className="cs-success-mark" aria-hidden="true">&#10003;</span>
                <h2>You&rsquo;re in.</h2>
                <p>{submission.message}</p>
              </div>
            )}

            <form className="cs-form" onSubmit={handleSubmit} hidden={succeeded}>
              <div className="cs-form-head">
                <h2>Join the waitlist</h2>
                <span>First wave &mdash; limited</span>
              </div>

              <div className="cs-grid">
                <label className="cs-field">
                  <span>Full name</span>
                  <input name="fullName" autoComplete="name" maxLength={100} required placeholder="Your name" autoFocus />
                </label>

                <label className="cs-field">
                  <span>Email</span>
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

                <label className="cs-field">
                  <span>I am a...</span>
                  <select name="role" required defaultValue="">
                    <option value="" disabled>Select your role</option>
                    {ROLE_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>

                <label className="cs-field">
                  <span>Main interest</span>
                  <select name="interest" required defaultValue="">
                    <option value="" disabled>What brings you here?</option>
                    {INTEREST_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>

                <label className="cs-honeypot" aria-hidden="true">
                  Company website
                  <input name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              <label className="cs-consent">
                <input name="consent" type="checkbox" required />
                <span>Vendrome may use these details to manage the waitlist and send launch updates.</span>
              </label>

              <div className="cs-turnstile">
                <div ref={turnstileContainerRef} />
                <span>{turnstileReady ? 'Security check complete' : 'Protected by Cloudflare Turnstile'}</span>
              </div>

              <button className="cs-submit" type="submit" disabled={submission.kind === 'submitting'}>
                <span>{submission.kind === 'submitting' ? 'Saving your place...' : 'Reserve my place'}</span>
                <span aria-hidden="true">
                  <Armchair size={19} strokeWidth={2.1} />
                </span>
              </button>

              <p
                className={`cs-status ${submission.kind}`}
                role={submission.kind === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {submission.message}
              </p>
            </form>
            </div>

            <p className="cs-privacy">No spam. No selling your data. Just launch updates.</p>
          </div>
        </div>
      )}

      <div className="cs-ticker" aria-hidden="true">
        <div className="cs-ticker-track">
          {[...WORLD_TICKER, ...WORLD_TICKER].map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <footer className="cs-foot">
        <span>&copy; 2026 Vendrome</span>
        <span className="cs-foot-tag">The Social Economy</span>
      </footer>
    </main>
  );
}

export default ComingSoonPage;
