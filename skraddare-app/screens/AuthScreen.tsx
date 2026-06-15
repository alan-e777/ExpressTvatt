import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { IconUser, IconMail, IconLock, IconEye, IconEyeOff, IconPhone } from '@tabler/icons-react-native';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import CTAButton from '../components/CTAButton';
import Logo from '../components/Logo';
import ScreenBackground from '../components/ScreenBackground';

// Fullscreen authentication gate. Rendered (instead of the tab navigator) whenever
// no user is signed in — "no authentication = no access". On success, the root
// auth listener swaps in the tabs automatically.
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode]   = useState<'login' | 'signup'>('login');

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() { setName(''); setEmail(''); setPhone(''); setPassword(''); setError(''); setShowPass(false); }

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Fyll i e-post och lösenord.'); return; }
    setSubmitting(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      const code = e?.code ?? '';
      setError(['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)
        ? 'Fel e-post eller lösenord.' : 'Inloggning misslyckades. Försök igen.');
    } finally { setSubmitting(false); }
  }

  async function handleSignup() {
    if (!name.trim())        { setError('Ange ditt namn.'); return; }
    if (!email.trim())       { setError('Ange din e-post.'); return; }
    if (!phone.trim())       { setError('Ange ditt telefonnummer.'); return; }
    if (password.length < 6) { setError('Lösenordet måste vara minst 6 tecken.'); return; }
    setSubmitting(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, 'customers', cred.user.uid), {
        uid: cred.user.uid, name: name.trim(), email: email.trim(),
        phone: phone.trim(), createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/email-already-in-use') setError('E-postadressen används redan.');
      else if (code === 'auth/invalid-email')   setError('Ogiltig e-postadress.');
      else setError('Kontot kunde inte skapas. Försök igen.');
    } finally { setSubmitting(false); }
  }

  const isLogin = mode === 'login';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenBackground />
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={styles.brand}>
            <Logo size="lg" />
            <Text style={styles.tagline}>Kemtvätt · Upphämtning · Hemleverans</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>{isLogin ? 'Logga in' : 'Skapa konto'}</Text>
            <Text style={styles.sub}>
              {isLogin ? 'Välkommen tillbaka!' : 'Spara dina ordrar och följ din tvätt.'}
            </Text>

            {!isLogin && (
              <Field icon={<IconUser size={16} color={colors.textMuted} strokeWidth={1.5} />}
                placeholder="Fullständigt namn" value={name} onChangeText={setName} autoCapitalize="words" />
            )}
            <Field icon={<IconMail size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder="E-postadress" value={email} onChangeText={setEmail} keyboardType="email-address" />
            {!isLogin && (
              <Field icon={<IconPhone size={16} color={colors.textMuted} strokeWidth={1.5} />}
                placeholder="Telefonnummer" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            )}
            <Field
              icon={<IconLock size={16} color={colors.textMuted} strokeWidth={1.5} />}
              placeholder={isLogin ? 'Lösenord' : 'Lösenord (minst 6 tecken)'}
              value={password} onChangeText={setPassword} secureTextEntry={!showPass}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                  {showPass ? <IconEyeOff size={16} color={colors.textMuted} strokeWidth={1.5} />
                            : <IconEye    size={16} color={colors.textMuted} strokeWidth={1.5} />}
                </TouchableOpacity>
              }
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <CTAButton
              label={submitting ? (isLogin ? 'Loggar in…' : 'Skapar konto…') : (isLogin ? 'Logga in' : 'Skapa konto')}
              onPress={isLogin ? handleLogin : handleSignup}
              disabled={submitting}
              style={{ marginTop: spacing.sm }}
            />

            <View style={styles.switchRow}>
              <Text style={typography.small}>{isLogin ? 'Har du inget konto? ' : 'Har du redan ett konto? '}</Text>
              <TouchableOpacity onPress={() => { reset(); setMode(isLogin ? 'signup' : 'login'); }}>
                <Text style={styles.link}>{isLogin ? 'Skapa konto' : 'Logga in'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon, rightIcon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize,
}: {
  icon: React.ReactNode; rightIcon?: React.ReactNode; placeholder: string;
  value: string; onChangeText: (v: string) => void;
  secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldIconLeft}>{icon}</View>
      <TextInput
        style={[styles.input, rightIcon ? { paddingRight: 40 } : null]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
      />
      {rightIcon && <View style={styles.fieldIconRight}>{rightIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingBottom: spacing.xxl },

  brand:   { alignItems: 'center', marginBottom: spacing.xl },
  tagline: { fontFamily: 'Inter_400', fontSize: 12, color: colors.moss, marginTop: spacing.md, letterSpacing: 0.3 },

  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.xs } as any,
  sub:   { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl } as any,

  fieldWrap: { position: 'relative', marginBottom: spacing.sm },
  fieldIconLeft:  { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  fieldIconRight: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  input: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingLeft: 40,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Inter_400',
    fontSize: 15,
    color: colors.textDark,
  },

  error: { color: '#dc2626', fontFamily: 'Inter_400', fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  link: { ...typography.small, color: colors.forestDark, fontFamily: 'Inter_600' } as any,
});
