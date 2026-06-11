import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../navigation/RootNavigator';
import { type CartItem } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import AddressAutocomplete from '../components/AddressAutocomplete';
import DatePickerModal from '../components/DatePickerModal';
import TopBar from '../components/TopBar';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Checkout'>;
  route:      RouteProp<HomeStackParamList, 'Checkout'>;
};

export default function CheckoutScreen({ navigation, route }: Props) {
  const { items, total } = route.params;

  const today = new Date();
  const DATE_PLACEHOLDER = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-dd`;

  const [address,          setAddress]          = useState('');
  const [postalCode,       setPostalCode]        = useState('');
  const [addressConfirmed, setAddressConfirmed]  = useState(false);
  const [date,             setDate]              = useState('');
  const [time,             setTime]              = useState('');
  const [notes,            setNotes]             = useState('');
  const [showDatePicker,   setShowDatePicker]    = useState(false);

  function handleNext() {
    if (!addressConfirmed) {
      Alert.alert('Välj en adress', 'Välj en adress från förslagen för att fortsätta.');
      return;
    }
    if (!date.trim() || !time.trim()) {
      Alert.alert('Fyll i alla fält', 'Datum och tid krävs.');
      return;
    }
    navigation.navigate('CartPayment', {
      items, total, address, postalCode, date, time, notes,
    });
  }

  return (
    <View style={styles.container}>
      <TopBar title="Uppgifter & datum" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Order summary ───────────────────────────────────────────── */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Din beställning</Text>

          {items.map(item => (
            <View key={item.id} style={styles.summaryRow}>
              <Text style={styles.summaryName} numberOfLines={1}>
                {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
              </Text>
              <Text style={styles.summaryPrice}>{item.price * item.qty} kr</Text>
            </View>
          ))}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryName}>Hämtning & leverans</Text>
            <Text style={styles.summaryPrice}>Ingår</Text>
          </View>

          <View style={[styles.summaryRow, { marginTop: spacing.xs }]}>
            <Text style={styles.totalLabel}>Totalt</Text>
            <Text style={styles.totalValue}>{total} kr</Text>
          </View>
        </View>

        {/* ── Booking form ────────────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Hämtningsuppgifter</Text>

        <Text style={styles.fieldLabel}>Gatuadress</Text>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={(addr, postal) => {
            setAddress(addr);
            setPostalCode(postal);
          }}
          onConfirmChange={setAddressConfirmed}
          inputStyle={styles.input}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Datum för hämtning</Text>
        <TouchableOpacity
          style={[styles.input, styles.pickerBtn]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
            {date ? formatDateDisplay(date) : DATE_PLACEHOLDER}
          </Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Tid för hämtning</Text>
        <TextInput
          style={styles.input}
          placeholder="t.ex. 09:00"
          placeholderTextColor={colors.textMuted}
          value={time}
          onChangeText={setTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        <Text style={styles.fieldLabel}>Övriga önskemål (valfritt)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Portkod, specialinstruktioner…"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
        />
      </ScrollView>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.btnText}>Gå till betalning — {total} kr</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onConfirm={setDate}
        onClose={() => setShowDatePicker(false)}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, paddingBottom: spacing.xxl },

  // ─ Summary card ─
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    padding:         spacing.xl,
    borderWidth:     0.5,
    borderColor:     'rgba(14,92,91,0.12)',
    marginBottom:    spacing.xl,
  },
  summaryTitle: {
    fontFamily:   'Inter_500',
    fontSize:     13,
    color:        colors.textDark,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
    marginBottom:   spacing.xs,
  },
  summaryName: {
    ...typography.small,
    color: colors.textMid,
    flex:  1,
    marginRight: spacing.sm,
  },
  summaryPrice: {
    fontFamily:        'Inter_500',
    fontSize:          13,
    color:             colors.textMid,
    fontVariant:       ['tabular-nums'] as any,
  },
  summaryDivider: {
    height:         0.5,
    backgroundColor: 'rgba(6,63,65,0.08)',
    marginVertical:  spacing.sm,
  },
  totalLabel: {
    fontFamily: 'Inter_500',
    fontSize:   14,
    color:      colors.textDark,
  },
  totalValue: {
    fontFamily: 'Inter_600',
    fontSize:   20,
    color:      colors.textDark,
  },

  // ─ Form ─
  sectionHeading: {
    fontFamily:   'Inter_600',
    fontSize:     16,
    color:        colors.white,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontFamily:    'Inter_400',
    fontSize:      10,
    color:         colors.moss,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  spacing.xs,
  } as any,
  input: {
    backgroundColor:  colors.linen,
    borderRadius:     radius.md,
    borderWidth:      0.5,
    borderColor:      'rgba(14,92,91,0.15)',
    paddingVertical:  spacing.md,
    paddingHorizontal: spacing.md,
    fontFamily:       'Inter_400',
    fontSize:         14,
    color:            colors.textDark,
    marginBottom:     spacing.lg,
  },
  notesInput: {
    height:     88,
    textAlignVertical: 'top',
  },

  pickerBtn:         { justifyContent: 'center' },
  pickerValue:       { fontFamily: 'Inter_400', fontSize: 14, color: colors.textDark },
  pickerPlaceholder: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted },

  // ─ Footer CTA ─
  footer: {
    padding:       spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.cream,
    borderTopWidth: 0.5,
    borderColor:    'rgba(14,92,91,0.1)',
  },
  btn: {
    backgroundColor: colors.earth,
    borderRadius:    radius.md,
    paddingVertical: spacing.md,
    alignItems:      'center',
  },
  btnText: {
    fontFamily: 'Inter_600',
    fontSize:   15,
    color:      colors.textDark,
  },
});
