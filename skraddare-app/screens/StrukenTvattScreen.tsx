import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import {
  IconShirt,
  IconHanger,
  IconStar,
  IconWash,
  IconMountain,
  IconNeedleThread,
  IconMinus,
  IconPlus,
} from '@tabler/icons-react-native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'Herr' | 'Dam' | 'Fest' | 'Hem' | 'Utomhus' | 'Skrädderi';

interface Product {
  id:       string;
  name:     string;
  price:    number;
  category: Category;
  order:    number;
}

// ─── Category config (icons stay in the UI layer) ─────────────────────────────

type IconComp = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

const CATEGORIES: Category[] = ['Herr', 'Dam', 'Fest', 'Hem', 'Utomhus', 'Skrädderi'];

const CATEGORY_ICON: Record<Category, IconComp> = {
  Herr:      IconShirt,
  Dam:       IconHanger,
  Fest:      IconStar,
  Hem:       IconWash,
  Utomhus:   IconMountain,
  Skrädderi: IconNeedleThread,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryChip({
  label, active, onPress,
}: {
  label: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProductRow({
  product, qty, onAdd, onRemove,
}: {
  product: Product; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  const Icon = CATEGORY_ICON[product.category];
  return (
    <View style={styles.productRow}>
      <View style={styles.productIcon}>
        <Icon size={16} color={colors.forestMid} strokeWidth={1.5} />
      </View>

      <View style={styles.productInfo}>
        <Text style={typography.body}>{product.name}</Text>
        <Text style={[typography.micro, styles.productPrice]}>{product.price} kr / plagg</Text>
      </View>

      {qty === 0 ? (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.7}>
          <IconPlus size={14} color={colors.forestMid} strokeWidth={2} />
        </TouchableOpacity>
      ) : (
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={onRemove} activeOpacity={0.7}>
            <IconMinus size={12} color={colors.forestMid} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.stepCount}>{qty}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={onAdd} activeOpacity={0.7}>
            <IconPlus size={12} color={colors.forestMid} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StrukenTvattScreen() {
  const navigation = useNavigation<any>();

  const [catalog, setCatalog]         = useState<Partial<Record<Category, Product[]>>>({});
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setCategory] = useState<Category>('Herr');
  const [basket, setBasket]           = useState<Record<string, number>>({});

  // ── Fetch from Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'StrukenTvatt'), orderBy('order'));
    const unsub = onSnapshot(q, snap => {
      const grouped: Partial<Record<Category, Product[]>> = {};
      for (const doc of snap.docs) {
        const p = { ...doc.data(), id: doc.id } as Product;
        if (!grouped[p.category]) grouped[p.category] = [];
        grouped[p.category]!.push(p);
      }
      setCatalog(grouped);
      setLoading(false);
    });
    return unsub;
  }, []);

  // ── Basket helpers ──────────────────────────────────────────────────────────
  function add(id: string) {
    setBasket(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function remove(id: string) {
    setBasket(prev => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id] -= 1;
      return next;
    });
  }

  const allProducts = Object.values(catalog).flat();
  const totalItems  = Object.values(basket).reduce((s, n) => s + n, 0);
  const totalPrice  = Object.entries(basket).reduce((s, [id, qty]) => {
    const p = allProducts.find(x => x.id === id);
    return s + (p?.price ?? 0) * qty;
  }, 0);

  const products = catalog[activeCategory] ?? [];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Struken tvätt" onBack={() => navigation.goBack()} />

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        {CATEGORIES.map(cat => (
          <CategoryChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onPress={() => setCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Product list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.forestMid} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {products.length === 0 ? (
            <Text style={[typography.body, styles.emptyText]}>Inga produkter i denna kategori.</Text>
          ) : (
            products.map(product => (
              <ProductRow
                key={product.id}
                product={product}
                qty={basket[product.id] ?? 0}
                onAdd={() => add(product.id)}
                onRemove={() => remove(product.id)}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Sticky bottom bar */}
      {totalItems > 0 && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomCount}>{totalItems} plagg</Text>
            <Text style={styles.bottomTotal}>{totalPrice} kr</Text>
          </View>
          <TouchableOpacity style={styles.nextBtn} activeOpacity={0.8}>
            <Text style={styles.nextBtnText}>Välj datum & tid</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─ Category chips ─
  chipScroll:        { flexGrow: 0 },
  chipScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    gap:               spacing.xs,
  },
  chip: {
    paddingVertical:   6,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.sharp,
    borderWidth:       0.5,
    borderColor:       colors.linen,
    backgroundColor:   'transparent',
  },
  chipActive: {
    backgroundColor: colors.forestDark,
    borderColor:     colors.forestDark,
  },
  chipText: {
    fontFamily:    'Poppins_400',
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } as any,
  chipTextActive: { color: colors.moss },

  // ─ Product list ─
  list:        { flex: 1 },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  emptyText:   { marginTop: spacing.xl, textAlign: 'center', color: colors.textMuted },

  productRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   13,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(6,63,65,0.08)',
    gap:               spacing.md,
  },
  productIcon: {
    width:          36,
    height:         36,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    colors.linen,
    alignItems:     'center',
    justifyContent: 'center',
  },
  productInfo:  { flex: 1, gap: 2 },
  productPrice: { color: colors.textMuted },

  // ─ Quantity stepper ─
  addBtn: {
    width:          30,
    height:         30,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(14,92,91,0.3)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  stepBtn: {
    width:          28,
    height:         28,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(14,92,91,0.3)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontFamily: 'Poppins_500',
    fontSize:   14,
    color:      colors.textDark,
    minWidth:   20,
    textAlign:  'center',
  },

  // ─ Bottom bar ─
  bottomBar: {
    position:          'absolute',
    bottom:            0,
    left:              0,
    right:             0,
    backgroundColor:   colors.forestDark,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    paddingBottom:     spacing.xl,
  },
  bottomCount: {
    fontFamily: 'Poppins_400',
    fontSize:   11,
    color:      'rgba(183,220,215,0.6)',
  },
  bottomTotal: {
    fontFamily: 'Poppins_600',
    fontSize:   20,
    color:      colors.moss,
  },
  nextBtn: {
    backgroundColor:   colors.forestLight,
    borderRadius:      radius.md,
    paddingVertical:   11,
    paddingHorizontal: spacing.lg,
  },
  nextBtnText: {
    fontFamily: 'Poppins_500',
    fontSize:   13,
    color:      colors.forestDark,
  },
});
