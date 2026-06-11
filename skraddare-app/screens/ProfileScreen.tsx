import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { IconUser, IconMail, IconPhone, IconMapPin, IconPlus } from '@tabler/icons-react-native';
import { signOut, type User } from 'firebase/auth';
import {
  doc, setDoc, updateDoc, collection, query, where, onSnapshot,
  Timestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { type Order } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';
import AddressAutocomplete from '../components/AddressAutocomplete';
import ActiveOrderCard from '../components/home/ActiveOrderCard';

type SavedAddress = { address: string; postalCode: string; deliveryNote?: string };

// Only active orders are surfaced in the app (order history is out of scope).
const ACTIVE_STATUSES = ['paid', 'collected', 'in_progress', 'ready_for_pickup'];

export default function ProfileScreen() {
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

  // ── Live orders ──────────────────────────────────────────────────────────────
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
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        } as Order;
      });
      setOrders(list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    });
    return unsub;
  }, [user]);

  // ── Customer doc (phone + saved addresses) ─────────────────────────────────────
  useEffect(() => {
    if (!user) { setPhone(''); setAddresses([]); return; }
    const unsub = onSnapshot(doc(db, 'customers', user.uid), snap => {
      const data = snap.data();
      setPhone(data?.phone ?? '');
      setAddresses((data?.addresses ?? []) as SavedAddress[]);
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

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));

  return (
    <View style={styles.container}>
      <TopBar />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar / user */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatarCircle}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
            <Text style={[typography.h3, { marginTop: spacing.md, color: colors.white }]}>
              {user?.displayName ?? 'Användare'}
            </Text>
            <Text style={[typography.small, { marginTop: 2, color: colors.moss }]}>
              {user?.email}
            </Text>
          </View>

          {/* Active orders */}
          <Text style={styles.sectionTitle}>Pågående ärenden</Text>
          {activeOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={typography.body}>Inga pågående ärenden.</Text>
              <Text style={[typography.small, { marginTop: spacing.xs }]}>
                Välj en tjänst på startsidan för att boka.
              </Text>
            </View>
          ) : (
            <View style={{ marginBottom: spacing.md }}>
              <ActiveOrderCard orders={activeOrders} />
            </View>
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
              <Text style={[typography.small, { marginTop: spacing.xs }]}>
                Adresser sparas automatiskt när du genomför en bokning.
              </Text>
            </View>
          )}

          {addresses.map((a, i) => (
            <View key={i} style={styles.addressCard}>
              <View style={styles.addressIcon}>
                <IconMapPin size={16} color={colors.forestMid} strokeWidth={1.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={typography.bodyBold}>{a.address}</Text>
                {(a.postalCode || a.deliveryNote) ? (
                  <Text style={[typography.small, { marginTop: 2 }]}>
                    {[a.postalCode, a.deliveryNote || ''].filter(Boolean).join(' · ')}
                  </Text>
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
                value={newDeliveryNote}
                onChangeText={setNewDeliveryNote}
              />
              {addrError ? <Text style={styles.error}>{addrError}</Text> : null}
              <CTAButton
                label={savingAddr ? 'Sparar…' : 'Spara adress'}
                onPress={handleAddAddress}
                disabled={savingAddr}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}

          <CTAButton
            label="Logga ut"
            onPress={handleSignOut}
            variant="secondary"
            style={{ marginTop: spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  avatarBlock:  { alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.sm },
  avatarCircle: {
    width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.moss,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.sm,
  },
  initials: { fontFamily: 'Inter_700', fontSize: 28, color: colors.forestDark },

  sectionTitle: { ...typography.h3, color: colors.white, marginTop: spacing.lg, marginBottom: spacing.md } as any,
  sectionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.lg, marginBottom: spacing.md,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.moss, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: 6,
  },
  addBtnText: { fontFamily: 'Inter_500', fontSize: 12, color: colors.forestDark },

  emptyCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  infoCard:  { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, marginBottom: spacing.md },

  addressCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm,
  },
  addressIcon: {
    width: 36, height: 36, borderRadius: radius.circle, backgroundColor: colors.mint,
    alignItems: 'center', justifyContent: 'center',
  },
  removeX: { fontFamily: 'Inter_400', fontSize: 20, color: colors.textMuted, paddingHorizontal: 6, lineHeight: 22 },

  addForm: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm } as any,
  noteInput: {
    backgroundColor: colors.mint, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 13,
    fontFamily: 'Inter_400', fontSize: 15, color: colors.textDark,
  },

  error: { color: '#dc2626', fontFamily: 'Inter_400', fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
});
