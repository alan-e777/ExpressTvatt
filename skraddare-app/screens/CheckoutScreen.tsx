import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert, Modal, Pressable,
} from 'react-native';
import { IconMapPin, IconClock, IconCalendar, IconLock, IconChevronUp, IconX } from '@tabler/icons-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { HomeStackParamList } from '../navigation/RootNavigator';
import { type CartItem } from '../types';
import { auth, db } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DatePickerModal from '../components/DatePickerModal';
import TimePickerModal from '../components/TimePickerModal';
import TopBar from '../components/TopBar';

type SavedAddress = { address: string; postalCode: string; deliveryNote?: string };

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Checkout'>;
  route:      RouteProp<HomeStackParamList, 'Checkout'>;
};

export default function CheckoutScreen({ navigation, route }: Props) {
  const { items, total } = route.params;
  const user = auth.currentUser;

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]        = useState('');
  const [addressConfirmed, setAddressConfirmed]  = useState(false);
  const [date,             setDate]              = useState('');
  const [time,             setTime]              = useState('');
  const [notes,            setNotes]             = useState('');
  const [showDatePicker,   setShowDatePicker]    = useState(false);
  const [showTimePicker,   setShowTimePicker]    = useState(false);
  const [savedAddresses,   setSavedAddresses]    = useState<SavedAddress[]>([]);
  const [savedPick,        setSavedPick]         = useState<SavedAddress | null>(null);
  const [sheetOpen,        setSheetOpen]         = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, 'customers', uid)).then(snap => {
      if (snap.exists()) setSavedAddresses((snap.data()?.addresses ?? []) as SavedAddress[]);
    });
  }, []);

  function selectSavedAddress(a: SavedAddress) {
    setSavedPick(a);
    setAddress(a.address);
    setPostalCode(a.postalCode);
    setAddressConfirmed(true);
    // Pre-fill the notes field from the saved address (mirrors the website kassa).
    setNotes(a.deliveryNote || '');
  }

  function clearSavedAddress() {
    setSavedPick(null);
    setAddress('');
    setPostalCode('');
    setAddressConfirmed(false);
    setNotes('');
  }

  function handleNext() {
    if (!addressConfirmed) {
      Alert.alert('Välj en adress', 'Välj en adress från förslagen för att fortsätta.');
      return;
    }
    if (!date.trim() || !time.trim()) {
      Alert.alert('Fyll i alla fält', 'Datum och tid krävs.');
      return;
    }
    navigation.navigate('CartPayment', {
      items, total, address, postalCode, date, time, notes,
    });
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <View style={styles.container}>
      <TopBar title="Uppgifter & datum" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── One calm white card holds the booking form (sections split by hairlines) ── */}
        <View style={styles.card}>

          {/* ── Contact (read-only — comes from the account) ──────────── */}
          {user && (
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.profileLabel}>Dina uppgifter</Text>
                <Text style={styles.profileName} numberOfLines={1}>{user.displayName ?? 'Kund'}</Text>
                <Text style={styles.profileMeta} numberOfLines={1}>{user.email}</Text>
              </View>
            </View>
          )}

          {/* ── Address ───────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>
            <IconMapPin size={11} color={colors.textMuted} strokeWidth={1.5} />  Adress
          </Text>
          {savedAddresses.length > 0 && (
            <View style={styles.chipWrap}>
              <Text style={styles.chipHint}>Sparade:</Text>
              {savedAddresses.map((a, i) => {
                const isSel = savedPick?.address === a.address;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, isSel && styles.chipActive]}
                    onPress={() => selectSavedAddress(a)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isSel && styles.chipTextActive]} numberOfLines={1}>
                      {a.address}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {savedPick ? (
            // Static confirmed row (mirrors website) — no autocomplete dropdown.
            <View style={[styles.input, styles.confirmedRow]}>
              <Text style={styles.confirmedText} numberOfLines={1}>
                {savedPick.address}{savedPick.postalCode ? `, ${savedPick.postalCode}` : ''}
              </Text>
              <TouchableOpacity onPress={clearSavedAddress} hitSlop={8}>
                <Text style={styles.changeLink}>Ändra</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <AddressAutocomplete
              value={address}
              onChange={setAddress}
              onSelect={(addr, postal) => {
                setAddress(addr);
                setPostalCode(postal);
              }}
              onConfirmChange={setAddressConfirmed}
              forceConfirmed={addressConfirmed}
              inputStyle={styles.input}
            />
          )}

          {/* ── Date ──────────────────────────────────────────────────── */}
          <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Datum för hämtning</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerBtn]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
              {date ? formatDateDisplay(date) : 'Välj datum'}
            </Text>
            <IconCalendar size={16} color={colors.forestMid} strokeWidth={1.5} />
          </TouchableOpacity>

          {/* ── Time ──────────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Tid för hämtning</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerBtn]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={time ? styles.pickerValue : styles.pickerPlaceholder}>
              {time || 'Välj tid'}
            </Text>
            <IconClock size={16} color={colors.forestMid} strokeWidth={1.5} />
          </TouchableOpacity>

          {/* ── Notes ─────────────────────────────────────────────────── */}
          <Text style={styles.fieldLabel}>Anteckning (valfritt)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="t.ex. C/O, portkod, specialinstruktioner…"
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

        </View>
      </ScrollView>

      {/* ── Fixed bottom bar (tappable total opens the sheet) ───────────── */}
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => setSheetOpen(true)} activeOpacity={0.7}>
          <Text style={styles.barCount}>{items.length} {items.length === 1 ? 'artikel' : 'artiklar'}</Text>
          <View style={styles.barTotalRow}>
            <Text style={styles.barTotal}>{total} kr</Text>
            <IconChevronUp size={15} color={colors.moss} strokeWidth={2} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.barBtn} onPress={handleNext} activeOpacity={0.85}>
          <IconLock size={14} color={colors.forestDark} strokeWidth={1.75} />
          <Text style={styles.barBtnText}>Gå till betalning</Text>
        </TouchableOpacity>
      </View>

      {/* ── Bottom sheet: booking summary ───────────────────────────────── */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={sh.scrim} onPress={() => setSheetOpen(false)} />
        <View style={sh.sheet}>
          <View style={sh.grabber} />
          <View style={sh.head}>
            <Text style={sh.title}>Din bokning</Text>
            <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={8}>
              <IconX size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <View key={item.id} style={sh.row}>
                <Text style={sh.rowName} numberOfLines={1}>{item.qty}× {item.name}</Text>
                <Text style={sh.rowPrice}>{item.price * item.qty} kr</Text>
              </View>
            ))}
            <View style={sh.row}>
              <Text style={sh.rowName}>Hämtning &amp; leverans</Text>
              <Text style={sh.rowPrice}>Ingår</Text>
            </View>
            <View style={[sh.row, sh.rowTotal]}>
              <Text style={sh.grandLabel}>Totalt</Text>
              <Text style={sh.grandValue}>{total} kr</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onConfirm={setDate}
        onClose={() => setShowDatePicker(false)}
      />
      <TimePickerModal
        visible={showTimePicker}
        value={time}
        onConfirm={setTime}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
}

const DISPLAY_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatDateDisplay(str: string): string {
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return str;
  return `${d} ${DISPLAY_MONTHS[m - 1]} ${y}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: 110 },

  // ─ Outer white card (mirrors website .checkout-card) ─
  card: {
    backgroundColor: colors.white,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    borderWidth:     1,
    borderColor:     'rgba(15,23,42,0.08)',
    shadowColor:     '#0F172A',
    shadowOpacity:   0.04,
    shadowRadius:    4,
    shadowOffset:    { width: 0, height: 1 },
    elevation:       1,
  },

  // ─ Summary (cream inset) ─
  summaryCard: {
    backgroundColor: colors.mint,
    borderRadius:    radius.md,
    padding:         spacing.lg,
    marginBottom:    spacing.lg,
  },
  summaryTitle: {
    fontFamily:   'Inter_600',
    fontSize:     13,
    color:        colors.textDark,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
    marginBottom:   spacing.sm,
  },
  summaryName: {
    ...typography.small,
    color: colors.textMid,
    flex:  1,
    marginRight: spacing.sm,
  },
  summaryPrice: {
    fontFamily:  'Inter_500',
    fontSize:    13,
    color:       colors.textMid,
    fontVariant: ['tabular-nums'] as any,
  },
  summaryDivider: {
    height:          0.5,
    backgroundColor: 'rgba(14,92,91,0.18)',
    marginVertical:  spacing.sm,
  },
  totalLabel: {
    fontFamily: 'Inter_600',
    fontSize:   14,
    color:      colors.textDark,
  },
  totalValue: {
    fontFamily: 'Inter_700',
    fontSize:   20,
    color:      colors.textDark,
  },

  // ─ Profile / contact row ─
  profileRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.mint,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom:    spacing.lg,
  },
  avatar: {
    width: 38, height: 38, borderRadius: radius.circle,
    backgroundColor: colors.forestDark,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontFamily: 'Inter_600', fontSize: 14, color: colors.moss },
  profileLabel: {
    fontFamily: 'Inter_500', fontSize: 9, color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 2,
  } as any,
  profileName: { fontFamily: 'Inter_500', fontSize: 14, color: colors.textDark },
  profileMeta: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 1 },

  // ─ Fields ─
  fieldLabel: {
    fontFamily:    'Inter_500',
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom:  spacing.xs,
  } as any,
  input: {
    backgroundColor:   colors.mint,
    borderRadius:      radius.md,
    borderWidth:       1,
    borderColor:       'rgba(15,23,42,0.08)',
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily:        'Inter_400',
    fontSize:          14,
    color:             colors.textDark,
    marginBottom:      spacing.lg,
  },
  notesInput: {
    height:            88,
    textAlignVertical: 'top',
  },

  // ─ Saved-address chips (on white card → teal active, like website) ─
  chipWrap: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    alignItems:    'center',
    gap:           6,
    marginBottom:  spacing.sm,
  },
  chipHint: { fontFamily: 'Inter_400', fontSize: 11, color: colors.textMuted },
  chip: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.pill,
    borderWidth:       0.5,
    borderColor:       'rgba(15,23,42,0.12)',
    paddingVertical:   5,
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    backgroundColor: colors.forestDark,
    borderColor:     colors.forestDark,
  },
  chipText:       { fontFamily: 'Inter_400', fontSize: 12, color: colors.textDark },
  chipTextActive: { color: colors.moss, fontFamily: 'Inter_500' },

  confirmedRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmedText: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark, flex: 1, marginRight: spacing.sm },
  changeLink:    { fontFamily: 'Inter_500', fontSize: 12, color: colors.textMuted },

  pickerBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue:       { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark },
  pickerPlaceholder: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted },

  // ─ CTA ─
  btn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    backgroundColor: colors.forestDark,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    marginTop:       spacing.xs,
  },
  btnText: {
    fontFamily: 'Inter_600',
    fontSize:   15,
    color:      colors.white,
  },

  // ─ Fixed bottom bar ─
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.forestDark,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl,
  },
  barCount: { fontFamily: 'Inter_400', fontSize: 11, color: 'rgba(183,220,215,0.6)' },
  barTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barTotal: { fontFamily: 'Inter_700', fontSize: 22, color: colors.moss },
  barBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.forestLight, borderRadius: radius.md,
    paddingVertical: 11, paddingHorizontal: spacing.lg,
  },
  barBtnText: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
});

// ─── Bottom sheet ──────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,30,30,0.42)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl,
  },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginVertical: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontFamily: 'Inter_700', fontSize: 16, color: colors.textDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: 'rgba(15,23,42,0.08)' },
  rowName: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMid, flex: 1, marginRight: spacing.sm },
  rowPrice: { fontFamily: 'Inter_500', fontSize: 14, color: colors.textMid },
  rowTotal: { borderBottomWidth: 0, paddingTop: spacing.md },
  grandLabel: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  grandValue: { fontFamily: 'Inter_700', fontSize: 20, color: colors.textDark },
});
