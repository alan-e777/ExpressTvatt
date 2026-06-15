import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert, Modal, Pressable, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import {
  IconMapPin, IconClock, IconCalendar, IconLock, IconChevronUp, IconX, IconCheck,
  IconUser, IconMail, IconPhone, IconNotes,
} from '@tabler/icons-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc } from 'firebase/firestore';
import { HomeStackParamList } from '../navigation/RootNavigator';
import { auth, db } from '../lib/firebase';
import { useCart } from '../lib/cart';
import {
  DISCOUNT_DEFAULTS, computeCartTotals, type DiscountSettings,
} from '../lib/discount';
import { formatPersonnummer, isValidPersonnummer, rutRefundKr, RUT_DISCOUNT_PERCENT } from '../lib/rut';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DatePickerModal from '../components/DatePickerModal';
import TimeSpanPickerModal, { SPAN_LABEL, type TimeSpan } from '../components/TimeSpanPickerModal';
import TopBar from '../components/TopBar';
import ScreenBackground from '../components/ScreenBackground';
import { useCollapsibleHeader } from '../lib/useCollapsibleHeader';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type SavedAddress = { address: string; postalCode: string; deliveryNote?: string };

type Props = { navigation: NativeStackNavigationProp<HomeStackParamList, 'Checkout'> };

export default function CheckoutScreen({ navigation }: Props) {
  const cart = useCart();
  const items = cart.lines;
  const header = useCollapsibleHeader();

  // Contact (mirrors the website kassa — editable, with a profile card)
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileCard,    setProfileCard]    = useState<{ name: string; email: string; phone: string } | null>(null);
  const [editingContact, setEditingContact] = useState(false);

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]        = useState('');
  const [addressConfirmed, setAddressConfirmed]  = useState(false);
  const [pickupDate,       setPickupDate]        = useState('');
  const [pickupTime,       setPickupTime]        = useState('');
  const [deliveryDate,     setDeliveryDate]      = useState('');
  const [deliveryTime,     setDeliveryTime]      = useState('');
  const [notes,            setNotes]             = useState('');
  const [datePickerFor,    setDatePickerFor]     = useState<'pickup' | 'delivery' | null>(null);
  const [timePickerFor,    setTimePickerFor]     = useState<'pickup' | 'delivery' | null>(null);
  const [savedAddresses,   setSavedAddresses]    = useState<SavedAddress[]>([]);
  const [savedPick,        setSavedPick]         = useState<SavedAddress | null>(null);
  const [sheetOpen,        setSheetOpen]         = useState(false);

  // RUT-Avdrag (toggle carried over from the order screen)
  const rutAvdrag = cart.rutAvdrag;
  const [personnummer, setPersonnummer] = useState('');

  // Pricing settings (to mirror the server's charged amount)
  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [strukenDiscounts, setStrukenDiscounts] = useState<Record<string, number>>({});
  const [deliverySettings, setDeliverySettings] = useState<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>({ freeDeliveryThresholdKr: 0, deliveryFeeKr: 0 });
  const [hasPlacedOrder,   setHasPlacedOrder]   = useState<boolean | null>(null);

  const userId = auth.currentUser?.uid;

  // ── Settings fetch (mirror create-cart-payment) ───────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/discount-settings`).then(r => r.json()).then(setDiscountSettings).catch(() => {});
    fetch(`${API_URL}/api/delivery-settings`).then(r => r.json()).then(setDeliverySettings).catch(() => {});
    fetch(`${API_URL}/api/struken-tvatt`)
      .then(r => r.json() as Promise<{ id: string; discountPercent?: number }[]>)
      .then(products => {
        const map: Record<string, number> = {};
        for (const p of Array.isArray(products) ? products : []) map[p.id] = p.discountPercent ?? 0;
        setStrukenDiscounts(map);
      })
      .catch(() => {});
  }, []);

  // ── Pre-fill contact + saved addresses from the account ────────────────────────
  useEffect(() => {
    if (!userId) return;
    const u = auth.currentUser;
    getDoc(doc(db, 'customers', userId)).then(snap => {
      const data = snap.exists() ? snap.data() : {};
      setHasPlacedOrder(snap.exists() ? data.hasPlacedOrder === true : false);
      setSavedAddresses((data.addresses ?? []) as SavedAddress[]);
      const n = u?.displayName || data.name || '';
      const e = u?.email       || data.email || '';
      const p = data.phone     || '';
      if (n || e || p) {
        setProfileCard({ name: n, email: e, phone: p });
        if (n) setName(n);
        if (e) setEmail(e);
        if (p) setPhone(p);
        // If a required contact field is missing (commonly the phone for accounts
        // created without one), surface the editable fields up front instead of
        // hiding the gap behind the collapsed card — otherwise the requirement
        // only reveals itself as an error at the payment step.
        if (!n || !e || !p) setEditingContact(true);
      }
      if (data.rutEnabled) {
        cart.setRutAvdrag(true);
        if (data.personnummer) setPersonnummer(formatPersonnummer(data.personnummer));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Pricing (mirror server) ────────────────────────────────────────────────────
  const isFirstTime = !!userId && hasPlacedOrder === false;
  const perItemPct = (id: string) =>
    id.startsWith('matta-')
      ? (discountSettings.mattvatt[id as keyof typeof discountSettings.mattvatt] ?? 0)
      : (strukenDiscounts[id] ?? 0);
  const { subtotalKr, totalKr, savingsKr } = computeCartTotals(
    items.map(i => ({ id: i.id, price: i.price, qty: i.qty })),
    perItemPct,
    { firstTimeDiscountPercent: discountSettings.firstTimeDiscountPercent, multipleDiscountsAllowed: discountSettings.multipleDiscountsAllowed },
    isFirstTime,
  );
  const deliveryFeeKr = items.length > 0 && totalKr < deliverySettings.freeDeliveryThresholdKr ? deliverySettings.deliveryFeeKr : 0;
  const rutDiscountKr = rutAvdrag ? rutRefundKr(totalKr) : 0;
  const grandTotalKr  = totalKr - rutDiscountKr + deliveryFeeKr;

  // ── Pickup / delivery scheduling (mirror website kassa) ────────────────────────
  const now = new Date();
  const minPickupDate = now.getHours() < 20 ? toYMD(now) : toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  // Disable pickup spans that have already ended today.
  const disabledPickupSpans = useMemo<string[]>(() => (
    pickupDate === toYMD(now)
      ? (['08-12', '12-16', '16-20'] as const).filter(s => now.getHours() >= Number(s.split('-')[1]))
      : []
  ), [pickupDate]);
  // Delivery must be at least 3 calendar days after pickup.
  const earliestDeliveryDate = pickupDate ? addDaysYMD(pickupDate, 3) : addDaysYMD(minPickupDate, 3);

  useEffect(() => {
    if (!pickupDate) return;
    const minDelivery = addDaysYMD(pickupDate, 3);
    if (deliveryDate && deliveryDate >= minDelivery) return;
    setDeliveryDate(minDelivery);
    setDeliveryTime('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupDate]);

  function selectSavedAddress(a: SavedAddress) {
    setSavedPick(a);
    setAddress(a.address);
    setPostalCode(a.postalCode);
    setAddressConfirmed(true);
    setNotes(a.deliveryNote || '');
  }
  function clearSavedAddress() {
    setSavedPick(null); setAddress(''); setPostalCode(''); setAddressConfirmed(false); setNotes('');
  }

  function handleNext() {
    // Any contact-field failure expands the editable section so the empty field
    // is visible when the user dismisses the alert.
    if (!name.trim())                       { setEditingContact(true); return Alert.alert('Namn krävs', 'Ange ditt namn.'); }
    if (!email.trim() || !email.includes('@')) { setEditingContact(true); return Alert.alert('Ogiltig e-post', 'Ange en giltig e-postadress.'); }
    if (!phone.trim())                      { setEditingContact(true); return Alert.alert('Telefon krävs', 'Ange ditt telefonnummer.'); }
    if (!addressConfirmed || !address.trim()) return Alert.alert('Välj en adress', 'Välj en adress från förslagen för att fortsätta.');
    if (!pickupDate || !pickupTime)         return Alert.alert('Fyll i alla fält', 'Välj datum och tid för upphämtning.');
    if (!deliveryDate || !deliveryTime)     return Alert.alert('Fyll i alla fält', 'Välj datum och tid för avlämning.');
    const dayDiff = Math.round((new Date(deliveryDate).getTime() - new Date(pickupDate).getTime()) / (24 * 60 * 60 * 1000));
    if (dayDiff < 3)                        return Alert.alert('Kontrollera datum', 'Avlämning måste vara minst 3 dagar efter upphämtning.');
    if (rutAvdrag && !isValidPersonnummer(personnummer)) return Alert.alert('Personnummer krävs', 'Ange ett giltigt 10-siffrigt personnummer för RUT-avdrag.');

    navigation.navigate('CartPayment', {
      address, postalCode,
      date: pickupDate, time: pickupTime, deliveryDate, deliveryTime, notes,
      name: name.trim(), email: email.trim(), phone: phone.trim(),
      rutAvdrag, personnummer: rutAvdrag ? personnummer : '',
      subtotalKr, savingsKr, rutDiscountKr, deliveryFeeKr, grandTotalKr, isFirstTime,
    });
  }

  const initials = (name || profileCard?.name || auth.currentUser?.email || '?')
    .split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';

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
          <View style={styles.card}>

            {/* ── Contact (editable) ─────────────────────────────────────── */}
            {profileCard && !editingContact ? (
              <View style={styles.profileRow}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.profileLabel}>Dina uppgifter</Text>
                  <Text style={styles.profileName} numberOfLines={1}>{name || profileCard.name}</Text>
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {(email || profileCard.email)}{(phone || profileCard.phone) ? ` · ${phone || profileCard.phone}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setEditingContact(true)} hitSlop={8}>
                  <Text style={styles.changeLink}>Ändra</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: spacing.lg }}>
                {profileCard && editingContact && (
                  <View style={styles.editHeader}>
                    <Text style={styles.profileLabel}>Dina uppgifter</Text>
                    <TouchableOpacity onPress={() => setEditingContact(false)} hitSlop={8}>
                      <Text style={styles.changeLink}>← Avbryt</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <Text style={styles.fieldLabel}><IconUser size={11} color={colors.textMuted} strokeWidth={1.5} />  Namn</Text>
                <TextInput style={styles.input} placeholder="För- och efternamn" placeholderTextColor={colors.textMuted}
                  value={name} onChangeText={setName} autoCapitalize="words" />
                <Text style={styles.fieldLabel}><IconMail size={11} color={colors.textMuted} strokeWidth={1.5} />  E-post</Text>
                <TextInput style={styles.input} placeholder="din@mail.se" placeholderTextColor={colors.textMuted}
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
                <Text style={styles.fieldLabel}><IconPhone size={11} color={colors.textMuted} strokeWidth={1.5} />  Telefon</Text>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="070 000 00 00" placeholderTextColor={colors.textMuted}
                  value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>
            )}

            {/* ── Address ─────────────────────────────────────────────────── */}
            <Text style={styles.fieldLabel}><IconMapPin size={11} color={colors.textMuted} strokeWidth={1.5} />  Adress</Text>
            {savedAddresses.length > 0 && (
              <View style={styles.chipWrap}>
                <Text style={styles.chipHint}>Sparade:</Text>
                {savedAddresses.map((a, i) => {
                  const isSel = savedPick?.address === a.address;
                  return (
                    <TouchableOpacity key={i} style={[styles.chip, isSel && styles.chipActive]} onPress={() => selectSavedAddress(a)} activeOpacity={0.7}>
                      <Text style={[styles.chipText, isSel && styles.chipTextActive]} numberOfLines={1}>{a.address}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {savedPick ? (
              <View style={[styles.input, styles.confirmedRow]}>
                <Text style={styles.confirmedText} numberOfLines={1}>
                  {savedPick.address}{savedPick.postalCode ? `, ${savedPick.postalCode}` : ''}
                </Text>
                <TouchableOpacity onPress={clearSavedAddress} hitSlop={8}><Text style={styles.changeLink}>Ändra</Text></TouchableOpacity>
              </View>
            ) : (
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={(addr, postal) => { setAddress(addr); setPostalCode(postal); }}
                onConfirmChange={setAddressConfirmed}
                forceConfirmed={addressConfirmed}
                inputStyle={styles.input}
              />
            )}

            {/* ── Upphämtning ─────────────────────────────────────────────── */}
            <View style={[styles.dtCard, { marginTop: spacing.lg }]}>
              <View style={styles.dtTitleRow}>
                <IconCalendar size={14} color={colors.forestDark} strokeWidth={1.75} />
                <Text style={styles.dtTitle}>Upphämtning</Text>
              </View>
              <Text style={styles.fieldLabel}>Datum</Text>
              <TouchableOpacity style={[styles.input, styles.pickerBtn, { marginBottom: spacing.md }]} onPress={() => setDatePickerFor('pickup')} activeOpacity={0.7}>
                <Text style={pickupDate ? styles.pickerValue : styles.pickerPlaceholder}>{pickupDate ? formatDateDisplay(pickupDate) : 'Välj datum'}</Text>
                <IconCalendar size={16} color={colors.forestMid} strokeWidth={1.5} />
              </TouchableOpacity>
              <Text style={styles.fieldLabel}><IconClock size={11} color={colors.textMuted} strokeWidth={1.5} />  Tid</Text>
              <TouchableOpacity style={[styles.input, styles.pickerBtn, { marginBottom: 0 }]} onPress={() => setTimePickerFor('pickup')} activeOpacity={0.7}>
                <Text style={pickupTime ? styles.pickerValue : styles.pickerPlaceholder}>{pickupTime ? (SPAN_LABEL[pickupTime as TimeSpan] ?? pickupTime) : 'Välj tid'}</Text>
                <IconClock size={16} color={colors.forestMid} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>

            {/* ── Avlämning ───────────────────────────────────────────────── */}
            <View style={[styles.dtCard, { marginTop: spacing.md }]}>
              <View style={styles.dtTitleRow}>
                <IconCalendar size={14} color={colors.forestDark} strokeWidth={1.75} />
                <Text style={styles.dtTitle}>Avlämning</Text>
              </View>
              <Text style={styles.fieldLabel}>Datum</Text>
              <TouchableOpacity style={[styles.input, styles.pickerBtn, { marginBottom: spacing.md }]} onPress={() => setDatePickerFor('delivery')} activeOpacity={0.7}>
                <Text style={deliveryDate ? styles.pickerValue : styles.pickerPlaceholder}>{deliveryDate ? formatDateDisplay(deliveryDate) : 'Välj datum'}</Text>
                <IconCalendar size={16} color={colors.forestMid} strokeWidth={1.5} />
              </TouchableOpacity>
              <Text style={styles.fieldLabel}><IconClock size={11} color={colors.textMuted} strokeWidth={1.5} />  Tid</Text>
              <TouchableOpacity style={[styles.input, styles.pickerBtn, { marginBottom: 0 }]} onPress={() => setTimePickerFor('delivery')} activeOpacity={0.7}>
                <Text style={deliveryTime ? styles.pickerValue : styles.pickerPlaceholder}>{deliveryTime ? (SPAN_LABEL[deliveryTime as TimeSpan] ?? deliveryTime) : 'Välj tid'}</Text>
                <IconClock size={16} color={colors.forestMid} strokeWidth={1.5} />
              </TouchableOpacity>
              <Text style={styles.dtHint}>Minst 3 dagar efter upphämtning.</Text>
            </View>

            {/* ── Notes ───────────────────────────────────────────────────── */}
            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}><IconNotes size={11} color={colors.textMuted} strokeWidth={1.5} />  Anteckning (valfritt)</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { marginBottom: 0 }]}
              placeholder="t.ex. C/O, portkod, specialinstruktioner…"
              placeholderTextColor={colors.textMuted}
              value={notes} onChangeText={setNotes} multiline numberOfLines={3}
            />

            {/* ── RUT-Avdrag ──────────────────────────────────────────────── */}
            <View style={[styles.rutCard, rutAvdrag && styles.rutCardActive]}>
              <TouchableOpacity style={styles.rutHead} onPress={() => cart.setRutAvdrag(!rutAvdrag)} activeOpacity={0.8}>
                <View style={[styles.rutBox, rutAvdrag && styles.rutBoxActive]}>
                  {rutAvdrag && <IconCheck size={14} color={colors.moss} strokeWidth={2.5} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.rutTitle}>RUT-Avdrag</Text>
                    <View style={styles.rutBadge}><Text style={styles.rutBadgeText}>−{RUT_DISCOUNT_PERCENT}%</Text></View>
                  </View>
                  <Text style={styles.rutSub}>{RUT_DISCOUNT_PERCENT}% RUT-avdrag dras direkt från priset — du betalar bara det rabatterade beloppet.</Text>
                </View>
              </TouchableOpacity>
              {rutAvdrag && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.fieldLabel}>10-siffrigt Personnummer</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    placeholder="ÅÅMMDD-XXXX" placeholderTextColor={colors.textMuted}
                    value={personnummer} onChangeText={t => setPersonnummer(formatPersonnummer(t))}
                    keyboardType="number-pad" maxLength={11}
                  />
                </View>
              )}
            </View>

          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <Animated.View
        style={[styles.header, { transform: [{ translateY: header.translateY }], opacity: header.opacity }]}
        onLayout={e => header.onHeaderLayout(e.nativeEvent.layout.height)}
      >
        <TopBar title="Uppgifter & datum" onBack={() => navigation.goBack()} />
      </Animated.View>

      {/* ── Fixed bottom bar ──────────────────────────────────────────────── */}
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => setSheetOpen(true)} activeOpacity={0.7}>
          <Text style={styles.barCount}>
            {items.length} {items.length === 1 ? 'produkt' : 'produkter'}{deliveryFeeKr > 0 ? ` · +${deliveryFeeKr} kr leverans` : ''}
          </Text>
          <View style={styles.barTotalRow}>
            <Text style={styles.barTotal}>{grandTotalKr} kr</Text>
            <IconChevronUp size={15} color={colors.moss} strokeWidth={2} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.barBtn} onPress={handleNext} activeOpacity={0.85}>
          <IconLock size={14} color={colors.forestDark} strokeWidth={1.75} />
          <Text style={styles.barBtnText}>Gå till betalning</Text>
        </TouchableOpacity>
      </View>

      {/* ── Summary sheet ─────────────────────────────────────────────────── */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={sh.scrim} onPress={() => setSheetOpen(false)} />
        <View style={sh.sheet}>
          <View style={sh.grabber} />
          <View style={sh.head}>
            <Text style={sh.title}>Din bokning</Text>
            <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={8}><IconX size={18} color={colors.textMuted} strokeWidth={1.75} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <View key={item.id} style={sh.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={sh.rowName} numberOfLines={1}>{item.qty}× {item.name}</Text>
                  <Text style={sh.rowPer}>{item.price} kr / st</Text>
                </View>
                <Text style={sh.rowPrice}>{item.price * item.qty} kr</Text>
              </View>
            ))}
            {savingsKr > 0 && (
              <View style={sh.sumRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={sh.discount}>Rabatt</Text>
                  {isFirstTime && <View style={sh.ftBadge}><Text style={sh.ftBadgeText}>Förstagångsrabatt</Text></View>}
                </View>
                <Text style={sh.discount}>−{savingsKr} kr</Text>
              </View>
            )}
            {rutDiscountKr > 0 && (
              <View style={sh.sumRow}>
                <Text style={sh.discount}>RUT-avdrag −{RUT_DISCOUNT_PERCENT}%</Text>
                <Text style={sh.discount}>−{rutDiscountKr} kr</Text>
              </View>
            )}
            <View style={sh.sumRow}>
              <Text style={sh.sumLabel}>Leverans</Text>
              <Text style={sh.sumLabel}>{deliveryFeeKr > 0 ? `${deliveryFeeKr} kr` : 'Gratis'}</Text>
            </View>
            <View style={[sh.sumRow, sh.totalDivider]}>
              <Text style={sh.grandLabel}>Totalt</Text>
              <Text style={sh.grandValue}>{grandTotalKr} kr</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerFor !== null}
        value={datePickerFor === 'delivery' ? deliveryDate : pickupDate}
        minDate={datePickerFor === 'delivery' ? earliestDeliveryDate : minPickupDate}
        onConfirm={d => (datePickerFor === 'delivery' ? setDeliveryDate(d) : setPickupDate(d))}
        onClose={() => setDatePickerFor(null)}
      />
      <TimeSpanPickerModal
        visible={timePickerFor !== null}
        value={timePickerFor === 'delivery' ? deliveryTime : pickupTime}
        disabledOptions={timePickerFor === 'pickup' ? disabledPickupSpans : []}
        onConfirm={t => (timePickerFor === 'delivery' ? setDeliveryTime(t) : setPickupTime(t))}
        onClose={() => setTimePickerFor(null)}
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

const pad2 = (n: number) => String(n).padStart(2, '0');
function toYMD(d: Date): string { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function addDaysYMD(ymd: string, n: number): string {
  const [y, mo, da] = ymd.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: 110 },
  header:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },

  card: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },

  // Contact card
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.linen, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: 'rgba(74,124,89,0.12)',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.lg,
  },
  avatar: { width: 38, height: 38, borderRadius: radius.circle, backgroundColor: colors.forestDark, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontFamily: 'Inter_600', fontSize: 14, color: colors.moss },
  profileLabel: { fontFamily: 'Inter_500', fontSize: 9, color: colors.textMuted, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 2 } as any,
  profileName: { fontFamily: 'Inter_500', fontSize: 14, color: colors.textDark },
  profileMeta: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 1 },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },

  fieldLabel: { fontFamily: 'Inter_500', fontSize: 10, color: colors.textMuted, letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: spacing.xs } as any,
  input: {
    backgroundColor: colors.mint, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark, marginBottom: spacing.lg,
  },
  notesInput: { height: 88, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  chipHint: { fontFamily: 'Inter_400', fontSize: 11, color: colors.textMuted },
  chip: { backgroundColor: colors.linen, borderRadius: radius.pill, borderWidth: 0.5, borderColor: 'rgba(15,23,42,0.12)', paddingVertical: 5, paddingHorizontal: spacing.md },
  chipActive: { backgroundColor: colors.forestDark, borderColor: colors.forestDark },
  chipText: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textDark },
  chipTextActive: { color: colors.moss, fontFamily: 'Inter_500' },

  confirmedRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmedText: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark, flex: 1, marginRight: spacing.sm },
  changeLink:    { fontFamily: 'Inter_500', fontSize: 12, color: colors.textMuted },

  dtCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', padding: spacing.lg },
  dtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dtTitle:    { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  dtHint:     { fontFamily: 'Inter_400', fontSize: 11, color: colors.textMuted, marginTop: spacing.sm },

  pickerBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerValue:       { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark },
  pickerPlaceholder: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted },

  // RUT
  rutCard: { marginTop: spacing.lg, borderWidth: 0.5, borderColor: 'rgba(74,124,89,0.18)', borderRadius: radius.md, padding: spacing.md },
  rutCardActive: { borderColor: colors.moss, backgroundColor: colors.linen },
  rutHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rutBox: { width: 22, height: 22, borderRadius: 6, marginTop: 1, borderWidth: 1.5, borderColor: 'rgba(74,124,89,0.4)', alignItems: 'center', justifyContent: 'center' },
  rutBoxActive: { borderWidth: 0, backgroundColor: colors.forestDark },
  rutTitle: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  rutBadge: { backgroundColor: colors.forestDark, borderRadius: radius.pill, paddingVertical: 1, paddingHorizontal: 8 },
  rutBadgeText: { fontFamily: 'Inter_600', fontSize: 11, color: colors.moss },
  rutSub: { fontFamily: 'Inter_400', fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 16 },

  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.forestDark,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl,
  },
  barCount: { fontFamily: 'Inter_400', fontSize: 11, color: 'rgba(183,220,215,0.6)' },
  barTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barTotal: { fontFamily: 'Inter_700', fontSize: 22, color: colors.moss },
  barBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.forestLight, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: spacing.lg },
  barBtnText: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
});

const sh = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,30,30,0.42)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  grabber: { width: 38, height: 4, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginVertical: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontFamily: 'Inter_700', fontSize: 16, color: colors.textDark },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: 'rgba(15,23,42,0.08)' },
  rowName: { fontFamily: 'Inter_500', fontSize: 14, color: colors.textDark },
  rowPer:  { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 1 },
  rowPrice: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textMid },
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md },
  sumLabel: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMid },
  discount: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
  ftBadge: { backgroundColor: colors.forestDark, borderRadius: radius.pill, paddingVertical: 1, paddingHorizontal: 7 },
  ftBadgeText: { fontFamily: 'Inter_600', fontSize: 10, color: colors.moss },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: 'rgba(15,23,42,0.1)', marginTop: spacing.xs },
  grandLabel: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  grandValue: { fontFamily: 'Inter_700', fontSize: 20, color: colors.textDark },
});
