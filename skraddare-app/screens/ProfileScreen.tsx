import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { IconUser, IconMail, IconLock, IconEye, IconEyeOff, IconPhone } from '@tabler/icons-react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  User,
} from 'firebase/auth';
import { doc, setDoc, collection, query, where, onSnapshot, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { type Order } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';

type View = 'loading' | 'login' | 'signup' | 'profile';

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
  pending_payment:  colors.linen,
  paid:             colors.amber,
  in_progress:      colors.moss,
  ready_for_pickup: '#ede9fe',
  completed:        '#dcfce7',
  collected:        '#d1fae5',
  cancelled:        '#fee2e2',
};
const STATUS_TEXT: Record<string, string> = {
  pending_payment:  colors.textMuted,
  paid:             colors.amberText,
  in_progress:      colors.forestDark,
  ready_for_pickup: '#6d28d9',
  completed:        '#15803d',
  collected:        '#065f46',
  cancelled:        '#dc2626',
};

export default function ProfileScreen() {
  const [view, setView]       = useState<View>('loading');
  const [user, setUser]       = useState<User | null>(null);
  const [orders, setOrders]   = useState<Order[]>([]);

  // Form state
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [formError, setFormError]   = useState('');
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
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            } as Order;
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
    setName(''); setEmail(''); setPhone(''); setPassword(''); setFormError(''); setShowPass(false);
  }

  async function handleLogin() {
    if (!email.trim() || !password) { setFormError('Fyll i e-post och lösenord.'); return; }
    setSubmitting(true); setFormError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      clearForm();
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setFormError('Fel e-post eller lösenord.');
      } else {
        setFormError('Inloggning misslyckades. Försök igen.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup() {
    if (!name.trim())    { setFormError('Ange ditt namn.'); return; }
    if (!email.trim())   { setFormError('Ange din e-post.'); return; }
    if (!phone.trim())   { setFormError('Ange ditt telefonnummer.'); return; }
    if (password.length < 6) { setFormError('Lösenordet måste vara minst 6 tecken.'); return; }
    setSubmitting(true); setFormError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      // Save customer profile to Firestore for admin visibility
      await setDoc(doc(db, 'customers', cred.user.uid), {
        uid:       cred.user.uid,
        name:      name.trim(),
        email:     email.trim(),
        phone:     phone.trim(),
        createdAt: serverTimestamp(),
      });
      clearForm();
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/email-already-in-use') {
        setFormError('E-postadressen används redan.');
      } else if (code === 'auth/invalid-email') {
        setFormError('Ogiltig e-postadress.');
      } else {
        setFormError('Kontot kunde inte skapas. Försök igen.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logga ut', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <View style={styles.container}>
        <TopBar title="Min profil" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.forestMid} />
        </View>
      </View>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  if (view === 'login') {
    return (
      <View style={styles.container}>
        <TopBar title="Min profil" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarCircle}>
              <IconUser size={34} color={colors.forestMid} strokeWidth={1.5} />
            </View>
            <Text style={[typography.h2, styles.authTitle]}>Logga in</Text>
            <Text style={[typography.body, styles.authSub]}>Välkommen tillbaka!</Text>

            <AuthInput
              icon={<IconMail size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="E-postadress"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              icon={<IconLock size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="Lösenord"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  {showPass
                    ? <IconEyeOff size={16} color={colors.textMuted} strokeWidth={1.5} />
                    : <IconEye    size={16} color={colors.textMuted} strokeWidth={1.5} />}
                </TouchableOpacity>
              }
            />

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <CTAButton
              label={submitting ? 'Loggar in…' : 'Logga in'}
              onPress={handleLogin}
              disabled={submitting}
            />

            <TouchableOpacity style={styles.switchRow} onPress={() => { clearForm(); setView('signup'); }}>
              <Text style={typography.small}>Har du inget konto? </Text>
              <Text style={[typography.small, styles.link]}>Skapa konto</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Sign up ──────────────────────────────────────────────────────────────────
  if (view === 'signup') {
    return (
      <View style={styles.container}>
        <TopBar title="Skapa konto" onBack={() => { clearForm(); setView('login'); }} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarCircle}>
              <IconUser size={34} color={colors.forestMid} strokeWidth={1.5} />
            </View>
            <Text style={[typography.h2, styles.authTitle]}>Skapa konto</Text>
            <Text style={[typography.body, styles.authSub]}>Spara dina ordrar och följ din tvätt.</Text>

            <AuthInput
              icon={<IconUser size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="Fullständigt namn"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <AuthInput
              icon={<IconMail size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="E-postadress"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              icon={<IconPhone size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="Telefonnummer"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            <AuthInput
              icon={<IconLock size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="Lösenord (minst 6 tecken)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  {showPass
                    ? <IconEyeOff size={16} color={colors.textMuted} strokeWidth={1.5} />
                    : <IconEye    size={16} color={colors.textMuted} strokeWidth={1.5} />}
                </TouchableOpacity>
              }
            />

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <CTAButton
              label={submitting ? 'Skapar konto…' : 'Skapa konto'}
              onPress={handleSignup}
              disabled={submitting}
            />

            <TouchableOpacity style={styles.switchRow} onPress={() => { clearForm(); setView('login'); }}>
              <Text style={typography.small}>Har du redan ett konto? </Text>
              <Text style={[typography.small, styles.link]}>Logga in</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Profile ──────────────────────────────────────────────────────────────────
  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={styles.container}>
      <TopBar title="Min profil" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatarCircle}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <Text style={[typography.h3, { marginTop: spacing.md }]}>
            {user?.displayName ?? 'Användare'}
          </Text>
          <Text style={[typography.small, { marginTop: 2, color: colors.textMuted }]}>
            {user?.email}
          </Text>
        </View>

        {/* Orders */}
        <Text style={[typography.h3, { marginBottom: spacing.md }]}>Mina ordrar</Text>

        {orders.length === 0 ? (
          <View style={styles.emptyOrders}>
            <Text style={typography.body}>Inga beställningar än.</Text>
            <Text style={[typography.small, { marginTop: spacing.xs }]}>
              Välj en tjänst för att boka!
            </Text>
          </View>
        ) : (
          orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderInfo}>
                <Text style={typography.bodyBold}>{order.serviceName}</Text>
                <Text style={[typography.small, { marginTop: 2, color: colors.textMuted }]}>
                  {order.createdAt.toLocaleDateString('sv-SE')}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_BG[order.status] ?? colors.linen }]}>
                <Text style={[typography.micro, { color: STATUS_TEXT[order.status] ?? colors.textMuted }]}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </Text>
              </View>
            </View>
          ))
        )}

        <CTAButton
          label="Logga ut"
          onPress={handleSignOut}
          variant="secondary"
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

// ── AuthInput ─────────────────────────────────────────────────────────────────

function AuthInput({
  icon, rightIcon, placeholder, value, onChangeText,
  secureTextEntry, keyboardType, autoCapitalize,
}: {
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={inputStyles.wrap}>
      {icon && <View style={inputStyles.iconLeft}>{icon}</View>}
      <TextInput
        style={[inputStyles.input, icon && { paddingLeft: 40 }, rightIcon && { paddingRight: 40 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
      />
      {rightIcon && <View style={inputStyles.iconRight}>{rightIcon}</View>}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap:      { position: 'relative', marginBottom: spacing.sm },
  input: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   13,
    fontFamily:        'DMSans_400',
    fontSize:          15,
    color:             colors.textDark,
  },
  iconLeft:  { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  iconRight: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  authContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'stretch',
  },
  authTitle: { textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.xs },
  authSub:   { textAlign: 'center', color: colors.textMuted, marginBottom: spacing.xl },

  avatarBlock:  { alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.sm },
  avatarCircle: {
    width:           80,
    height:          80,
    borderRadius:    radius.pill,
    backgroundColor: colors.moss,
    alignItems:      'center',
    justifyContent:  'center',
    alignSelf:       'center',
    marginBottom:    spacing.sm,
  },
  initials: {
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   28,
    color:      colors.forestDark,
  },

  emptyOrders: {
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    marginBottom:    spacing.md,
  },

  orderCard: {
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    marginBottom:    spacing.sm,
  },
  orderInfo: { flex: 1 },
  badge: {
    borderRadius:    radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.xs,
  },

  error: {
    color:         '#dc2626',
    fontFamily:    'DMSans_400',
    fontSize:      13,
    marginBottom:  spacing.sm,
    textAlign:     'center',
  },
  switchRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      spacing.lg,
  },
  link: { color: colors.forestDark, fontFamily: 'DMSans_500' },
});
