import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconCheck } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';

const STEPS = [
  'Bokning mottagen',
  'Upphämtad',
  'Hos skräddaren',
  'Klar',
  'Levererad',
];

const STATUS_TO_STEP: Record<string, number> = {
  'paid':        1,
  'picked-up':   2,
  'in-progress': 3,
  'ready':       4,
  'done':        5,
};

type Props = {
  status: string;
};

export default function OrderTimeline({ status }: Props) {
  const currentStep = STATUS_TO_STEP[status] ?? 1;

  return (
    <View style={styles.container}>
      {STEPS.map((label, index) => {
        const step = index + 1;
        const isDone   = step < currentStep;
        const isActive = step === currentStep;

        return (
          <View key={step} style={styles.row}>
            <View style={styles.iconCol}>
              {/* connector line above (skip first) */}
              {index > 0 && <View style={styles.line} />}

              <View style={[
                styles.circle,
                isDone   && styles.circleDone,
                isActive && styles.circleActive,
              ]}>
                {isDone ? (
                  <IconCheck size={12} color="#c8e6c9" strokeWidth={2.5} />
                ) : (
                  <Text style={[
                    styles.stepNum,
                    isActive && styles.stepNumActive,
                  ]}>
                    {step}
                  </Text>
                )}
              </View>
            </View>

            <Text style={[
              typography.small,
              styles.stepLabel,
              isDone   && styles.labelDone,
              isActive && styles.labelActive,
            ]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE = 28;

const styles = StyleSheet.create({
  container: { gap: 0 },

  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },

  iconCol: {
    width:       CIRCLE,
    alignItems:  'center',
  },
  line: {
    width:           0.5,
    height:          14,
    backgroundColor: 'rgba(74,124,89,0.18)',
  },

  circle: {
    width:           CIRCLE,
    height:          CIRCLE,
    borderRadius:    radius.pill,
    backgroundColor: colors.linen,
    alignItems:      'center',
    justifyContent:  'center',
  },
  circleDone:   { backgroundColor: colors.forestDark },
  circleActive: { backgroundColor: colors.forestLight },

  stepNum: {
    fontFamily: 'DMSans_400',
    fontSize:   11,
    color:      colors.textMuted,
  },
  stepNumActive: { color: colors.forestDark, fontFamily: 'DMSans_500' },

  stepLabel:     { color: colors.textMuted },
  labelDone:     { color: colors.textMid },
  labelActive:   { color: colors.textDark, fontFamily: 'DMSans_500' },
});
