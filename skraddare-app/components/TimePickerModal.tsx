import React, { useEffect, useState } from 'react';
import {
  Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView,
} from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  visible:   boolean;
  value:     string; // 'HH:MM' or ''
  onConfirm: (time: string) => void;
  onClose:   () => void;
  minTime?:  string; // earliest selectable slot, 'HH:MM' (default 16:00)
};

// ─── Slots ────────────────────────────────────────────────────────────────────

// Bookable window 16:00–22:00 in 30-min slots (matches the website TimePicker).
const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 16; h <= 22; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 22) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimePickerModal({ visible, value, onConfirm, onClose, minTime }: Props) {
  const [selected, setSelected] = useState<string>('');

  const minM = minTime ? toMinutes(minTime) : 0;

  useEffect(() => {
    if (visible) setSelected(value || '');
  }, [visible]);

  function confirm() {
    if (selected) onConfirm(selected);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={s.sheet}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={s.cancel}>Avbryt</Text>
          </TouchableOpacity>
          <Text style={s.title}>Välj tid</Text>
          <TouchableOpacity onPress={confirm} hitSlop={12}>
            <Text style={[s.done, !selected && s.doneDisabled]}>Klar</Text>
          </TouchableOpacity>
        </View>

        {/* Slot list */}
        <ScrollView style={s.list} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
          {SLOTS.map(slot => {
            const isSel      = slot === selected;
            const isDisabled = toMinutes(slot) < minM;
            return (
              <TouchableOpacity
                key={slot}
                style={[s.slot, isSel && s.slotSel]}
                onPress={() => !isDisabled && setSelected(slot)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Text style={[s.slotText, isDisabled && s.slotTextDisabled, isSel && s.slotTextSel]}>{slot}</Text>
                {isSel && <IconCheck size={16} color={colors.forestDark} strokeWidth={2.5} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ height: 28 }} />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,63,65,0.32)' },

  sheet: {
    backgroundColor:      colors.white,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight:            '70%',
  },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: 0.5,
    borderColor:       'rgba(14,92,91,0.12)',
  },
  title:        { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  cancel:       { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted },
  done:         { fontFamily: 'Inter_500', fontSize: 14, color: colors.forestDark },
  doneDisabled: { opacity: 0.35 },

  list:        { paddingHorizontal: spacing.md },
  listContent: { paddingVertical: spacing.sm },

  slot: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingVertical:   14,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.md,
    marginBottom:      2,
  },
  slotSel:          { backgroundColor: colors.mint },
  slotText:         { fontFamily: 'Inter_400', fontSize: 16, color: colors.textDark },
  slotTextSel:      { fontFamily: 'Inter_600', color: colors.forestDark },
  slotTextDisabled: { color: colors.textMuted, opacity: 0.4 },
});
