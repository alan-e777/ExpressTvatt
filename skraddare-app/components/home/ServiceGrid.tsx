import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  IconSteam,
  IconWash,
  IconHanger,
  IconArrowRight,
  IconBolt,
} from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

type Nav = NativeStackNavigationProp<HomeStackParamList>;
type IconComp = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface ServiceButton {
  id:       string;
  Icon:     IconComp;
  title:    string;
  subtitle: string;
  action:   (nav: Nav) => void;
}

const SERVICES: ServiceButton[] = [
  {
    id:       'struken',
    Icon:     IconSteam,
    title:    'Struken tvätt',
    subtitle: 'Skjortor, kläder & mer',
    action:   nav => nav.navigate('StrukenTvatt'),
  },
  {
    id:       'hushall',
    Icon:     IconWash,
    title:    'Hushållstvätt',
    subtitle: 'Lakan, handdukar & mer',
    action:   () => {},
  },
  {
    id:       'kladavard',
    Icon:     IconHanger,
    title:    'Klädvård',
    subtitle: 'Impregnering & vård',
    action:   () => {},
  },
  {
    id:       'hoppa',
    Icon:     IconArrowRight,
    title:    'Hoppa över',
    subtitle: 'Fortsätt utan tvätt',
    action:   () => {},
  },
  {
    id:       'express',
    Icon:     IconBolt,
    title:    'Express Tvätt (24 tim)',
    subtitle: 'Klart nästa dag',
    action:   () => {},
  },
];

// ─── Grid card (2-column) ─────────────────────────────────────────────────────

function GridCard({ service, onPress }: { service: ServiceButton; onPress: () => void }) {
  const { Icon, title, subtitle } = service;
  return (
    <TouchableOpacity style={styles.gridCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconCircle, styles.iconCircleGrid]}>
        <Icon size={15} color={colors.forestMid} strokeWidth={1.5} />
      </View>
      <Text style={typography.bodyBold}>{title}</Text>
      <Text style={typography.micro}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── Wide card (full-width) ───────────────────────────────────────────────────

function WideCard({ service, onPress }: { service: ServiceButton; onPress: () => void }) {
  const { Icon, title, subtitle } = service;
  return (
    <TouchableOpacity style={styles.wideCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconCircle}>
        <Icon size={15} color={colors.forestMid} strokeWidth={1.5} />
      </View>
      <View style={styles.wideText}>
        <Text style={typography.bodyBold}>{title}</Text>
        <Text style={typography.micro}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── ServiceGrid ──────────────────────────────────────────────────────────────

export default function ServiceGrid() {
  const navigation = useNavigation<Nav>();
  const [a, b, c, d, e] = SERVICES;

  return (
    <View>
      <Text style={[typography.label, styles.sectionLabel]}>Välj tjänst</Text>

      <View style={styles.grid}>
        <View style={styles.row}>
          <GridCard service={a} onPress={() => a.action(navigation)} />
          <GridCard service={b} onPress={() => b.action(navigation)} />
        </View>
        <View style={styles.row}>
          <GridCard service={c} onPress={() => c.action(navigation)} />
          <GridCard service={d} onPress={() => d.action(navigation)} />
        </View>
        <WideCard service={e} onPress={() => e.action(navigation)} />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: spacing.sm },

  grid: { gap: spacing.sm },
  row:  { flexDirection: 'row', gap: spacing.sm },

  gridCard: {
    flex:            1,
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    gap:             4,
  },

  wideCard: {
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
  },
  wideText: { gap: 2 },

  iconCircle: {
    width:          30,
    height:         30,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(14,92,91,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  // Extra bottom spacing when the icon sits above text in a vertical card
  iconCircleGrid: {
    marginBottom: 4,
  },
});
