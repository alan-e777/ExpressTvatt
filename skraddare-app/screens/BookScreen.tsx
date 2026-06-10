import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActionSheetIOS,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { ProductsStackParamList } from '../navigation/RootNavigator';
import { formatPrice, type CustomField } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import AddressAutocomplete from '../components/AddressAutocomplete';
import CTAButton from '../components/CTAButton';
import DatePickerModal from '../components/DatePickerModal';
import EcoBadge from '../components/EcoBadge';
import SquareMeterSlider from '../components/SquareMeterSlider';
import TopBar from '../components/TopBar';

type Props = {
  navigation: NativeStackNavigationProp<ProductsStackParamList, 'Book'>;
  route: RouteProp<ProductsStackParamList, 'Book'>;
};

// ─── Wheel Picker ───────────────────────────────────────────────────────────

const ITEM_H = 44;

function WheelPicker({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 50);
  }, []);

  return (
    <View style={wheel.container}>
      {/* selection band */}
      <View style={wheel.band} pointerEvents="none" />

      <ScrollView
        ref={ref}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          onSelect(Math.max(0, Math.min(idx, items.length - 1)));
        }}
      >
        {items.map((item, i) => (
          <View key={i} style={wheel.item}>
            <Text style={wheel.itemText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wheel = StyleSheet.create({
  container: { width: 72, height: ITEM_H * 3, overflow: 'hidden' },
  band: {
    position:        'absolute',
    top:             ITEM_H,
    left:            0,
    right:           0,
    height:          ITEM_H,
    borderTopWidth:  0.5,
    borderBottomWidth: 0.5,
    borderColor:     colors.forestMid,
    zIndex:          1,
  },
  item:     { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: 'Poppins_600', fontSize: 20, color: colors.textDark },
});

// ─── Time Picker Modal ───────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

function TimePickerModal({
  visible,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initial: string;
  onConfirm: (t: string) => void;
  onClose: () => void;
}) {
  const [hIdx, setHIdx] = useState(() => {
    const h = parseInt(initial.split(':')[0] ?? '9', 10);
    return isNaN(h) ? 9 : h;
  });
  const [mIdx, setMIdx] = useState(() => {
    const m = parseInt(initial.split(':')[1] ?? '0', 10);
    const idx = MINUTES.indexOf(m.toString().padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  });

  function confirm() {
    onConfirm(`${HOURS[hIdx]}:${MINUTES[mIdx]}`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={picker.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={picker.sheet}>
        <View style={picker.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={picker.cancel}>Avbryt</Text>
          </TouchableOpacity>
          <Text style={picker.title}>Välj tid</Text>
          <TouchableOpacity onPress={confirm}>
            <Text style={picker.done}>Klar</Text>
          </TouchableOpacity>
        </View>

        <View style={picker.wheels}>
          <WheelPicker items={HOURS}   selectedIndex={hIdx} onSelect={setHIdx} />
          <Text style={picker.colon}>:</Text>
          <WheelPicker items={MINUTES} selectedIndex={mIdx} onSelect={setMIdx} />
        </View>
      </View>
    </Modal>
  );
}

const picker = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,63,65,0.3)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 32,
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: 0.5,
    borderColor:       'rgba(14,92,91,0.12)',
  },
  title:  { fontFamily: 'Poppins_600', fontSize: 14, color: colors.textDark },
  cancel: { fontFamily: 'Poppins_400', fontSize: 14, color: colors.textMuted },
  done:   { fontFamily: 'Poppins_500', fontSize: 14, color: colors.forestDark },
  wheels: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.xl,
    paddingVertical: spacing.xl,
  },
  colon: { fontFamily: 'Poppins_600', fontSize: 28, color: colors.textDark },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DISPLAY_MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatDateDisplay(str: string): string {
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return str;
  return `${d} ${DISPLAY_MONTHS[m - 1]} ${y}`;
}

function isSqmField(field: CustomField) {
  return (
    field.type === 'number' &&
    (field.name.toLowerCase().includes('kvadrat') ||
     field.label.toLowerCase().includes('kvadrat') ||
     field.placeholder?.toLowerCase().includes('m²') ||
     field.placeholder?.toLowerCase().includes('m2'))
  );
}

// ─── BookScreen ───────────────────────────────────────────────────────────────

export default function BookScreen({ navigation, route }: Props) {
  const { service } = route.params;

  const today = new Date();
  const DATE_PLACEHOLDER = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-dd`;

  const [address, setAddress]             = useState('');
  const [postalCode, setPostalCode]       = useState('');
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [date, setDate]                   = useState('');
  const [time, setTime]                   = useState('');
  const [notes, setNotes]                 = useState('');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [sqmValues, setSqmValues]         = useState<Record<string, number>>({});
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);

  function setCustomField(name: string, value: string) {
    setCustomFieldValues((prev) => ({ ...prev, [name]: value }));
  }

  function setSqmField(name: string, value: number) {
    setSqmValues((prev) => ({ ...prev, [name]: value }));
    setCustomFieldValues((prev) => ({ ...prev, [name]: String(value) }));
  }

  function openSelectSheet(field: CustomField) {
    const options = field.options ?? [];
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Avbryt', ...options], cancelButtonIndex: 0, title: field.label },
      (index) => { if (index > 0) setCustomField(field.name, options[index - 1]); }
    );
  }

  function handleNext() {
    if (!addressConfirmed) {
      Alert.alert('Välj en adress', 'Välj en adress från förslagen för att fortsätta.');
      return;
    }
    if (!date.trim() || !time.trim()) {
      Alert.alert('Fyll i alla fält', 'Datum och tid krävs.');
      return;
    }
    if (service.customFields) {
      for (const field of service.customFields) {
        if (field.required && !customFieldValues[field.name]?.trim()) {
          Alert.alert('Saknad information', `${field.label} är obligatorisk.`);
          return;
        }
      }
    }
    navigation.navigate('Payment', { service, address, postalCode, date, time, notes, customFields: customFieldValues });
  }

  return (
    <View style={styles.container}>
      <TopBar title="Boka tjänst" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Service summary */}
        <View style={styles.summary}>
          <View style={styles.summaryIconWrap}>
            <Text style={styles.summaryIconText}>{service.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.h3}>{service.name}</Text>
            <Text style={[typography.small, { marginTop: 4 }]}>{formatPrice(service.price_ore)}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Gatuadress</Text>
        <AddressAutocomplete
          value={address}
          onChange={setAddress}
          onSelect={(addr, postal) => {
            setAddress(addr);
            setPostalCode(postal);
          }}
          onConfirmChange={setAddressConfirmed}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Dropoff Date</Text>
        <TouchableOpacity
          style={[styles.input, styles.pickerBtn]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
            {date ? formatDateDisplay(date) : DATE_PLACEHOLDER}
          </Text>
        </TouchableOpacity>

        {/* Tid — scroll wheel picker */}
        <Text style={styles.fieldLabel}>Dropoff Time</Text>
        <TouchableOpacity
          style={[styles.input, styles.timeBtn]}
          onPress={() => setShowTimePicker(true)}
          activeOpacity={0.7}
        >
          <Text style={time ? styles.timeValue : styles.timePlaceholder}>
            {time || 't.ex. 14:00'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Beskrivning (valfritt)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Beskriv vad som behöver göras…"
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        {service.customFields?.map((field: CustomField) => (
          <View key={field.name}>
            <Text style={styles.fieldLabel}>
              {field.label}{field.required ? ' *' : ''}
            </Text>

            {isSqmField(field) ? (
              <View style={styles.sliderWrap}>
                <SquareMeterSlider
                  value={sqmValues[field.name] ?? 5}
                  onChange={(v) => setSqmField(field.name, v)}
                />
              </View>
            ) : field.type === 'select' ? (
              <View style={styles.selectBtn}>
                <Text
                  onPress={() => openSelectSheet(field)}
                  style={customFieldValues[field.name] ? styles.selectText : styles.selectPlaceholder}
                >
                  {customFieldValues[field.name] || field.placeholder || 'Välj…'}
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
                value={customFieldValues[field.name] || ''}
                onChangeText={(value) => setCustomField(field.name, value)}
                keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
              />
            )}
          </View>
        ))}

        <EcoBadge />
        <CTAButton label="Gå till betalning" onPress={handleNext} />
      </ScrollView>

      <TimePickerModal
        visible={showTimePicker}
        initial={time || '09:00'}
        onConfirm={setTime}
        onClose={() => setShowTimePicker(false)}
      />

      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onConfirm={setDate}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  summary: {
    backgroundColor: colors.linen,
    borderRadius:    radius.lg,
    padding:         spacing.lg,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    marginBottom:    spacing.lg,
  },
  summaryIconWrap: {
    width:           44,
    height:          44,
    borderRadius:    radius.md,
    backgroundColor: colors.moss,
    alignItems:      'center',
    justifyContent:  'center',
  },
  summaryIconText: { fontSize: 22 },

  fieldLabel: [typography.label, { marginTop: spacing.md, marginBottom: spacing.sm }] as any,

  input: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   13,
    fontFamily:        'Poppins_400',
    fontSize:          15,
    color:             colors.textDark,
  },
  textArea: { height: 100, textAlignVertical: 'top', marginBottom: spacing.md },

  timeBtn:          { justifyContent: 'center' },
  timeValue:        { fontFamily: 'Poppins_400', fontSize: 15, color: colors.textDark },
  timePlaceholder:  { fontFamily: 'Poppins_400', fontSize: 15, color: colors.textMuted },

  pickerBtn:        { justifyContent: 'center' },
  pickerValue:      { fontFamily: 'Poppins_400', fontSize: 15, color: colors.textDark },
  pickerPlaceholder:{ fontFamily: 'Poppins_400', fontSize: 15, color: colors.textMuted },

  sliderWrap: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    marginBottom:      spacing.sm,
  },

  selectBtn: {
    backgroundColor:   colors.linen,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   13,
    marginBottom:      spacing.md,
  },
  selectText:        { fontFamily: 'Poppins_400', fontSize: 15, color: colors.textDark },
  selectPlaceholder: { fontFamily: 'Poppins_400', fontSize: 15, color: colors.textMuted },
});
