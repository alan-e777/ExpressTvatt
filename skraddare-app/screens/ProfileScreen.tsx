import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { IconUser, IconMail, IconPhone, IconMapPin, IconPlus } from '@tabler/icons-react-native';
import { signOut, type User } from 'firebase/auth';
import {
  doc, setDoc, updateDoc, collection, query, where, onSnapshot,
  Timestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { type Order } from '../types';
import { formatPersonnummer, isValidPersonnummer, RUT_DISCOUNT_PERCENT } from '../lib/rut';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import ScreenBackground from '../components/ScreenBackground';
import { useCollapsibleHeader } from '../lib/useCollapsibleHeader';
import CTAButton from '../components/CTAButton';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ActiveOrderCard from '../components/home/ActiveOrderCard';

type SavedAddress = { address: string; postalCode: string; deliveryNote?: string };

// Active orders surface in the dedicated card; everything appears in the history list.
const ACTIVE_STATUSES = ['paid', 'collected', 'in_progress', 'ready_for_pickup'];

// Status vocabulary + badge colours — identical to the website profil page.
const STATUS_LABEL: Record<string, string> = {
  pending_payment:  'Väntar på betalning',
  paid:             'Betald',
  in_progress:      'Pågår',
  ready_for_pickup: 'Redo för leverans',
  completed:        'Klar',
  collected:        'Hämtad',
  delivered:        'Levererad',
  cancelled:        'Avbokad',
  payment_failed:   'Betalning misslyckades',
  refunded:         'Återbetald',
};
const STATUS_BG: Record<string, string> = {
  pending_payment: '#ede8de', paid: '#fde8a0', in_progress: '#c8dfc0', ready_for_pickup: '#ede9fe',
  completed: '#dcfce7', collected: '#d1fae5', delivered: '#bbf7d0', cancelled: '#fee2e2',
  payment_failed: '#fee2e2', refunded: '#ede8de',
};
const STATUS_TEXT: Record<string, string> = {
  pending_payment: '#7a9480', paid: '#7a5a00', in_progress: '#2d5a3d', ready_for_pickup: '#6d28d9',
  completed: '#15803d', collected: '#065f46', delivered: '#15803d', cancelled: '#dc2626',
  payment_failed: '#b91c1c', refunded: '#374151',
};

export default function ProfileScreen() {
  const header = useCollapsibleHeader();
  const [user, setUser]       = useState<User | null>(auth.currentUser);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [phone, setPhone]     = useState('');
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  // Address form state
  const [showAddForm, setShowAddForm]           = useState(false);
  const [newAddr, setNewAddr]                   = useState('');
  const [newZip, setNewZip]                     = useState('');
  const [newDeliveryNote, setNewDeliveryNote]   = useState('');
  const [newAddrConfirmed, setNewAddrConfirmed] = useState(false);
  const [addrError, setAddrError]               = useState('');
  const [savingAddr, setSavingAddr]             = useState(false);
  const [deletingIdx, setDeletingIdx]           = useState<number | null>(null);

  // RUT-Avdrag
  const [rutEnabled, setRutEnabled]           = useState(false);
  const [rutPersonnummer, setRutPersonnummer] = useState('');
  const [savingRut, setSavingRut]             = useState(false);
  const [rutError, setRutError]               = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) { setOrders([]); return; }
    const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        } as Order;
      });
      setOrders(list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) { setPhone(''); setAddresses([]); setRutEnabled(false); setRutPersonnummer(''); return; }
    const unsub = onSnapshot(doc(db, 'customers', user.uid), snap => {
      const data = snap.data();
      setPhone(data?.phone ?? '');
      setAddresses((data?.addresses ?? []) as SavedAddress[]);
      setRutEnabled(!!data?.rutEnabled);
      setRutPersonnummer(formatPersonnummer((data?.personnummer ?? '') as string));
    });
    return unsub;
  }, [user]);

  function handleSignOut() {
    Alert.alert('Logga ut', 'Är du säker på att du vill logga ut?', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Logga ut', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  }

  async function handleAddAddress() {
    if (!user) return;
    if (!newAddrConfirmed || !newAddr.trim()) { setAddrError('Välj en adress från förslagslistan.'); return; }
    setAddrError(''); setSavingAddr(true);
    try {
      await setDoc(doc(db, 'customers', user.uid), {
        addresses: arrayUnion({ address: newAddr.trim(), postalCode: newZip.trim(), deliveryNote: newDeliveryNote.trim() }),
      }, { merge: true });
      setNewAddr(''); setNewZip(''); setNewDeliveryNote(''); setNewAddrConfirmed(false); setShowAddForm(false);
    } catch {
      setAddrError('Kunde inte spara. Försök igen.');
    } finally {
      setSavingAddr(false);
    }
  }

  async function handleDeleteAddress(a: SavedAddress, idx: number) {
    if (!user) return;
    setDeletingIdx(idx);
    try {
      await updateDoc(doc(db, 'customers', user.uid), { addresses: arrayRemove(a) });
    } catch { /* ignore */ } finally {
      setDeletingIdx(null);
    }
  }

  async function persistRut(enabled: boolean, pnr: string) {
    if (!user) return;
    setSavingRut(true);
    try {
      await setDoc(doc(db, 'customers', user.uid), { rutEnabled: enabled, personnummer: pnr }, { merge: true });
    } catch {
      setRutError('Kunde inte spara. Försök igen.');
    } finally {
      setSavingRut(false);
    }
  }
  async function toggleRut() {
    setRutError('');
    if (rutEnabled) { setRutEnabled(false); await persistRut(false, rutPersonnummer); }
    else { setRutEnabled(true); if (isValidPersonnummer(rutPersonnummer)) await persistRut(true, rutPersonnummer); }
  }
  async function handleSaveRut() {
    if (!isValidPersonnummer(rutPersonnummer)) { setRutError('Ange ett giltigt 10-siffrigt personnummer.'); return; }
    setRutError('');
    await persistRut(true, rutPersonnummer);
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));

  return (
    <View style={styles.container}>
      <ScreenBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingTop: header.headerHeight }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScroll={header.onScroll}
          scrollEventThrottle={16}
        >

          {/* Avatar / user */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatarCircle}><Text style={styles.initials}>{initials}</Text></View>
            <Text style={[typography.h3, { marginTop: spacing.md, color: colors.white }]}>{user?.displayName ?? 'Användare'}</Text>
            <Text style={[typography.small, { marginTop: 2, color: colors.moss }]}>{user?.email}</Text>
          </View>

          {/* Active orders */}
          <Text style={styles.sectionTitle}>Pågående ärenden</Text>
          {activeOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={typography.body}>Inga pågående ärenden.</Text>
              <Text style={[typography.small, { marginTop: spacing.xs }]}>Välj en tjänst på startsidan för att boka.</Text>
            </View>
          ) : (
            <View style={{ marginBottom: spacing.md }}>
              <ActiveOrderCard orders={activeOrders} />
            </View>
          )}

          {/* Order history */}
          <Text style={styles.sectionTitle}>Mina ordrar</Text>
          {orders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={typography.body}>Inga beställningar än.</Text>
              <Text style={[typography.small, { marginTop: spacing.xs }]}>Välj en tjänst för att boka!</Text>
            </View>
          ) : (
            orders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={typography.bodyBold} numberOfLines={1}>{order.serviceName}</Text>
                  <Text style={[typography.small, { marginTop: 2 }]}>{order.createdAt.toLocaleDateString('sv-SE')}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[order.status] ?? '#ede8de' }]}>
                  <Text style={[styles.statusText, { color: STATUS_TEXT[order.status] ?? '#7a9480' }]}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Account info */}
          <Text style={styles.sectionTitle}>Kontouppgifter</Text>
          <View style={styles.infoCard}>
            <InfoRow icon={<IconUser size={16} color={colors.forestMid} strokeWidth={1.5} />} label="Namn" value={user?.displayName ?? '—'} />
            <InfoRow icon={<IconMail size={16} color={colors.forestMid} strokeWidth={1.5} />} label="E-post" value={user?.email ?? '—'} />
            <InfoRow icon={<IconPhone size={16} color={colors.forestMid} strokeWidth={1.5} />} label="Telefon" value={phone || '—'} last />
          </View>

          {/* Addresses */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }]}>Mina adresser</Text>
            <TouchableOpacity onPress={() => { setShowAddForm(v => !v); setAddrError(''); }} style={styles.addBtn} activeOpacity={0.7}>
              <IconPlus size={14} color={colors.forestDark} strokeWidth={2} />
              <Text style={styles.addBtnText}>{showAddForm ? 'Avbryt' : 'Lägg till'}</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 && !showAddForm && (
            <View style={styles.emptyCard}>
              <Text style={typography.small}>Inga sparade adresser.</Text>
              <Text style={[typography.small, { marginTop: spacing.xs }]}>Adresser sparas automatiskt när du genomför en bokning.</Text>
            </View>
          )}

          {addresses.map((a, i) => (
            <View key={i} style={styles.addressCard}>
              <View style={styles.addressIcon}><IconMapPin size={16} color={colors.forestMid} strokeWidth={1.5} /></View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyBold}>{a.address}</Text>
                {(a.postalCode || a.deliveryNote) ? (
                  <Text style={[typography.small, { marginTop: 2 }]}>{[a.postalCode, a.deliveryNote || ''].filter(Boolean).join(' · ')}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => handleDeleteAddress(a, i)} disabled={deletingIdx === i} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.removeX}>{deletingIdx === i ? '…' : '×'}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {showAddForm && (
            <View style={styles.addForm}>
              <Text style={styles.fieldLabel}>Adress</Text>
              <AddressAutocomplete
                value={newAddr}
                onChange={v => { setNewAddr(v); setNewAddrConfirmed(false); }}
                onSelect={(addr, zip) => { setNewAddr(addr); setNewZip(zip); }}
                onConfirmChange={setNewAddrConfirmed}
                inputStyle={{ backgroundColor: colors.mint }}
              />
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Leveransanteckning (valfritt)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="t.ex. C/O Andersson, portkod 1234"
                placeholderTextColor={colors.textMuted}
                value={newDeliveryNote} onChangeText={setNewDeliveryNote}
              />
              {addrError ? <Text style={styles.error}>{addrError}</Text> : null}
              <CTAButton label={savingAddr ? 'Sparar…' : 'Spara adress'} onPress={handleAddAddress} disabled={savingAddr} style={{ marginTop: spacing.md }} />
            </View>
          )}

          {/* RUT-Avdrag */}
          <Text style={styles.sectionTitle}>RUT-Avdrag</Text>
          <View style={styles.rutCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={typography.bodyBold}>Aktivera RUT-avdrag</Text>
                <Text style={[typography.small, { marginTop: 2, lineHeight: 18 }]}>
                  Få {RUT_DISCOUNT_PERCENT}% i skattereduktion. Spara ditt personnummer så fylls det i automatiskt i kassan.
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleRut}
                disabled={savingRut}
                activeOpacity={0.8}
                style={[styles.switchTrack, rutEnabled && styles.switchTrackOn]}
              >
                <View style={[styles.switchKnob, rutEnabled && styles.switchKnobOn]} />
              </TouchableOpacity>
            </View>

            {rutEnabled && (
              <View style={styles.rutForm}>
                <Text style={styles.fieldLabel}>10-siffrigt Personnummer</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="ÅÅMMDD-XXXX" placeholderTextColor={colors.textMuted}
                  value={rutPersonnummer} onChangeText={t => { setRutPersonnummer(formatPersonnummer(t)); setRutError(''); }}
                  keyboardType="number-pad" maxLength={11}
                />
                {rutError ? <Text style={styles.error}>{rutError}</Text> : null}
                <CTAButton label={savingRut ? 'Sparar…' : 'Spara personnummer'} onPress={handleSaveRut} disabled={savingRut} style={{ marginTop: spacing.md }} />
              </View>
            )}
          </View>

          <CTAButton label="Logga ut" onPress={handleSignOut} variant="secondary" style={{ marginTop: spacing.xl }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        style={[styles.header, { transform: [{ translateY: header.translateY }], opacity: header.opacity }]}
        onLayout={e => header.onHeaderLayout(e.nativeEvent.layout.height)}
      >
        <TopBar />
      </Animated.View>
    </View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.rowBorder]}>
      <View style={infoStyles.iconWrap}>{icon}</View>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(15,23,42,0.1)' },
  iconWrap: { width: 24, alignItems: 'center' },
  label: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMuted, width: 64 },
  value: { flex: 1, textAlign: 'right', fontFamily: 'Inter_500', fontSize: 13, color: colors.textDark },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },
  header:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },

  avatarBlock:  { alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.sm },
  avatarCircle: { width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.sm },
  initials: { fontFamily: 'Inter_700', fontSize: 28, color: colors.forestDark },

  sectionTitle: { ...typography.h3, color: colors.white, marginTop: spacing.lg, marginBottom: spacing.md } as any,
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.moss, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  addBtnText: { fontFamily: 'Inter_500', fontSize: 12, color: colors.forestDark },

  emptyCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  infoCard:  { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, marginBottom: spacing.md },

  // Order history row
  orderCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm,
  },
  statusBadge: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { fontFamily: 'Inter_600', fontSize: 11 },

  addressCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  addressIcon: { width: 36, height: 36, borderRadius: radius.circle, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  removeX: { fontFamily: 'Inter_400', fontSize: 20, color: colors.textMuted, paddingHorizontal: 6, lineHeight: 22 },

  addForm: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm } as any,
  noteInput: { backgroundColor: colors.mint, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 13, fontFamily: 'Inter_400', fontSize: 15, color: colors.textDark },

  // RUT
  rutCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  rutForm: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 0.5, borderTopColor: 'rgba(74,124,89,0.15)' },
  switchTrack: { width: 46, height: 26, borderRadius: 999, backgroundColor: '#cdd5cd', padding: 3, justifyContent: 'center' },
  switchTrackOn: { backgroundColor: colors.moss },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },

  error: { color: '#dc2626', fontFamily: 'Inter_400', fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
