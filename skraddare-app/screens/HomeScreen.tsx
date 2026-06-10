import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  IconSteam, IconNeedle, IconShirt, IconHanger, IconStar, IconMountain,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconSpray, IconWash, IconPlus, IconMinus,
} from '@tabler/icons-react-native';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';
import { auth, db } from '../lib/firebase';
import { registerPushToken } from '../lib/notifications';
import { type Order, type Service, type CartItem } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import EcoTrustBanner from '../components/EcoTrustBanner';
import ActiveOrderCard from '../components/home/ActiveOrderCard';
import SquareMeterSlider from '../components/SquareMeterSlider';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

type StrukenProduct = { id: string; name: string; price: number; category: string; order: number };
type IconComp       = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
type Nav            = NativeStackNavigationProp<HomeStackParamList>;
type SectionId      = 'mattvätt' | 'struken' | 'kladvard';

const ACTIVE_STATUSES = ['paid', 'collected', 'in_progress', 'ready_for_pickup'];

const SERVICES: { id: SectionId; label: string; desc: string; Icon: IconComp }[] = [
  { id: 'mattvätt',  label: 'Mattvätt', desc: 'Djuptvätt av mattor', Icon: IconSpray },
  { id: 'struken',   label: 'Struken',  desc: 'Skjortor & kostym',   Icon: IconSteam },
  { id: 'kladvard',  label: 'Klädvård', desc: 'Lagning & ändring',   Icon: IconNeedle },
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

// ─── Service toggle card ────────────────────────────────────────────────────────

function ToggleCard({ Icon, label, desc, open, onPress }: {
  Icon: IconComp; label: string; desc: string; open: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[tc.card, open ? tc.cardOpen : tc.cardClosed]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[tc.iconCircle, open ? tc.iconCircleOpen : tc.iconCircleClosed]}>
        <Icon size={18} color={open ? colors.forestDark : colors.forestMid} strokeWidth={1.5} />
      </View>
      <Text style={[tc.label, open && { color: colors.forestDark }]} numberOfLines={1}>{label}</Text>
      <Text style={[tc.desc, open && { color: 'rgba(8,63,65,0.72)' }]} numberOfLines={2}>{desc}</Text>
    </TouchableOpacity>
  );
}

const tc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
  },
  cardClosed: { backgroundColor: colors.white, borderColor: 'rgba(15,23,42,0.08)' },
  cardOpen:   { backgroundColor: colors.forestLight, borderColor: colors.forestLight },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconCircleClosed: { backgroundColor: colors.mint, borderColor: 'rgba(15,23,42,0.06)' },
  iconCircleOpen:   { backgroundColor: 'rgba(8,63,65,0.12)', borderColor: 'rgba(8,63,65,0.22)' },
  label: { fontFamily: 'Inter_600', fontSize: 13, color: colors.textDark, textAlign: 'center' },
  desc:  { fontFamily: 'Inter_400', fontSize: 10, color: colors.textMuted, textAlign: 'center', lineHeight: 14 },
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
    <View style={pt.tile}>
      <View style={pt.iconCircle}><Icon size={22} color={colors.forestMid} strokeWidth={1.5} /></View>
      <Text style={pt.name} numberOfLines={2}>{name}</Text>
      <View style={pt.foot}>
        <Text style={pt.price}>{price} kr<Text style={pt.per}> /st</Text></Text>
        <View style={pt.stepper}>
          <TouchableOpacity
            style={[pt.stepBtn, qty === 0 && { opacity: 0.4 }]}
            onPress={qty > 0 ? onRemove : undefined}
            activeOpacity={0.7}
          >
            <IconMinus size={13} color={colors.forestDark} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={pt.qty}>{qty}</Text>
          <TouchableOpacity style={pt.stepBtn} onPress={onAdd} activeOpacity={0.7}>
            <IconPlus size={13} color={colors.forestDark} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
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
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark, textAlign: 'center', lineHeight: 18 },
  foot: { alignItems: 'center', gap: spacing.md, width: '100%' },
  price: { fontFamily: 'Inter_700', fontSize: 18, color: colors.textDark },
  per:   { fontFamily: 'Inter_500', fontSize: 11, color: colors.textMuted },
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

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [strukenCatalog, setStrukenCatalog] = useState<StrukenProduct[]>([]);
  const [services, setServices]             = useState<Service[]>([]);
  const [loading, setLoading]               = useState(true);

  const [openSection, setOpenSection] = useState<SectionId | null>('mattvätt');
  const [mattKvm, setMattKvm]   = useState(5);
  const [mattItems, setMattItems] = useState<{ sqm: number; qty: number }[]>([]);
  const [basket, setBasket]     = useState<Record<string, number>>({});

  // ── Auth + live order ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) { setActiveOrder(null); return; }
      registerPushToken(user.uid).catch(() => {});
      const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
      const unsubOrders = onSnapshot(q, snap => {
        const all = snap.docs.map(d => ({
          ...d.data(), id: d.id,
          createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
        } as Order));
        const active = all
          .filter(o => ACTIVE_STATUSES.includes(o.status))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setActiveOrder(active[0] ?? null);
      });
      return unsubOrders;
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
  function addMatt(sqm: number) {
    setMattItems(p => {
      const hit = p.find(m => m.sqm === sqm);
      return hit ? p.map(m => m.sqm === sqm ? { ...m, qty: m.qty + 1 } : m) : [...p, { sqm, qty: 1 }];
    });
  }
  function removeMatt(sqm: number) {
    setMattItems(p => {
      const hit = p.find(m => m.sqm === sqm);
      if (!hit) return p;
      if (hit.qty <= 1) return p.filter(m => m.sqm !== sqm);
      return p.map(m => m.sqm === sqm ? { ...m, qty: m.qty - 1 } : m);
    });
  }

  function handleCheckout() {
    const cartItems: CartItem[] = [];
    for (const m of mattItems) {
      cartItems.push({ id: `matta-${m.sqm}`, name: `Matta ${m.sqm} m²`, price: m.sqm * 90, qty: m.qty, type: 'mattvätt' });
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
  const mattPrice      = mattKvm * 90;
  const currentMattQty = mattItems.find(m => m.sqm === mattKvm)?.qty ?? 0;
  const mattTotalCount = mattItems.reduce((s, m) => s + m.qty, 0);
  const mattTotal      = mattItems.reduce((s, m) => s + m.sqm * 90 * m.qty, 0);
  const strukenTotal   = strukenCatalog.reduce((s, p) => s + (basket[p.id] ?? 0) * p.price, 0);
  const svcTotal       = services.reduce((s, svc) => s + (basket[svc.id] ?? 0) * (svc.price_ore / 100), 0);
  const cartTotal      = mattTotal + strukenTotal + svcTotal;
  const cartCount      = mattTotalCount + Object.values(basket).reduce((s, n) => s + n, 0);

  function toggle(id: SectionId) { setOpenSection(prev => prev === id ? null : id); }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <TopBar />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, cartCount > 0 && { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeOrder && (
          <View style={{ marginBottom: spacing.lg }}>
            <ActiveOrderCard order={activeOrder} />
          </View>
        )}

        <ProgressSteps />

        {/* Service toggle cards */}
        <View style={styles.toggleRow}>
          {SERVICES.map(s => (
            <ToggleCard
              key={s.id}
              Icon={s.Icon}
              label={s.label}
              desc={s.desc}
              open={openSection === s.id}
              onPress={() => toggle(s.id)}
            />
          ))}
        </View>

        {/* ── Mattvätt ──────────────────────────────────────────────────── */}
        {openSection === 'mattvätt' && (
          <View style={styles.serviceCard}>
            <SectionHeader Icon={IconSpray} title="Mattvätt" subtitle="Djuptvätt av mattor · Hämtning ingår alltid" />

            <View style={styles.sliderBox}>
              <SquareMeterSlider value={mattKvm} onChange={setMattKvm} />
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>PRIS</Text>
              <Text style={styles.priceValue}>{mattPrice} kr</Text>
              <Text style={typography.micro}>90 kr / m²</Text>
            </View>

            {currentMattQty === 0 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => addMatt(mattKvm)} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Lägg till matta ({mattKvm} m²) — {mattPrice} kr</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.mattStepper}>
                <TouchableOpacity style={styles.mattStepBtn} onPress={() => removeMatt(mattKvm)} activeOpacity={0.7}>
                  <IconMinus size={14} color={colors.forestDark} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.mattStepCount}>{currentMattQty}</Text>
                <TouchableOpacity style={styles.mattStepBtn} onPress={() => addMatt(mattKvm)} activeOpacity={0.7}>
                  <IconPlus size={14} color={colors.forestDark} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.mattInCartLabel}>
                  {mattTotalCount === 1 ? '1 matta i varukorgen' : `${mattTotalCount} mattor i varukorgen`}
                </Text>
              </View>
            )}
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

        <EcoTrustBanner />
      </ScrollView>

      {/* ── Sticky cart bar ─────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>{cartCount} {cartCount === 1 ? 'artikel' : 'artiklar'}</Text>
            <Text style={styles.cartTotal}>{cartTotal} kr</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={handleCheckout} activeOpacity={0.85}>
            <Text style={styles.cartBtnText}>Gå vidare →</Text>
          </TouchableOpacity>
        </View>
      )}
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
  cartTotal: { fontFamily: 'Inter_700', fontSize: 22, color: colors.moss },
  cartBtn:     { backgroundColor: colors.forestLight, borderRadius: radius.md, paddingVertical: 11, paddingHorizontal: spacing.lg },
  cartBtnText: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
});
