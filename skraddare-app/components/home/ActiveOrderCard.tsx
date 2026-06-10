import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconCheck, IconWash } from '@tabler/icons-react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';
import { type Order, type OrderStatus } from '../../types';

// ─── Step logic ───────────────────────────────────────────────────────────────

type StepState = 'done' | 'active' | 'future';

const STEP_LABELS = ['Bokad', 'Hämtad', 'Rengörs', 'Klar', 'Levererad'];
const CIRCLE = 22;

function statesForStatus(status: OrderStatus): StepState[] {
  switch (status) {
    case 'paid':             return ['active', 'future', 'future', 'future', 'future'];
    case 'collected':        return ['done',   'active', 'future', 'future', 'future'];
    case 'in_progress':      return ['done',   'done',   'active', 'future', 'future'];
    case 'ready_for_pickup': return ['done',   'done',   'done',   'active', 'future'];
    case 'completed':        return ['done',   'done',   'done',   'done',   'active'];
    default:                 return ['active', 'future', 'future', 'future', 'future'];
  }
}

const BADGE_LABEL: Partial<Record<OrderStatus, string>> = {
  paid:             'Väntar på hämtning',
  collected:        'Hos skräddaren',
  in_progress:      'Hos skräddaren',
  ready_for_pickup: 'Redo för leverans',
  completed:        'Levererad',
};

// ─── StepCircle ───────────────────────────────────────────────────────────────

function StepCircle({ state, number }: { state: StepState; number: number }) {
  const inner = (
    <View style={[
      styles.circle,
      state === 'done'   && styles.circleDone,
      state === 'active' && styles.circleActive,
      state === 'future' && styles.circleFuture,
    ]}>
      {state === 'done' ? (
        <IconCheck size={11} color={colors.white} strokeWidth={2.5} />
      ) : (
        <Text style={[
          styles.stepNum,
          state === 'active' && { color: colors.forestDark },
          state === 'future' && { color: 'rgba(14,92,91,0.35)' },
        ]}>
          {number}
        </Text>
      )}
    </View>
  );

  // Glow ring around the active node
  if (state === 'active') {
    return <View style={styles.activeRing}>{inner}</View>;
  }

  return inner;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActiveOrderCard({ order }: { order: Order }) {
  const states = statesForStatus(order.status);
  const badgeText = BADGE_LABEL[order.status] ?? 'Pågår';

  return (
    <View style={styles.card}>

      <Text style={styles.sectionLabel}>PÅGÅENDE RENGÖRINGAR</Text>

      {/* Order row */}
      <View style={[styles.orderRow, styles.orderRowBorder]}>
        <View style={styles.orderIcon}>
          <IconWash size={16} color={colors.forestMid} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderName}>{order.serviceName}</Text>
          <Text style={[typography.micro, { marginTop: 2 }]}>
            #{order.id.slice(-7).toUpperCase()}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>

      {/* Progress stepper */}
      <View style={styles.stepper}>

        {/* Row 1: circles connected by lines */}
        <View style={styles.nodesRow}>
          {STEP_LABELS.map((_, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <View style={[
                  styles.connector,
                  states[i - 1] === 'done' ? styles.connectorDone : styles.connectorFuture,
                ]} />
              )}
              <View style={styles.nodeWrap}>
                <StepCircle state={states[i]} number={i + 1} />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Row 2: labels aligned under each circle */}
        <View style={styles.labelsRow}>
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <View style={styles.labelGap} />}
              <Text
                style={[
                  styles.stepLabel,
                  states[i] === 'done'   && styles.labelDone,
                  states[i] === 'active' && styles.labelActive,
                  states[i] === 'future' && styles.labelFuture,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </React.Fragment>
          ))}
        </View>

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CONNECTOR_FLEX = 0.8;

const styles = StyleSheet.create({
  // White card with the brand's 3px gold border (mirrors website .active-order-card)
  card: {
    backgroundColor: colors.white,
    borderRadius:    radius.lg,
    borderWidth:     3,
    borderColor:     colors.earth,
    padding:         spacing.lg,
  },

  sectionLabel: {
    ...typography.micro,
    color:         colors.earth,
    opacity:       0.85,
    marginBottom:  spacing.md,
    letterSpacing: 1.2,
  } as any,

  // ─ Order row ─
  orderRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    paddingBottom: spacing.md,
  },
  orderRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,175,55,0.25)',
    marginBottom:      spacing.md,
  },
  orderIcon: {
    width:          36,
    height:         36,
    borderRadius:   radius.circle,
    borderWidth:    0.5,
    borderColor:    'rgba(14,92,91,0.2)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  orderName: {
    fontFamily: 'Inter_500',
    fontSize:   13,
    color:      colors.textDark,
  },

  // ─ Status badge ─
  badge: {
    backgroundColor:   'rgba(212,175,55,0.15)',
    borderWidth:       1,
    borderColor:       colors.earth,
    borderRadius:      radius.sharp,
    paddingVertical:   4,
    paddingHorizontal: 8,
  },
  badgeText: {
    fontFamily:    'Inter_500',
    fontSize:      9,
    color:         '#9a7b1a',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ─ Stepper ─
  stepper: {
    marginTop: spacing.xs,
  },
  nodesRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  labelsRow: {
    flexDirection: 'row',
    marginTop:     5,
  },

  nodeWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  labelGap: {
    flex: CONNECTOR_FLEX,
  },

  // Active node glow ring: outer padding creates the halo
  activeRing: {
    backgroundColor: 'rgba(14,92,91,0.12)',
    borderRadius:    radius.circle,
    padding:         4,
  },

  circle: {
    width:          CIRCLE,
    height:         CIRCLE,
    borderRadius:   radius.circle,
    alignItems:     'center',
    justifyContent: 'center',
  },
  // done → teal (filled), with a white check
  circleDone:   { backgroundColor: colors.forestMid },
  // active → pale teal, most prominent, with a dark teal number
  circleActive: { backgroundColor: colors.moss },
  // future → faint teal on the white card
  circleFuture: { backgroundColor: 'rgba(14,92,91,0.12)' },

  stepNum: {
    fontFamily: 'Inter_500',
    fontSize:   10,
  },
  stepLabel: {
    flex:       1,
    textAlign:  'center',
    fontFamily: 'Inter_400',
    fontSize:   9,
  } as any,
  labelDone:   { color: colors.forestMid },
  labelActive: { color: colors.forestDark, fontFamily: 'Inter_500' },
  labelFuture: { color: 'rgba(14,92,91,0.4)' },

  // Connector line
  connector: {
    flex:   CONNECTOR_FLEX,
    height: 2,
  },
  connectorDone:   { backgroundColor: colors.forestMid },
  connectorFuture: { backgroundColor: 'rgba(14,92,91,0.15)' },
});
