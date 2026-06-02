import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  IconSteam, IconNeedle, IconWash,
  IconShirt, IconHanger, IconStar, IconMountain,
  IconScissors, IconDroplet, IconShield, IconBrush, IconWind, IconSparkles, IconTool,
  IconPlus, IconMinus,
} from '@tabler/icons-react-native';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';
import { auth, db } from '../lib/firebase';
import { registerPushToken } from '../lib/notifications';
import { type Order, type Service, type CartItem } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import EcoTrustBanner from '../components/EcoTrustBanner';
import ActiveOrderCard from '../components/home/ActiveOrderCard';
import SquareMeterSlider from '../components/SquareMeterSlider';

// ─── Types ────────────────────────────────────────────────────────────────────

type StrukenProduct = { id: string; name: string; price: number; category: string; order: number };
type IconComp       = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
type Nav            = NativeStackNavigationProp<HomeStackParamList>;

const ACTIVE_STATUSES = ['paid', 'collected', 'in_progress', 'ready_for_pickup'];

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  Icon, title, subtitle,
}: { Icon: IconComp; title: string; subtitle: string }) {
  return (
    <View style={subStyles.header}>
      <View style={subStyles.iconCircle}>
        <Icon size={14} color={colors.forestMid} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={subStyles.title}>{title}</Text>
        <Text style={subStyles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function ItemRow({
  icon: Icon, name, price, qty, onAdd, onRemove,
}: {
  icon: IconComp; name: string; price: number;
  qty: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <View style={subStyles.row}>
      <View style={subStyles.rowIcon}>
        <Icon size={15} color={colors.forestMid} strokeWidth={1.5} />
      </View>
      <Text style={[typography.body, { flex: 1 }]}>{name}</Text>
      <View style={subStyles.stepper}>
        <Text style={subStyles.priceLabel}>{qty > 0 ? `${price * qty} kr` : `${price} kr`}</Text>
        <TouchableOpacity
          style={[subStyles.stepBtn, qty === 0 && { opacity: 0.35 }]}
          onPress={qty > 0 ? onRemove : undefined}
          activeOpacity={0.7}
        >
          <IconMinus size={11} color={colors.forestMid} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={subStyles.stepCount}>{qty}</Text>
        <TouchableOpacity style={subStyles.stepBtn} onPress={onAdd} activeOpacity={0.7}>
          <IconPlus size={11} color={colors.forestMid} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const subStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
    marginBottom:  spacing.md,
  },
  iconCircle: {
    width:          28,
    height:         28,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(74,124,89,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  title:    { fontFamily: 'DMSans_500',     fontSize: 15, color: colors.textDark },
  subtitle: { fontFamily: 'DMSans_400',     fontSize: 12, color: colors.textMuted, marginTop: 2 },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   13,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(30,46,36,0.08)',
    gap:               spacing.md,
  },
  rowIcon: {
    width:          32,
    height:         32,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    colors.linen,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  stepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    flexShrink:    0,
  },
  priceLabel: {
    fontFamily:        'DMSans_500',
    fontSize:          13,
    color:             colors.textMid,
    minWidth:          52,
    textAlign:         'right',
  },
  stepBtn: {
    width:          26,
    height:         26,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(74,124,89,0.3)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontFamily: 'DMSans_500',
    fontSize:   13,
    color:      colors.textDark,
    minWidth:   18,
    textAlign:  'center',
  },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();

  // Active order & auth
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [userName, setUserName]       = useState('');

  // Catalog data
  const [strukenCatalog, setStrukenCatalog] = useState<StrukenProduct[]>([]);
  const [services, setServices]             = useState<Service[]>([]);
  const [loading, setLoading]               = useState(true);

  // Cart state
  const [mattKvm, setMattKvm]       = useState(5);
  const [mattItems, setMattItems]   = useState<{ sqm: number; qty: number }[]>([]);
  const [basket, setBasket]         = useState<Record<string, number>>({}); // id → qty

  // ── Auth + live order ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      setUserName(user?.displayName?.split(' ')[0] ?? '');
      if (!user) { setActiveOrder(null); return; }

      registerPushToken(user.uid).catch(() => {});

      const q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
      const unsubOrders = onSnapshot(q, snap => {
        const all = snap.docs.map(d => ({
          ...d.data(),
          id:        d.id,
          createdAt: d.data().createdAt instanceof Timestamp
            ? d.data().createdAt.toDate()
            : new Date(),
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

  // ── Catalog fetching (via API — no auth required) ─────────────────────────
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
  function addItem(id: string) {
    setBasket(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }
  function removeItem(id: string) {
    setBasket(prev => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  }
  function addMatt(sqm: number) {
    setMattItems(prev => {
      const hit = prev.find(m => m.sqm === sqm);
      if (hit) return prev.map(m => m.sqm === sqm ? { ...m, qty: m.qty + 1 } : m);
      return [...prev, { sqm, qty: 1 }];
    });
  }
  function removeMatt(sqm: number) {
    setMattItems(prev => {
      const hit = prev.find(m => m.sqm === sqm);
      if (!hit) return prev;
      if (hit.qty <= 1) return prev.filter(m => m.sqm !== sqm);
      return prev.map(m => m.sqm === sqm ? { ...m, qty: m.qty - 1 } : m);
    });
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  function handleCheckout() {
    const cartItems: CartItem[] = [];

    for (const m of mattItems) {
      cartItems.push({
        id:    `matta-${m.sqm}`,
        name:  `Matta ${m.sqm} m²`,
        price: m.sqm * 90,
        qty:   m.qty,
        type:  'mattvätt',
      });
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
  const mattPrice       = mattKvm * 90;
  const currentMattQty  = mattItems.find(m => m.sqm === mattKvm)?.qty ?? 0;
  const mattTotalCount  = mattItems.reduce((s, m) => s + m.qty, 0);
  const mattTotal       = mattItems.reduce((s, m) => s + m.sqm * 90 * m.qty, 0);
  const strukenTotal    = strukenCatalog.reduce((s, p) => s + (basket[p.id] ?? 0) * p.price, 0);
  const svcTotal        = services.reduce((s, svc) => s + (basket[svc.id] ?? 0) * (svc.price_ore / 100), 0);
  const cartTotal       = mattTotal + strukenTotal + svcTotal;
  const cartCount       = mattTotalCount + Object.values(basket).reduce((s, n) => s + n, 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <TopBar title="Amos Skrädderi" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, cartCount > 0 && { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <View style={styles.section}>
          <Text style={typography.h1}>
            {userName ? `God dag, ${userName}.` : 'Välkommen.'}
          </Text>
          <Text style={[typography.small, { marginTop: 4 }]}>
            Vad vill du lämna in idag?
          </Text>
        </View>

        <EcoTrustBanner />

        {activeOrder && (
          <View style={styles.section}>
            <ActiveOrderCard order={activeOrder} />
          </View>
        )}

        {/* ── Mattvätt ──────────────────────────────────────────────────── */}
        <View style={styles.serviceCard}>
          <SectionHeader
            Icon={IconWash}
            title="Mattvätt"
            subtitle="Djuptvätt av mattor · Hämtning & leverans ingår alltid"
          />

          <View style={styles.sliderBox}>
            <SquareMeterSlider value={mattKvm} onChange={setMattKvm} />
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>PRIS</Text>
              <Text style={styles.priceValue}>{mattPrice} kr</Text>
              <Text style={typography.micro}>90 kr / m²</Text>
            </View>
          </View>

          {/* CTA — button when this size not in cart, stepper when it is */}
          {currentMattQty === 0 ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => addMatt(mattKvm)}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>
                Lägg till matta ({mattKvm} m²) — {mattPrice} kr
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.mattStepper}>
              <TouchableOpacity
                style={styles.mattStepBtn}
                onPress={() => removeMatt(mattKvm)}
                activeOpacity={0.7}
              >
                <IconMinus size={14} color={colors.forestMid} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.mattStepCount}>{currentMattQty}</Text>
              <TouchableOpacity
                style={styles.mattStepBtn}
                onPress={() => addMatt(mattKvm)}
                activeOpacity={0.7}
              >
                <IconPlus size={14} color={colors.forestMid} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.mattInCartLabel}>
                {mattTotalCount === 1 ? '1 matta i varukorgen' : `${mattTotalCount} mattor i varukorgen`}
              </Text>
            </View>
          )}
        </View>

        {/* ── Struken tvätt ─────────────────────────────────────────────── */}
        <View style={styles.serviceCard}>
          <SectionHeader
            Icon={IconSteam}
            title="Struken tvätt"
            subtitle="Skjortor, kostym & festklädsel — levereras hängda på galge"
          />

          {loading ? (
            <ActivityIndicator size="small" color={colors.forestMid} style={{ marginVertical: spacing.lg }} />
          ) : strukenCatalog.length === 0 ? (
            <Text style={[typography.small, { color: colors.textMuted, paddingVertical: spacing.md }]}>
              Inga produkter tillgängliga just nu.
            </Text>
          ) : (
            strukenCatalog.map(p => (
              <ItemRow
                key={p.id}
                icon={strukenIcon(p.name)}
                name={p.name}
                price={p.price}
                qty={basket[p.id] ?? 0}
                onAdd={() => addItem(p.id)}
                onRemove={() => removeItem(p.id)}
              />
            ))
          )}
        </View>

        {/* ── Klädvård & textil ──────────────────────────────────────────── */}
        <View style={[styles.serviceCard, { marginBottom: 0 }]}>
          <SectionHeader
            Icon={IconNeedle}
            title="Klädvård & textil"
            subtitle="Lagning, ändring, rengöring & skydd för dina textilier"
          />

          {loading ? (
            <ActivityIndicator size="small" color={colors.forestMid} style={{ marginVertical: spacing.lg }} />
          ) : services.length === 0 ? (
            <Text style={[typography.small, { color: colors.textMuted, paddingVertical: spacing.md }]}>
              Inga tjänster tillgängliga just nu.
            </Text>
          ) : (
            services.map(svc => (
              <ItemRow
                key={svc.id}
                icon={serviceIcon(svc.name)}
                name={svc.name}
                price={svc.price_ore / 100}
                qty={basket[svc.id] ?? 0}
                onAdd={() => addItem(svc.id)}
                onRemove={() => removeItem(svc.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Sticky order total bar ─────────────────────────────────────── */}
      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>
              {cartCount} {cartCount === 1 ? 'artikel' : 'artiklar'}
            </Text>
            <Text style={styles.cartTotal}>{cartTotal} kr</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={handleCheckout} activeOpacity={0.8}>
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
  content:   { padding: spacing.lg, paddingBottom: 100 },
  section:   { marginBottom: spacing.xl },

  // ─ Service section cards ─
  serviceCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    borderWidth:     0.5,
    borderColor:     'rgba(74,124,89,0.12)',
    shadowColor:     '#1e2e24',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
    marginBottom:    spacing.lg,
  },

  // ─ Mattvätt ─
  sliderBox: {
    backgroundColor: colors.cream,
    borderRadius:    radius.md,
    padding:         spacing.md,
    borderWidth:     0.5,
    borderColor:     'rgba(74,124,89,0.1)',
    marginBottom:    spacing.md,
  },
  priceRow: {
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontFamily:    'DMSans_400',
    fontSize:      10,
    color:         colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  2,
  } as any,
  priceValue: {
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   22,
    color:      colors.textDark,
  },

  primaryBtn: {
    backgroundColor: colors.forestDark,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
  },
  primaryBtnText: {
    fontFamily: 'DMSans_500',
    fontSize:   14,
    color:      colors.moss,
  },

  mattStepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  mattStepBtn: {
    width:          34,
    height:         34,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(74,124,89,0.3)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  mattStepCount: {
    fontFamily: 'DMSans_500',
    fontSize:   15,
    color:      colors.textDark,
    minWidth:   20,
    textAlign:  'center',
  },
  mattInCartLabel: {
    fontFamily: 'DMSans_400',
    fontSize:   12,
    color:      colors.textMuted,
  },

  // ─ Cart bar ─
  cartBar: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   colors.forestDark,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.xxl,
  },
  cartCount: {
    fontFamily: 'DMSans_400',
    fontSize:   11,
    color:      'rgba(200,223,192,0.6)',
  },
  cartTotal: {
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   22,
    color:      colors.moss,
  },
  cartBtn: {
    backgroundColor:   colors.forestLight,
    borderRadius:      radius.md,
    paddingVertical:   11,
    paddingHorizontal: spacing.lg,
  } as any,
  cartBtnText: {
    fontFamily: 'DMSans_500',
    fontSize:   13,
    color:      colors.forestDark,
  },
});
