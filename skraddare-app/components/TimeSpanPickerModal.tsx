import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { formatSpan, slotToSpan, type TimeSlot } from '../lib/timeslots';

// Pickup/delivery time windows — identical to the website TimePicker
// (components/TimePicker.tsx). The windows are admin-editable and fetched from
// /api/timeslots by the checkout screen, which passes them in here. The span
// string ('08-12' …) is what gets stored on the order, so the admin
// calendar/driver views read the same values.

type Props = {
  visible:    boolean;
  value:      string;
  /** Windows to offer. Null while they are still loading. */
  slots:      TimeSlot[] | null;
  onConfirm:  (span: string) => void;
  onClose:    () => void;
  /** Grey out windows that close at or before this hour (already passed today). */
  minEndHour?: number;
};

export default function TimeSpanPickerModal({ visible, value, slots, onConfirm, onClose, minEndHour }: Props) {
  const [selected, setSelected] = useState('');

  useEffect(() => { if (visible) setSelected(value || ''); }, [visible]);

  function confirm() {
    if (selected) onConfirm(selected);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={s.sheet}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}><Text style={s.cancel}>Avbryt</Text></TouchableOpacity>
          <Text style={s.title}>Välj tid</Text>
          <TouchableOpacity onPress={confirm} hitSlop={12}><Text style={[s.done, !selected && s.doneDisabled]}>Klar</Text></TouchableOpacity>
        </View>

        <View style={s.list}>
          {slots === null ? (
            <Text style={s.loading}>Laddar tider…</Text>
          ) : slots.map(slot => {
            const span       = slotToSpan(slot);
            const isSel      = span === selected;
            const isDisabled = minEndHour !== undefined && slot.end <= minEndHour;
            return (
              <TouchableOpacity
                key={span}
                style={[s.slot, isSel && s.slotSel]}
                onPress={() => !isDisabled && setSelected(span)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Text style={[s.slotText, isDisabled && s.slotTextDisabled, isSel && s.slotTextSel]}>{formatSpan(span)}</Text>
                {isSel && <IconCheck size={16} color={colors.forestDark} strokeWidth={2.5} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,63,65,0.32)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderColor: 'rgba(14,92,91,0.12)',
  },
  title:        { fontFamily: 'Inter_600', fontSize: 14, color: colors.textDark },
  cancel:       { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted },
  done:         { fontFamily: 'Inter_500', fontSize: 14, color: colors.forestDark },
  doneDisabled: { opacity: 0.35 },
  list: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  slot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: spacing.md, borderRadius: radius.md, marginBottom: 2,
  },
  slotSel:          { backgroundColor: colors.mint },
  slotText:         { fontFamily: 'Inter_400', fontSize: 16, color: colors.textDark },
  slotTextSel:      { fontFamily: 'Inter_600', color: colors.forestDark },
  slotTextDisabled: { color: colors.textMuted, opacity: 0.4 },
  loading: {
    fontFamily: 'Inter_400', fontSize: 15, color: colors.textMuted,
    textAlign: 'center', paddingVertical: 24,
  },
});
