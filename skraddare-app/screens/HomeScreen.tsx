import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import {
  IconSteam, IconNeedle, IconShirt, IconHanger, IconStar, IconMountain,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconSpray, IconWash, IconPlus, IconMinus, IconChevronRight, IconArrowLeft, IconX,
} from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';
import { auth } from '../lib/firebase';
import { registerPushToken } from '../lib/notifications';
import { type Service, type CartItem } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

type StrukenProduct = { id: string; name: string; price: number; category: string; order: number };
type IconComp       = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
type Nav            = NativeStackNavigationProp<HomeStackParamList>;
type SectionId      = 'mattvätt' | 'struken' | 'kladvard';

const SERVICES: { id: SectionId; label: string; desc: string; Icon: IconComp }[] = [
  { id: 'mattvätt',  label: 'Mattvätt', desc: 'Djuptvätt av mattor', Icon: IconSpray },
  { id: 'struken',   label: 'Struken',  desc: 'Skjortor & kostym',   Icon: IconSteam },
  { id: 'kladvard',  label: 'Klädvård', desc: 'Lagning & ändring',   Icon: IconNeedle },
];

// Fixed mattvätt sizes (server re-validates these prices in create-cart-payment)
const MATT_OPTIONS: { id: string; name: string; price: number; Icon: IconComp }[] = [
  { id: 'matta-liten', name: 'Matta liten (< 2 m²)', price: 299, Icon: IconSpray },
  { id: 'matta-stor',  name: 'Matta stor (> 2 m²)',  price: 499, Icon: IconSpray },
  { id: 'matta-akta',  name: 'Äkta / orientalisk',    price: 699, Icon: IconStar },
];

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function strukenIcon(name: string): IconComp {
  const n = name.toLowerCase();
  if (n.includes('slips') || n.includes('halsduk')) return IconNeedle;
  if (n.includes('byxor') || n.includes('jeans') || n.includes('chino')) return IconScissors;
  if (n.includes('gardin') || n.includes('hängare')) return IconHanger;
  if (n.includes('klänning') || n.includes('kjol') || n.includes('fest')) return IconStar;
  if (n.includes('utomhus') || n.includes('berg') || n.includes('jacka')) return IconMountain;
  return IconShirt;
}

function serviceIcon(name: string): IconComp {
  const n = name.toLowerCase();
  if (n.includes('gardin') || n.includes('hängare')) return IconHanger;
  if (n.includes('plagg') || n.includes('tork'))     return IconWash;
  if (n.includes('fläck') || n.includes('vatten'))   return IconDroplet;
  if (n.includes('skydd') || n.includes('impregnering') || n.includes('mott')) return IconShield;
  if (n.includes('polstring') || n.includes('möbel')) return IconBrush;
  if (n.includes('press') || n.includes('stryk'))    return IconWind;
  if (n.includes('doft'))                            return IconSparkles;
  if (n.includes('matta') || n.includes('djup') || n.includes('tät')) return IconBrush;
  if (n.includes('reng'))                            return IconBrush;
  if (n.includes('lagning') || n.includes('reparation') || n.includes('skada')) return IconTool;
  if (n.includes('ändring') || n.includes('söm'))    return IconNeedle;
  return IconScissors;
}

// ─── Progress steps (mirrors the website /order header) ─────────────────────────

function ProgressSteps() {
  return (
    <View style={ps.row}>
      <View style={ps.step}>
        <View style={[ps.bubble, ps.bubbleActive]}><Text style={ps.bubbleNumActive}>1</Text></View>
        <Text style={ps.labelActive}>Välj tjänster</Text>
      </View>
      <Text style={ps.dash}>—</Text>
      <View style={ps.step}>
        <View style={[ps.bubble, ps.bubbleUpcoming]}><Text style={ps.bubbleNum}>2</Text></View>
        <Text style={ps.label}>Uppgifter &amp; datum</Text>
      </View>
    </View>
  );
}

const ps = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  step:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubble: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bubbleActive:   { backgroundColor: colors.moss },
  bubbleUpcoming: { backgroundColor: 'rgba(183,220,215,0.18)', borderWidth: 1, borderColor: 'rgba(183,220,215,0.35)' },
  bubbleNumActive: { fontFamily: 'Inter_600', fontSize: 12, color: colors.forestDark },
  bubbleNum:       { fontFamily: 'Inter_600', fontSize: 12, color: colors.moss },
  labelActive: { fontFamily: 'Inter_500', fontSize: 13, color: colors.white },
  label:       { fontFamily: 'Inter_400', fontSize: 13, color: 'rgba(183,220,215,0.7)' },
  dash:        { color: 'rgba(183,220,215,0.4)', fontSize: 13 },
});

// ─── Section header (inside the open white card) ────────────────────────────────

function SectionHeader({ Icon, title, subtitle }: { Icon: IconComp; title: string; subtitle: string }) {
  return (
    <View style={sub.header}>
      <View style={sub.iconCircle}><Icon size={15} color={colors.forestMid} strokeWidth={1.5} /></View>
      <View style={{ flex: 1 }}>
        <Text style={sub.title}>{title}</Text>
        <Text style={sub.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── Product tile (2-column grid — mirrors website .prod-tile) ──────────────────

function ProductTile({ Icon, name, price, qty, onAdd, onRemove }: {
  Icon: IconComp; name: string; price: number; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <View style={[pt.tile, qty > 0 && pt.tileActive]}>
      <View style={pt.iconCircle}><Icon size={22} color={colors.forestMid} strokeWidth={1.5} /></View>
      <Text style={pt.name} numberOfLines={2}>{name}</Text>
      <View style={pt.foot}>
        <Text style={pt.price}>{price} kr<Text style={pt.per}> /st</Text></Text>
        {qty === 0 ? (
          // Untouched tile shows only a round + (no dead minus / no "0")
          <TouchableOpacity style={pt.addBtn} onPress={onAdd} activeOpacity={0.85}>
            <IconPlus size={18} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={pt.stepper}>
            <TouchableOpacity style={pt.stepBtn} onPress={onRemove} activeOpacity={0.7}>
              <IconMinus size={13} color={colors.forestDark} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={pt.qty}>{qty}</Text>
            <TouchableOpacity style={pt.stepBtn} onPress={onAdd} activeOpacity={0.7}>
              <IconPlus size={13} color={colors.forestDark} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const pt = StyleSheet.create({
  tile: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  tileActive: { borderColor: colors.forestDark },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark, textAlign: 'center', lineHeight: 18 },
  foot: { alignItems: 'center', gap: spacing.md, width: '100%' },
  price: { fontFamily: 'Inter_700', fontSize: 18, color: colors.textDark },
  per:   { fontFamily: 'Inter_500', fontSize: 11, color: colors.textMuted },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.forestDark,
    alignItems: 'center', justifyContent: 'center',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(8,63,65,0.25)', backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontFamily: 'Inter_600', fontSize: 15, color: colors.textDark, minWidth: 20, textAlign: 'center' },
});

const sub = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  iconCircle: {
    width: 32, height: 32, borderRadius: radius.circle,
    backgroundColor: colors.mint, borderWidth: 0.5, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontFamily: 'Inter_600', fontSize: 16, color: colors.textDark },
  subtitle: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  const [strukenCatalog, setStrukenCatalog] = useState<StrukenProduct[]>([]);
  const [services, setServices]             = useState<Service[]>([]);
  const [loading, setLoading]               = useState(true);

  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [basket, setBasket]     = useState<Record<string, number>>({});

  // ── Register push token on sign-in (active orders live on the Profile tab) ──
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (user) registerPushToken(user.uid).catch(() => {});
    });
    return unsubAuth;
  }, []);

  // ── Catalog fetching ───────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/struken-tvatt`).then(r => r.json()),
      fetch(`${API_URL}/api/services`).then(r => r.json()),
    ])
      .then(([struken, svcs]) => {
        setStrukenCatalog(Array.isArray(struken) ? struken : []);
        setServices(Array.isArray(svcs) ? svcs : []);
      })
      .catch(err => console.error('Catalog fetch failed', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  function addItem(id: string)    { setBasket(p => ({ ...p, [id]: (p[id] ?? 0) + 1 })); }
  function removeItem(id: string) {
    setBasket(p => { const n = { ...p }; if ((n[id] ?? 0) <= 1) delete n[id]; else n[id] -= 1; return n; });
  }
  function handleCheckout() {
    const cartItems: CartItem[] = [];
    for (const m of MATT_OPTIONS) {
      const qty = basket[m.id] ?? 0;
      if (qty > 0) cartItems.push({ id: m.id, name: m.name, price: m.price, qty, type: 'mattvätt' });
    }
    for (const p of strukenCatalog) {
      const qty = basket[p.id] ?? 0;
      if (qty > 0) cartItems.push({ id: p.id, name: p.name, price: p.price, qty, type: 'struken' });
    }
    for (const svc of services) {
      const qty = basket[svc.id] ?? 0;
      if (qty > 0) cartItems.push({ id: svc.id, name: svc.name, price: svc.price_ore / 100, qty, type: 'service' });
    }
    if (cartItems.length === 0) return;
    navigation.navigate('Checkout', { items: cartItems, total: cartTotal });
  }

  // ── Totals ─────────────────────────────────────────────────────────────────
  const mattTotal      = MATT_OPTIONS.reduce((s, m) => s + (basket[m.id] ?? 0) * m.price, 0);
  const strukenTotal   = strukenCatalog.reduce((s, p) => s + (basket[p.id] ?? 0) * p.price, 0);
  const svcTotal       = services.reduce((s, svc) => s + (basket[svc.id] ?? 0) * (svc.price_ore / 100), 0);
  const cartTotal      = mattTotal + strukenTotal + svcTotal;
  const cartCount      = Object.values(basket).reduce((s, n) => s + n, 0);

  // Per-category counts for the row badges
  const countFor = (id: SectionId): number => {
    if (id === 'mattvätt') return MATT_OPTIONS.reduce((s, m) => s + (basket[m.id] ?? 0), 0);
    if (id === 'struken')  return strukenCatalog.reduce((s, p) => s + (basket[p.id] ?? 0), 0);
    return services.reduce((s, svc) => s + (basket[svc.id] ?? 0), 0);
  };

  // Flat list of cart lines for the bottom sheet
  const cartLines = [
    ...MATT_OPTIONS.filter(m => (basket[m.id] ?? 0) > 0).map(m => ({ key: m.id, name: m.name, price: m.price, qty: basket[m.id], onAdd: () => addItem(m.id), onRemove: () => removeItem(m.id) })),
    ...strukenCatalog.filter(p => (basket[p.id] ?? 0) > 0).map(p => ({ key: p.id, name: p.name, price: p.price, qty: basket[p.id], onAdd: () => addItem(p.id), onRemove: () => removeItem(p.id) })),
    ...services.filter(s => (basket[s.id] ?? 0) > 0).map(s => ({ key: s.id, name: s.name, price: s.price_ore / 100, qty: basket[s.id], onAdd: () => addItem(s.id), onRemove: () => removeItem(s.id) })),
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <TopBar />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, cartCount > 0 && { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressSteps />

        {/* ── List view: category navigation rows ───────────────────────── */}
        {openSection === null && (
          <View style={styles.serviceCard}>
            <View style={catr.list}>
              {SERVICES.map((s, i) => {
                const count = countFor(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[catr.row, i < SERVICES.length - 1 && catr.rowBorder]}
                    onPress={() => setOpenSection(s.id)}
                    activeOpacity={0.6}
                  >
                    <View style={catr.icon}><s.Icon size={20} color={colors.forestMid} strokeWidth={1.5} /></View>
                    <View style={catr.text}>
                      <Text style={catr.title}>{s.label}</Text>
                      <Text style={catr.desc} numberOfLines={1}>{s.desc}</Text>
                    </View>
                    {count > 0 && (
                      <View style={catr.badge}><Text style={catr.badgeText}>{count}</Text></View>
                    )}
                    <IconChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Detail view: back link (push/pop replaces the list) ───────── */}
        {openSection !== null && (
          <TouchableOpacity style={catr.back} onPress={() => setOpenSection(null)} activeOpacity={0.7}>
            <IconArrowLeft size={16} color={colors.moss} strokeWidth={1.75} />
            <Text style={catr.backText}>Tillbaka</Text>
          </TouchableOpacity>
        )}

        {/* ── Mattvätt — three fixed sizes ──────────────────────────────── */}
        {openSection === 'mattvätt' && (
          <View style={styles.serviceCard}>
            <SectionHeader Icon={IconSpray} title="Mattvätt" subtitle="Djuptvätt av mattor · Hämtning ingår alltid" />
            <View style={styles.grid}>
              {MATT_OPTIONS.map(m => (
                <ProductTile
                  key={m.id} Icon={m.Icon} name={m.name} price={m.price}
                  qty={basket[m.id] ?? 0} onAdd={() => addItem(m.id)} onRemove={() => removeItem(m.id)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Struken tvätt ─────────────────────────────────────────────── */}
        {openSection === 'struken' && (
          <View style={styles.serviceCard}>
            <SectionHeader Icon={IconSteam} title="Struken tvätt" subtitle="Skjortor, kostym & festklädsel — på galge" />
            {loading ? (
              <ActivityIndicator size="small" color={colors.forestMid} style={{ marginVertical: spacing.lg }} />
            ) : strukenCatalog.length === 0 ? (
              <Text style={styles.emptyText}>Inga produkter tillgängliga just nu.</Text>
            ) : (
              <View style={styles.grid}>
                {strukenCatalog.map(p => (
                  <ProductTile
                    key={p.id} Icon={strukenIcon(p.name)} name={p.name} price={p.price}
                    qty={basket[p.id] ?? 0} onAdd={() => addItem(p.id)} onRemove={() => removeItem(p.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Klädvård & textil ──────────────────────────────────────────── */}
        {openSection === 'kladvard' && (
          <View style={styles.serviceCard}>
            <SectionHeader Icon={IconNeedle} title="Klädvård & textil" subtitle="Lagning, ändring, rengöring & skydd" />
            {loading ? (
              <ActivityIndicator size="small" color={colors.forestMid} style={{ marginVertical: spacing.lg }} />
            ) : services.length === 0 ? (
              <Text style={styles.emptyText}>Inga tjänster tillgängliga just nu.</Text>
            ) : (
              <View style={styles.grid}>
                {services.map(svc => (
                  <ProductTile
                    key={svc.id} Icon={serviceIcon(svc.name)} name={svc.name} price={svc.price_ore / 100}
                    qty={basket[svc.id] ?? 0} onAdd={() => addItem(svc.id)} onRemove={() => removeItem(svc.id)}
                  />
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Fixed bottom bar (tappable total opens the sheet) ───────────── */}
      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity onPress={() => setSheetOpen(true)} activeOpacity={0.7}>
            <Text style={styles.cartCount}>{cartCount} {cartCount === 1 ? 'artikel' : 'artiklar'}</Text>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotal}>{cartTotal} kr</Text>
              <IconChevronRight size={15} color={colors.moss} strokeWidth={2} style={{ transform: [{ rotate: '-90deg' }] }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={handleCheckout} activeOpacity={0.85}>
            <Text style={styles.cartBtnText}>Gå vidare →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom sheet: line-item list ────────────────────────────────── */}
      <Modal visible={sheetOpen && cartCount > 0} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={sh.scrim} onPress={() => setSheetOpen(false)} />
        <View style={sh.sheet}>
          <View style={sh.grabber} />
          <View style={sh.head}>
            <Text style={sh.title}>Din bokning</Text>
            <TouchableOpacity onPress={() => setSheetOpen(false)} hitSlop={8}>
              <IconX size={18} color={colors.textMuted} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {cartLines.map(line => (
              <View key={line.key} style={sh.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={sh.rowName} numberOfLines={1}>{line.name}</Text>
                  <Text style={sh.rowPer}>{line.price} kr / st</Text>
                </View>
                <View style={pt.stepper}>
                  <TouchableOpacity style={pt.stepBtn} onPress={line.onRemove} activeOpacity={0.7}>
                    <IconMinus size={13} color={colors.forestDark} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={pt.qty}>{line.qty}</Text>
                  <TouchableOpacity style={pt.stepBtn} onPress={line.onAdd} activeOpacity={0.7}>
                    <IconPlus size={13} color={colors.forestDark} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <Text style={sh.lineTotal}>{line.price * line.qty} kr</Text>
              </View>
            ))}
            <View style={sh.totalRow}>
              <Text style={sh.totalLabel}>Hämtning &amp; leverans</Text>
              <Text style={sh.totalMuted}>Ingår</Text>
            </View>
            <View style={[sh.totalRow, sh.totalDivider]}>
              <Text style={sh.grandLabel}>Totalt</Text>
              <Text style={sh.grandValue}>{cartTotal} kr</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  toggleRow: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm, marginBottom: spacing.lg },

  serviceCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    borderWidth:     1,
    borderColor:     'rgba(15,23,42,0.08)',
    marginBottom:    spacing.lg,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyText: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.md } as any,

  // Mattvätt
  sliderBox: {
    backgroundColor: colors.mint,
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(15,23,42,0.08)',
    marginBottom:    spacing.md,
  },
  priceRow:   { marginBottom: spacing.md },
  priceLabel: { fontFamily: 'Inter_500', fontSize: 10, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 } as any,
  priceValue: { fontFamily: 'Inter_700', fontSize: 24, color: colors.textDark },

  primaryBtn:     { backgroundColor: colors.forestDark, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'Inter_600', fontSize: 14, color: colors.white },

  mattStepper:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.xs },
  mattStepBtn:     { width: 34, height: 34, borderRadius: radius.circle, borderWidth: 1, borderColor: 'rgba(8,63,65,0.25)', alignItems: 'center', justifyContent: 'center' },
  mattStepCount:   { fontFamily: 'Inter_600', fontSize: 15, color: colors.textDark, minWidth: 20, textAlign: 'center' },
  mattInCartLabel: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted },

  // Cart bar
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.forestDark,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl,
  },
  cartCount: { fontFamily: 'Inter_400', fontSize: 11, color: 'rgba(183,220,215,0.6)' },
  cartTotalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartTotal: { fontFamily: 'Inter_700', fontSize: 22, color: colors.moss },
  cartBtn:     { backgroundColor: colors.forestLight, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: spacing.lg },
  cartBtnText: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
});

// ─── Category rows + detail back link ──────────────────────────────────────────

const catr = StyleSheet.create({
  list: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.08)' },
  icon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: 'Inter_600', fontSize: 16, color: colors.textDark },
  desc:  { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMuted, marginTop: 2 },
  badge: {
    minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11,
    backgroundColor: colors.forestDark, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: 'Inter_600', fontSize: 12, color: colors.white },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  backText: { fontFamily: 'Inter_500', fontSize: 14, color: colors.moss },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: 'rgba(15,23,42,0.08)' },
  rowName: { fontFamily: 'Inter_500', fontSize: 14, color: colors.textDark },
  rowPer:  { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 1 },
  lineTotal: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textMid, minWidth: 56, textAlign: 'right' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md },
  totalLabel: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMid },
  totalMuted: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMid },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: 'rgba(15,23,42,0.1)', marginTop: spacing.sm },
  grandLabel: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  grandValue: { fontFamily: 'Inter_700', fontSize: 20, color: colors.textDark },
});
