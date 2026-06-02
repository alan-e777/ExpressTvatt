import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  IconCalendarPlus,
  IconPackage,
  IconShirt,
  IconStar,
} from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Action {
  Icon:      React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  title:     string;
  subtitle:  string;
  tab:       string;
}

const ACTIONS: Action[] = [
  {
    Icon:     IconCalendarPlus,
    title:    'Boka ny tid',
    subtitle: 'Välj tjänst & datum',
    tab:      'Products',
  },
  {
    Icon:     IconPackage,
    title:    'Mina ärenden',
    subtitle: '2 aktiva · 8 avslutade',
    tab:      'Ärenden',
  },
  {
    Icon:     IconShirt,
    title:    'Skrädderi',
    subtitle: 'Lagning & ändring',
    tab:      'Products',
  },
  {
    Icon:     IconStar,
    title:    'Favoriter',
    subtitle: 'Dina sparade tjänster',
    tab:      'Profil',
  },
];

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ action, onPress }: { action: Action; onPress: () => void }) {
  const { Icon, title, subtitle } = action;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconCircle}>
        <Icon size={15} color={colors.forestMid} strokeWidth={1.5} />
      </View>
      <Text style={typography.bodyBold}>{title}</Text>
      <Text style={typography.micro}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── QuickActions ─────────────────────────────────────────────────────────────

export default function QuickActions() {
  const navigation = useNavigation<any>();

  function goToTab(tab: string) {
    navigation.getParent()?.navigate(tab);
  }

  const row1 = ACTIONS.slice(0, 2);
  const row2 = ACTIONS.slice(2, 4);

  return (
    <View>
      <Text style={[typography.label, styles.sectionLabel]}>Snabbåtgärder</Text>

      <View style={styles.grid}>
        <View style={styles.gridRow}>
          {row1.map((a) => (
            <ActionCard key={a.title} action={a} onPress={() => goToTab(a.tab)} />
          ))}
        </View>
        <View style={styles.gridRow}>
          {row2.map((a) => (
            <ActionCard key={a.title} action={a} onPress={() => goToTab(a.tab)} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: spacing.sm },

  grid:    { gap: spacing.sm },
  gridRow: { flexDirection: 'row', gap: spacing.sm },

  card: {
    flex:            1,
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             4,
  },
  iconCircle: {
    width:          30,
    height:         30,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(74,124,89,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.xs,
  },
});
