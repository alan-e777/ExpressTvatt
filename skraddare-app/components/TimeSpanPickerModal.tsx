import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

// Pickup/delivery time spans — identical to the website TimePicker
// (components/TimePicker.tsx). The span string ('08-12' …) is what gets stored
// on the order, so the admin calendar/driver views read the same values.
export const TIME_SPANS = ['08-12', '12-16', '16-20'] as const;
export type TimeSpan = typeof TIME_SPANS[number];

export const SPAN_LABEL: Record<TimeSpan, string> = {
  '08-12': '08:00–12:00',
  '12-16': '12:00–16:00',
  '16-20': '16:00–20:00',
};

type Props = {
  visible:          boolean;
  value:            string;
  onConfirm:        (span: string) => void;
  onClose:          () => void;
  disabledOptions?: string[];
};

export default function TimeSpanPickerModal({ visible, value, onConfirm, onClose, disabledOptions = [] }: Props) {
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
          {TIME_SPANS.map(span => {
            const isSel      = span === selected;
            const isDisabled = disabledOptions.includes(span);
            return (
              <TouchableOpacity
                key={span}
                style={[s.slot, isSel && s.slotSel]}
                onPress={() => !isDisabled && setSelected(span)}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Text style={[s.slotText, isDisabled && s.slotTextDisabled, isSel && s.slotTextSel]}>{SPAN_LABEL[span]}</Text>
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
});
