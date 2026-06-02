import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  IconWash,
  IconHanger,
  IconNeedleThread,
  IconDroplet,
  IconSteam,
  IconChevronRight,
} from '@tabler/icons-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

// ─── Static service data ──────────────────────────────────────────────────────

type IconComp = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

interface ServiceItem {
  Icon:     IconComp;
  name:     string;
  category: string;
  price:    string;
}

const SERVICES: ServiceItem[] = [
  { Icon: IconWash,         name: 'Matttvätt',            category: 'Rengöring',  price: '90 kr/m²'   },
  { Icon: IconHanger,       name: 'Rengöring av gardiner', category: 'Textil',     price: '45 kr/m'    },
  { Icon: IconNeedleThread, name: 'Lagning & ändring',     category: 'Skrädderi',  price: 'från 150 kr' },
  { Icon: IconDroplet,      name: 'Fläckborttagning',      category: 'Rengöring',  price: '300 kr'     },
  { Icon: IconSteam,        name: 'Pressning & strykning', category: 'Underhåll',  price: '200 kr'     },
];

// ─── ServiceList ──────────────────────────────────────────────────────────────

export default function ServiceList() {
  const navigation = useNavigation<any>();

  function goToProducts() {
    navigation.getParent()?.navigate('Products');
  }

  return (
    <View>
      <Text style={[typography.label, styles.sectionLabel]}>Alla tjänster</Text>

      <View>
        {SERVICES.map((item, index) => {
          const { Icon } = item;
          const isLast = index === SERVICES.length - 1;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.row, !isLast && styles.rowBorder]}
              onPress={goToProducts}
              activeOpacity={0.6}
            >
              <View style={styles.iconCircle}>
                <Icon size={16} color={colors.forestMid} strokeWidth={1.5} />
              </View>
              <View style={styles.rowText}>
                <Text style={typography.body}>{item.name}</Text>
                <Text style={typography.label}>{item.category}</Text>
              </View>
              <Text style={styles.price}>{item.price}</Text>
              <IconChevronRight size={12} color={colors.textMuted} strokeWidth={1.5} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: spacing.sm },

  row: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingVertical: 13,
    gap:             spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(30,46,36,0.08)',
  },
  iconCircle: {
    width:          36,
    height:         36,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    colors.linen,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  price: {
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   15,
    color:      colors.textMid,
  },
});
