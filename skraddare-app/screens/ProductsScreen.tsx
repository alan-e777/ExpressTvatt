import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import {
  IconHanger,
  IconShirt,
  IconDroplet,
  IconShield,
  IconBrush,
  IconScissors,
  IconNeedle,
  IconSparkles,
  IconWind,
  IconTool,
  IconChevronRight,
} from '@tabler/icons-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProductsStackParamList } from '../navigation/RootNavigator';
import { formatPrice, type Service } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import Chip from '../components/Chip';
import SkeletonBlock from '../components/SkeletonBlock';

type Props = {
  navigation: NativeStackNavigationProp<ProductsStackParamList, 'Products'>;
};

const CATEGORIES = ['Alla', 'Lagning', 'Ändring', 'Rengöring'];

type IconComponent = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

function serviceIcon(name: string): IconComponent {
  const n = name.toLowerCase();
  if (n.includes('gardin') || n.includes('hängare'))  return IconHanger;
  if (n.includes('plagg') || n.includes('skjorta') || n.includes('klädsel')) return IconShirt;
  if (n.includes('vatten') || n.includes('fläck') || n.includes('tvätt'))    return IconDroplet;
  if (n.includes('skydd') || n.includes('impregnering') || n.includes('mott')) return IconShield;
  if (n.includes('polstring') || n.includes('möbel') || n.includes('reng'))  return IconBrush;
  if (n.includes('press') || n.includes('stryk'))    return IconWind;
  if (n.includes('matta') || n.includes('djup'))     return IconSparkles;
  if (n.includes('lagning') || n.includes('reparation') || n.includes('skada')) return IconTool;
  if (n.includes('ändring') || n.includes('söm'))    return IconNeedle;
  return IconScissors;
}

// Exact-match category table (promptStyle.md). Fallback for unlisted services.
const CATEGORY_MAP: Record<string, string> = {
  'doftförbättring':              'Rengöring',
  'fläckborttagning':             'Rengöring',
  'rengöring av gardiner':        'Textil',
  'rengöring av möbelpolstring':  'Rengöring',
  'pressning och strykad':        'Ändring',
  'mottskydd & impregnering':     'Skydd',
  'tättrengöring av matta':       'Rengöring',
  'torkrengöring av plagg':       'Rengöring',
  'vattenskadoreparation':        'Lagning',
};

function serviceCategory(name: string): string {
  const key = name.toLowerCase().trim();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  // Heuristic fallback for any future services not yet in the map
  if (key.includes('skydd') || key.includes('impregnering')) return 'Skydd';
  if (key.includes('lagning') || key.includes('reparation') || key.includes('skada')) return 'Lagning';
  if (key.includes('ändring') || key.includes('söm') || key.includes('press')) return 'Ändring';
  if (key.includes('gardin') || key.includes('textil')) return 'Textil';
  return 'Rengöring';
}

export default function ProductsScreen({ navigation }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('Alla');

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/services`);
        if (!response.ok) throw new Error('Kunde inte hämta tjänster.');
        const data = await response.json();
        setServices(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ett fel inträffade');
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  return (
    <View style={styles.container}>
      <TopBar title="Express Tvätt" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              active={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>

        {error && (
          <Text style={[typography.small, { color: colors.earth, marginBottom: spacing.lg }]}>
            {error}
          </Text>
        )}

        {loading ? (
          <View>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonBlock width={34} height={34} borderRadius={radius.circle} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <SkeletonBlock width="55%" height={14} borderRadius={radius.sharp} />
                  <SkeletonBlock width="28%" height={10} borderRadius={radius.sharp} />
                </View>
                <SkeletonBlock width={44} height={15} borderRadius={radius.sharp} />
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => {
              const Icon = serviceIcon(item.name);
              const isLast = index === services.length - 1;
              return (
                <TouchableOpacity
                  style={[styles.listRow, !isLast && styles.listRowBorder]}
                  onPress={() => navigation.navigate('Book', { service: item })}
                  activeOpacity={0.6}
                >
                  <View style={styles.iconCircle}>
                    <Icon size={16} color={colors.forestMid} strokeWidth={1.5} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={typography.body}>{item.name}</Text>
                    <Text style={typography.label}>{serviceCategory(item.name)}</Text>
                  </View>
                  <Text style={styles.price}>{formatPrice(item.price_ore)}</Text>
                  <IconChevronRight size={12} color={colors.textMuted} strokeWidth={1.5} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },

  chipsScroll:  { marginHorizontal: -spacing.lg },
  chipsContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },

  // Skeleton row mirrors the real list-row shape
  skeletonRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.md,
    paddingVertical: 13,
  },

  // ServiceListItem rows
  listRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 13,
    gap:            spacing.md,
  },
  listRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(6,63,65,0.08)',
  },

  iconCircle: {
    width:         34,
    height:        34,
    borderRadius:  radius.circle,
    borderWidth:   0.5,
    borderColor:   colors.linen,
    alignItems:    'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },

  price: {
    fontFamily: 'Inter_600',
    fontSize:   15,
    color:      colors.textMid,
  },
});
