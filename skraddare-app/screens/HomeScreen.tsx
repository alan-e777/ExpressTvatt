import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import {
  IconStar, IconSpray, IconWash, IconSteam, IconSparkles,
  IconPlus, IconMinus, IconChevronRight, IconArrowLeft, IconX, IconCheck, IconTag,
} from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/RootNavigator';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { registerPushToken } from '../lib/notifications';
import { useCart } from '../lib/cart';
import { getProductIcon, type IconComp } from '../lib/productIcons';
import {
  DISCOUNT_DEFAULTS, discountedUnitPrice, computeCartTotals, type DiscountSettings,
} from '../lib/discount';
import { rutNetKr, rutRefundKr, RUT_DISCOUNT_PERCENT } from '../lib/rut';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ─── Types ────────────────────────────────────────────────────────────────────

type StrukenProduct = { id: string; name: string; price: number; category: string; order: number; discountPercent?: number; icon?: string };
type Nav            = NativeStackNavigationProp<HomeStackParamList>;
type CatId          = 'hushallstvatt' | 'mattvatt' | 'hem' | 'tvatt';

// ─── Categories — mirrors the website /order five-category structure ────────────
// `dbCategory` is the value stored on each StrukenTvatt product (null = the
// category renders a fixed local list rather than Firestore).
type CatMeta = { id: CatId; label: string; dbCategory: string | null; desc: string; subtitle: string; Icon: IconComp };

const CATEGORIES: CatMeta[] = [
  { id: 'hushallstvatt', label: 'Hushållstvätt', dbCategory: 'Hushållstvätt', Icon: IconWash,     desc: 'Tvätt per kilo & plagg',   subtitle: 'Tvätt per kilo och styckvis — hämtning & leverans ingår' },
  { id: 'mattvatt',      label: 'Mattvätt',      dbCategory: null,            Icon: IconSpray,    desc: 'Djuptvätt av mattor',      subtitle: 'Djuptvätt av mattor — hämtning & leverans ingår alltid' },
  { id: 'hem',           label: 'Hem',           dbCategory: 'Hem',           Icon: IconSparkles, desc: 'Hemtextil & möbeltextil',  subtitle: 'Täcken, kuddar, gardiner, madrasser & möbeltextil' },
  { id: 'tvatt',         label: 'Tvätt',         dbCategory: 'Tvätt',         Icon: IconSteam,    desc: 'Kemtvätt & finare plagg',  subtitle: 'Kemtvätt av kostym, klänning, ytterplagg m.m.' },
];

// Fixed mattvätt sizes (server re-validates these prices in create-cart-payment)
const MATT_OPTIONS: { id: string; name: string; price: number; Icon: IconComp }[] = [
  { id: 'matta-liten', name: 'Matta liten (< 2 m²)', price: 299, Icon: IconSpray },
  { id: 'matta-stor',  name: 'Matta stor (> 2 m²)',  price: 499, Icon: IconSpray },
  { id: 'matta-akta',  name: 'Äkta / orientalisk',    price: 699, Icon: IconStar },
];

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
      <View style={sub.iconCircle}><Icon size={16} color={colors.forestMid} strokeWidth={1.5} /></View>
      <View style={{ flex: 1 }}>
        <Text style={sub.title}>{title}</Text>
        <Text style={sub.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const sub = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.lg },
  iconCircle: {
    width: 36, height: 36, borderRadius: radius.circle,
    backgroundColor: colors.mint, borderWidth: 0.5, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontFamily: 'Inter_600', fontSize: 16, color: colors.textDark },
  subtitle: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, marginTop: 2 },
});

// ─── Product tile (2-column grid — mirrors website .prod-tile) ──────────────────

function ProductTile({ Icon, name, price, shownPrice, qty, onAdd, onRemove }: {
  Icon: IconComp; name: string; price: number; shownPrice: number;
  qty: number; onAdd: () => void; onRemove: () => void;
}) {
  const showStrike = shownPrice !== price;
  return (
    <TouchableOpacity style={[pt.tile, qty > 0 && pt.tileActive]} onPress={onAdd} activeOpacity={0.85}>
      <View style={pt.iconCircle}><Icon size={22} color={colors.forestMid} strokeWidth={1.5} /></View>
      <Text style={pt.name} numberOfLines={2}>{name}</Text>
      <View style={pt.foot}>
        {showStrike ? (
          <View style={pt.priceCol}>
            <Text style={pt.priceStrike}>{price} kr</Text>
            <Text style={pt.priceNew}>{shownPrice} kr<Text style={pt.per}> /st</Text></Text>
          </View>
        ) : (
          <Text style={pt.price}>{price} kr<Text style={pt.per}> /st</Text></Text>
        )}
        {qty === 0 ? (
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
    </TouchableOpacity>
  );
}

const pt = StyleSheet.create({
  tile: {
    width: '48%', backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)',
    paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
    alignItems: 'center', gap: spacing.md, marginBottom: spacing.md,
  },
  tileActive: { borderColor: colors.forestDark },
  iconCircle: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.mint, borderWidth: 1, borderColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark, textAlign: 'center', lineHeight: 18 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, width: '100%' },
  priceCol:    { alignItems: 'flex-start' },
  price:       { fontFamily: 'Inter_700', fontSize: 18, color: colors.textDark },
  priceStrike: { fontFamily: 'Inter_400', fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through', lineHeight: 14 },
  priceNew:    { fontFamily: 'Inter_700', fontSize: 18, color: colors.forestDark, lineHeight: 22 },
  per:   { fontFamily: 'Inter_500', fontSize: 11, color: colors.textMuted },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.forestDark, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(8,63,65,0.25)', backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  qty: { fontFamily: 'Inter_600', fontSize: 15, color: colors.textDark, minWidth: 20, textAlign: 'center' },
});

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const cart = useCart();

  const [catalog, setCatalog]   = useState<Record<string, StrukenProduct[]>>({});
  const [loading, setLoading]   = useState(true);
  const [openCat, setOpenCat]   = useState<CatId | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [discountSettings, setDiscountSettings] = useState<DiscountSettings>(DISCOUNT_DEFAULTS);
  const [deliverySettings, setDeliverySettings] = useState<{ freeDeliveryThresholdKr: number; deliveryFeeKr: number }>({ freeDeliveryThresholdKr: 0, deliveryFeeKr: 0 });
  const [hasPlacedOrder, setHasPlacedOrder]     = useState<boolean | null>(null);
  const [userId, setUserId]                     = useState<string | undefined>();

  // Register push token on sign-in (active orders live on the Profile tab)
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(user => {
      setUserId(user?.uid);
      if (user) registerPushToken(user.uid).catch(() => {});
      if (!user) { setHasPlacedOrder(null); return; }
      getDoc(doc(db, 'customers', user.uid))
        .then(snap => setHasPlacedOrder(snap.exists() ? snap.data()?.hasPlacedOrder === true : false))
        .catch(() => setHasPlacedOrder(false));
    });
    return unsubAuth;
  }, []);

  // Unified catalogue (all categories live in StrukenTvatt) + public settings.
  useEffect(() => {
    fetch(`${API_URL}/api/struken-tvatt`)
      .then(r => r.json() as Promise<StrukenProduct[]>)
      .then(products => {
        const grouped: Record<string, StrukenProduct[]> = {};
        for (const p of Array.isArray(products) ? products : []) (grouped[p.category] ??= []).push(p);
        for (const c of Object.keys(grouped)) grouped[c].sort((a, b) => a.order - b.order);
        setCatalog(grouped);
      })
      .catch(err => console.error('Catalog fetch failed', err))
      .finally(() => setLoading(false));

    fetch(`${API_URL}/api/discount-settings`).then(r => r.json()).then(setDiscountSettings).catch(() => {});
    fetch(`${API_URL}/api/delivery-settings`).then(r => r.json()).then(setDeliverySettings).catch(() => {});
  }, []);

  const isFirstTime = !!userId && hasPlacedOrder === false;

  // Per-item discount % by line id (struken from the product, mattvätt from settings).
  const discountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const list of Object.values(catalog)) for (const p of list) map[p.id] = p.discountPercent ?? 0;
    for (const m of MATT_OPTIONS) map[m.id] = discountSettings.mattvatt[m.id as keyof typeof discountSettings.mattvatt] ?? 0;
    return map;
  }, [catalog, discountSettings]);
  const perItemPct = (id: string) => discountById[id] ?? 0;

  // Map every selectable product id → its category id (for the row badges).
  const idToCat = useMemo(() => {
    const map: Record<string, CatId> = {};
    for (const m of MATT_OPTIONS) map[m.id] = 'mattvatt';
    for (const cat of CATEGORIES) {
      if (!cat.dbCategory) continue;
      for (const p of catalog[cat.dbCategory] ?? []) map[p.id] = cat.id;
    }
    return map;
  }, [catalog]);

  const { subtotalKr, totalKr: cartTotal, savingsKr } = computeCartTotals(
    cart.lines.map(l => ({ id: l.id, price: l.price, qty: l.qty })),
    perItemPct,
    { firstTimeDiscountPercent: discountSettings.firstTimeDiscountPercent, multipleDiscountsAllowed: discountSettings.multipleDiscountsAllowed },
    isFirstTime,
  );
  const cartCount    = cart.count;
  const rutAvdrag    = cart.rutAvdrag;
  const deliveryFeeKr = cartCount > 0 && cartTotal < deliverySettings.freeDeliveryThresholdKr ? deliverySettings.deliveryFeeKr : 0;
  const rutDiscountKr = rutAvdrag ? rutRefundKr(cartTotal) : 0;
  const grandTotalKr  = cartTotal - rutDiscountKr + deliveryFeeKr;

  const countFor = (id: CatId) => cart.lines.filter(l => idToCat[l.id] === id).reduce((s, l) => s + l.qty, 0);

  // Close the sheet automatically if the cart empties out
  useEffect(() => { if (cartCount === 0 && sheetOpen) setSheetOpen(false); }, [cartCount, sheetOpen]);

  const openMeta     = openCat ? CATEGORIES.find(c => c.id === openCat)! : null;
  const openProducts = openMeta?.dbCategory ? (catalog[openMeta.dbCategory] ?? []) : [];

  // Preview price for a tile (item-level discount, then optional RUT preview).
  function shownPriceFor(id: string, price: number): number {
    const itemPrice = discountedUnitPrice(price, perItemPct(id), 0, discountSettings.multipleDiscountsAllowed);
    return rutAvdrag ? rutNetKr(itemPrice) : itemPrice;
  }

  function handleCheckout() {
    if (cartCount === 0) return;
    navigation.navigate('Checkout');
  }

  return (
    <View style={styles.container}>
      <TopBar />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, cartCount > 0 && { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProgressSteps />

        {/* ── First-time discount banner ────────────────────────────────── */}
        {isFirstTime && discountSettings.firstTimeDiscountPercent > 0 && (
          <View style={ft.banner}>
            <View style={ft.iconCircle}><IconTag size={18} color={colors.forestDark} strokeWidth={2} /></View>
            <View style={{ flex: 1 }}>
              <Text style={ft.title}>{discountSettings.firstTimeDiscountPercent}% förstagångsrabatt</Text>
              <Text style={ft.sub}>Välkommen! Din rabatt läggs till automatiskt i kassan.</Text>
            </View>
          </View>
        )}

        {/* ── RUT-avdrag toggle ─────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <TouchableOpacity
            style={[rt.pill, rutAvdrag && rt.pillActive]}
            onPress={() => cart.setRutAvdrag(!rutAvdrag)}
            activeOpacity={0.8}
          >
            <View style={[rt.box, rutAvdrag && rt.boxActive]}>
              {rutAvdrag && <IconCheck size={11} color={colors.moss} strokeWidth={2.75} />}
            </View>
            <Text style={[rt.label, rutAvdrag && rt.labelActive]}>Visa pris med RUT-avdrag</Text>
            <View style={[rt.badge, rutAvdrag && rt.badgeActive]}>
              <Text style={[rt.badgeText, rutAvdrag && rt.badgeTextActive]}>−{RUT_DISCOUNT_PERCENT}%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── List view: category rows ──────────────────────────────────── */}
        {openCat === null && (
          <View style={styles.serviceCard}>
            <View>
              {CATEGORIES.map((c, i) => {
                const count = countFor(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[catr.row, i < CATEGORIES.length - 1 && catr.rowBorder]}
                    onPress={() => setOpenCat(c.id)}
                    activeOpacity={0.6}
                  >
                    <View style={catr.icon}><c.Icon size={20} color={colors.forestMid} strokeWidth={1.5} /></View>
                    <View style={catr.text}>
                      <Text style={catr.title}>{c.label}</Text>
                      <Text style={catr.desc} numberOfLines={1}>{c.desc}</Text>
                    </View>
                    {count > 0 && <View style={catr.badge}><Text style={catr.badgeText}>{count}</Text></View>}
                    <IconChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Detail view: opened category ──────────────────────────────── */}
        {openMeta && (
          <>
            <TouchableOpacity style={catr.back} onPress={() => setOpenCat(null)} activeOpacity={0.7}>
              <IconArrowLeft size={16} color={colors.moss} strokeWidth={1.75} />
              <Text style={catr.backText}>Tillbaka</Text>
            </TouchableOpacity>

            <View style={styles.serviceCard}>
              <SectionHeader Icon={openMeta.Icon} title={openMeta.label} subtitle={openMeta.subtitle} />

              {/* Mattvätt — three fixed sizes */}
              {openMeta.id === 'mattvatt' && (
                <View style={styles.grid}>
                  {MATT_OPTIONS.map(m => (
                    <ProductTile
                      key={m.id} Icon={m.Icon} name={m.name} price={m.price} shownPrice={shownPriceFor(m.id, m.price)}
                      qty={cart.qtyOf(m.id)}
                      onAdd={() => cart.add({ id: m.id, name: m.name, price: m.price, type: 'mattvätt' })}
                      onRemove={() => cart.remove(m.id)}
                    />
                  ))}
                </View>
              )}

              {/* Catalogue-backed categories — product grid */}
              {openMeta.dbCategory && (
                loading ? (
                  <ActivityIndicator size="small" color={colors.forestMid} style={{ marginVertical: spacing.lg }} />
                ) : openProducts.length === 0 ? (
                  <Text style={styles.emptyText}>Inga produkter tillgängliga just nu.</Text>
                ) : (
                  <View style={styles.grid}>
                    {openProducts.map(p => (
                      <ProductTile
                        key={p.id} Icon={getProductIcon(p.icon, p.name)} name={p.name} price={p.price}
                        shownPrice={shownPriceFor(p.id, p.price)}
                        qty={cart.qtyOf(p.id)}
                        onAdd={() => cart.add({ id: p.id, name: p.name, price: p.price, type: 'struken', icon: p.icon })}
                        onRemove={() => cart.remove(p.id)}
                      />
                    ))}
                  </View>
                )
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Fixed bottom bar ──────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <TouchableOpacity onPress={() => setSheetOpen(true)} activeOpacity={0.7}>
            <Text style={styles.cartCount}>{cartCount} {cartCount === 1 ? 'produkt' : 'produkter'}</Text>
            <View style={styles.cartTotalRow}>
              <Text style={styles.cartTotal}>{grandTotalKr} kr</Text>
              <IconChevronRight size={15} color={colors.moss} strokeWidth={2} style={{ transform: [{ rotate: '-90deg' }] }} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cartBtn} onPress={handleCheckout} activeOpacity={0.85}>
            <Text style={styles.cartBtnText}>Gå till bokning →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bottom sheet: line-item list + breakdown ──────────────────────── */}
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
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            {cart.lines.map(line => (
              <View key={line.id} style={sh.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={sh.rowName} numberOfLines={1}>{line.name}</Text>
                  <Text style={sh.rowPer}>{line.price} kr / st</Text>
                </View>
                <View style={pt.stepper}>
                  <TouchableOpacity style={pt.stepBtn} onPress={() => cart.remove(line.id)} activeOpacity={0.7}>
                    <IconMinus size={13} color={colors.forestDark} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={pt.qty}>{line.qty}</Text>
                  <TouchableOpacity style={pt.stepBtn} onPress={() => cart.add({ id: line.id, name: line.name, price: line.price, type: line.type, icon: line.icon })} activeOpacity={0.7}>
                    <IconPlus size={13} color={colors.forestDark} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <Text style={sh.lineTotal}>{line.price * line.qty} kr</Text>
              </View>
            ))}

            <View style={{ paddingTop: spacing.md }}>
              <View style={sh.sumRow}>
                <Text style={sh.sumLabel}>Delsumma</Text>
                <Text style={sh.sumLabel}>{subtotalKr} kr</Text>
              </View>
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

  serviceCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl,
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', marginBottom: spacing.lg,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyText: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.md } as any,

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

// First-time banner
const ft = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.forestDark, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
  },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700', fontSize: 16, color: colors.moss, marginBottom: 3 },
  sub:   { fontFamily: 'Inter_400', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
});

// RUT toggle pill
const rt = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill,
    borderWidth: 0.5, borderColor: 'rgba(183,220,215,0.3)', backgroundColor: 'transparent',
  },
  pillActive: { backgroundColor: colors.linen, borderColor: colors.moss },
  box: {
    width: 16, height: 16, borderRadius: 5, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(183,220,215,0.5)',
  },
  boxActive: { borderWidth: 0, backgroundColor: colors.forestDark },
  label: { fontFamily: 'Inter_500', fontSize: 13, color: colors.forestLight },
  labelActive: { color: colors.forestDark },
  badge: { borderRadius: radius.pill, paddingVertical: 1, paddingHorizontal: 7, backgroundColor: 'rgba(183,220,215,0.18)' },
  badgeActive: { backgroundColor: colors.forestDark },
  badgeText: { fontFamily: 'Inter_600', fontSize: 11, color: colors.forestLight },
  badgeTextActive: { color: colors.moss },
});

// ─── Category rows + detail back link ──────────────────────────────────────────

const catr = StyleSheet.create({
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
  badge: { minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: colors.forestDark, alignItems: 'center', justifyContent: 'center' },
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
  sumRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sumLabel: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMid },
  discount: { fontFamily: 'Inter_600', fontSize: 13, color: colors.forestDark },
  ftBadge: { backgroundColor: colors.forestDark, borderRadius: radius.pill, paddingVertical: 1, paddingHorizontal: 7 },
  ftBadgeText: { fontFamily: 'Inter_600', fontSize: 10, color: colors.moss },
  totalDivider: { borderTopWidth: 0.5, borderTopColor: 'rgba(15,23,42,0.1)', paddingTop: spacing.md, marginTop: spacing.xs, marginBottom: 0 },
  grandLabel: { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  grandValue: { fontFamily: 'Inter_700', fontSize: 20, color: colors.textDark },
});
