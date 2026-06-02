'use client';

import { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, signOut, User,
} from 'firebase/auth';
import {
  doc, setDoc, collection, query, where, onSnapshot, Timestamp, serverTimestamp,
} from 'firebase/firestore';
import {
  IconUser, IconMail, IconLock, IconEye, IconEyeOff, IconPhone,
} from '@tabler/icons-react';
import { auth, db } from '@/lib/firebase-client';

type OrderStatus = 'pending_payment' | 'paid' | 'collected' | 'in_progress' | 'ready_for_pickup' | 'completed' | 'cancelled';
type Order = { id: string; serviceName: string; status: OrderStatus; createdAt: Date };

const STATUS_LABEL: Record<string, string> = {
  pending_payment:  'Väntar på betalning',
  paid:             'Betald',
  in_progress:      'Pågår',
  ready_for_pickup: 'Redo för hämtning',
  completed:        'Klar',
  collected:        'Hämtad',
  cancelled:        'Avbokad',
};
const STATUS_BG: Record<string, string> = {
  pending_payment:  '#ede8de',
  paid:             '#fde8a0',
  in_progress:      '#c8dfc0',
  ready_for_pickup: '#ede9fe',
  completed:        '#dcfce7',
  collected:        '#d1fae5',
  cancelled:        '#fee2e2',
};
const STATUS_TEXT: Record<string, string> = {
  pending_payment:  '#7a9480',
  paid:             '#7a5a00',
  in_progress:      '#2d5a3d',
  ready_for_pickup: '#6d28d9',
  completed:        '#15803d',
  collected:        '#065f46',
  cancelled:        '#dc2626',
};

type ViewMode = 'loading' | 'login' | 'signup' | 'profile';

function AuthInput({
  icon, rightSlot, placeholder, value, onChange, type = 'text', autoComplete,
}: {
  icon: React.ReactNode;
  rightSlot?: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div className="auth-input-wrap">
      <span className="auth-icon-left">{icon}</span>
      <input
        className="input"
        style={{ paddingLeft: 40, paddingRight: rightSlot ? 40 : undefined }}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
      />
      {rightSlot && <span className="auth-icon-right">{rightSlot}</span>}
    </div>
  );
}

export default function ProfilPage() {
  const [view,       setView]       = useState<ViewMode>('loading');
  const [user,       setUser]       = useState<User | null>(null);
  const [orders,     setOrders]     = useState<Order[]>([]);

  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [formError,  setFormError]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser);
      setView(currentUser ? 'profile' : 'login');

      if (currentUser) {
        const q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
        const unsubOrders = onSnapshot(q, snap => {
          const list = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              serviceName: data.serviceName,
              status: data.status as OrderStatus,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            };
          });
          setOrders(list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
        });
        return unsubOrders;
      } else {
        setOrders([]);
      }
    });
    return unsub;
  }, []);

  function clearForm() {
    setName(''); setEmail(''); setPhone(''); setPassword('');
    setFormError(''); setShowPass(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setFormError('Fyll i e-post och lösenord.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      clearForm();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)) {
        setFormError('Fel e-post eller lösenord.');
      } else {
        setFormError('Inloggning misslyckades. Försök igen.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim())     { setFormError('Ange ditt namn.'); return; }
    if (!email.trim())    { setFormError('Ange din e-post.'); return; }
    if (!phone.trim())    { setFormError('Ange ditt telefonnummer.'); return; }
    if (password.length < 6) { setFormError('Lösenordet måste vara minst 6 tecken.'); return; }
    setSubmitting(true); setFormError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, 'customers', cred.user.uid), {
        uid: cred.user.uid, name: name.trim(), email: email.trim(),
        phone: phone.trim(), createdAt: serverTimestamp(),
      });
      clearForm();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/email-already-in-use') setFormError('E-postadressen används redan.');
      else if (code === 'auth/invalid-email')   setFormError('Ogiltig e-postadress.');
      else setFormError('Kontot kunde inte skapas. Försök igen.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!confirm('Är du säker på att du vill logga ut?')) return;
    await signOut(auth);
  }

  // Loading
  if (view === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 50, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    );
  }

  // Login
  if (view === 'login') {
    return (
      <form onSubmit={handleLogin} className="auth-content">
        <div className="auth-avatar">
          <IconUser size={34} stroke={1.5} />
        </div>
        <div className="h2" style={{ textAlign: 'center', marginTop: 16, marginBottom: 4 }}>Logga in</div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
          Välkommen tillbaka!
        </p>

        <AuthInput
          icon={<IconMail size={16} stroke={1.5} />}
          placeholder="E-postadress"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
        />
        <AuthInput
          icon={<IconLock size={16} stroke={1.5} />}
          placeholder="Lösenord"
          value={password}
          onChange={setPassword}
          type={showPass ? 'text' : 'password'}
          autoComplete="current-password"
          rightSlot={
            <button type="button" className="auth-icon-right" onClick={() => setShowPass(v => !v)}>
              {showPass ? <IconEyeOff size={16} stroke={1.5} /> : <IconEye size={16} stroke={1.5} />}
            </button>
          }
        />

        {formError && <p className="error-msg">{formError}</p>}

        <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Loggar in…' : 'Logga in'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 4 }}>
          <span className="small">Har du inget konto?</span>
          <button type="button" className="small" style={{ color: 'var(--forest-dark)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { clearForm(); setView('signup'); }}>
            Skapa konto
          </button>
        </div>
      </form>
    );
  }

  // Sign up
  if (view === 'signup') {
    return (
      <form onSubmit={handleSignup} className="auth-content">
        <div className="auth-avatar">
          <IconUser size={34} stroke={1.5} />
        </div>
        <div className="h2" style={{ textAlign: 'center', marginTop: 16, marginBottom: 4 }}>Skapa konto</div>
        <p className="body" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 24 }}>
          Spara dina ordrar och följ din tvätt.
        </p>

        <AuthInput icon={<IconUser size={16} stroke={1.5} />} placeholder="Fullständigt namn"
          value={name} onChange={setName} autoComplete="name" />
        <AuthInput icon={<IconMail size={16} stroke={1.5} />} placeholder="E-postadress"
          value={email} onChange={setEmail} type="email" autoComplete="email" />
        <AuthInput icon={<IconPhone size={16} stroke={1.5} />} placeholder="Telefonnummer"
          value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
        <AuthInput
          icon={<IconLock size={16} stroke={1.5} />}
          placeholder="Lösenord (minst 6 tecken)"
          value={password}
          onChange={setPassword}
          type={showPass ? 'text' : 'password'}
          autoComplete="new-password"
          rightSlot={
            <button type="button" className="auth-icon-right" onClick={() => setShowPass(v => !v)}>
              {showPass ? <IconEyeOff size={16} stroke={1.5} /> : <IconEye size={16} stroke={1.5} />}
            </button>
          }
        />

        {formError && <p className="error-msg">{formError}</p>}

        <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Skapar konto…' : 'Skapa konto'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, gap: 4 }}>
          <span className="small">Har du redan ett konto?</span>
          <button type="button" className="small" style={{ color: 'var(--forest-dark)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => { clearForm(); setView('login'); }}>
            Logga in
          </button>
        </div>
      </form>
    );
  }

  // Profile
  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="profile-page">
      {/* Sidebar: avatar + sign out */}
      <div className="profile-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--sp-xl)' }}>
          <div style={{
            width: 88, height: 88, borderRadius: 9999, background: 'var(--moss)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: 30, color: 'var(--forest-dark)' }}>
              {initials}
            </span>
          </div>
          <div className="h3">{user?.displayName ?? 'Användare'}</div>
          <div className="small" style={{ marginTop: 2 }}>{user?.email}</div>
        </div>
        <button className="btn-secondary" onClick={handleSignOut}>
          Logga ut
        </button>
      </div>

      {/* Main: orders list */}
      <div>
        <div className="h3" style={{ marginBottom: 'var(--sp-md)' }}>Mina ordrar</div>

        {orders.length === 0 ? (
          <div style={{
            background: 'var(--linen)', borderRadius: 'var(--radius-lg)', padding: 'var(--sp-lg)',
          }}>
            <div className="body">Inga beställningar än.</div>
            <div className="small" style={{ marginTop: 4 }}>Välj en tjänst för att boka!</div>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-card-info">
                <div className="body-bold">{order.serviceName}</div>
                <div className="small" style={{ marginTop: 2 }}>
                  {order.createdAt.toLocaleDateString('sv-SE')}
                </div>
              </div>
              <div className="status-badge" style={{
                background: STATUS_BG[order.status] ?? '#ede8de',
                color:      STATUS_TEXT[order.status] ?? '#7a9480',
              }}>
                {STATUS_LABEL[order.status] ?? order.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
