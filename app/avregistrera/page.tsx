'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Where an unsubscribe link from a marketing email lands.
 *
 * The POST fires automatically on load, so the customer clicks once — in the
 * email — and is done. Withdrawal has to be as easy as consent was
 * (GDPR art. 7(3)), and a "click here to confirm you really meant it" step is
 * exactly the friction that rule exists to prevent.
 *
 * Doing the write from JavaScript rather than on page load server-side is what
 * keeps link scanners from unsubscribing people: they fetch the URL, they do
 * not run the page and issue its POST. See the route for the rest of that
 * reasoning.
 */

type State = 'working' | 'done' | 'invalid' | 'failed';

function UnsubscribeInner() {
  const params = useSearchParams();
  const uid = params.get('u') ?? '';
  // Guests have no uid — their link carries the email instead. See
  // lib/unsubscribe.ts for why the two are signed separately.
  const email = params.get('e') ?? '';
  const token = params.get('t') ?? '';

  const [state, setState] = useState<State>('working');
  // React 18 StrictMode mounts effects twice in development; without this the
  // write would fire twice. Harmless (it is idempotent) but confusing in logs.
  const fired = useRef(false);

  async function submit() {
    setState('working');
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uid ? { uid, token } : { email, token }),
      });
      if (res.ok) { setState('done'); return; }
      setState(res.status === 403 ? 'invalid' : 'failed');
    } catch {
      setState('failed');
    }
  }

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if ((!uid && !email) || !token) { setState('invalid'); return; }
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'working') {
    return (
      <div className="success-box">
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
          Avregistrerar…
        </p>
      </div>
    );
  }

  if (state === 'invalid') {
    return (
      <div className="success-box">
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>
          Länken fungerar inte
        </div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, maxWidth: 360 }}>
          Länken kan ha kopierats fel. Du kan alltid stänga av utskicken själv
          under Utskick på din profil, eller mejla oss på{' '}
          <a href="mailto:info@expresstvatt.se" style={{ color: 'var(--forest-dark)' }}>info@expresstvatt.se</a>.
        </p>
        <Link href="/profil" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Till min profil
        </Link>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="success-box">
        <div className="h2" style={{ marginBottom: 12, textAlign: 'center' }}>
          Något gick fel
        </div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, maxWidth: 360 }}>
          Vi kunde inte avregistrera dig just nu. Försök igen — eller mejla{' '}
          <a href="mailto:info@expresstvatt.se" style={{ color: 'var(--forest-dark)' }}>info@expresstvatt.se</a>,
          så ordnar vi det åt dig.
        </p>
        <button type="button" className="btn-primary" onClick={submit}>
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div className="success-box">
      <div className="success-icon-circle">✓</div>
      <div className="h2" style={{ marginBottom: 10, textAlign: 'center' }}>Du är avregistrerad</div>
      <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20, maxWidth: 360 }}>
        Du får inga fler erbjudanden eller nyhetsbrev från oss. Mejl om dina
        egna ordrar påverkas inte — dem behöver du för att följa din tvätt.
      </p>
      <p className="small" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28, maxWidth: 340, lineHeight: 1.6 }}>
        Ångrar du dig kan du slå på utskicken igen under Utskick på din profil.
      </p>
      <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Tillbaka till startsidan
      </Link>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="success-box">
          <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Laddar…</p>
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
