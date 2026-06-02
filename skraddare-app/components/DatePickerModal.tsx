import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  visible:   boolean;
  value:     string; // 'YYYY-MM-DD' or ''
  onConfirm: (dateStr: string) => void;
  onClose:   () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

const MONTH_NAMES = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(str: string): Date | null {
  if (!str || str.length < 10) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

/** Build a 6-row grid for the month (Mon-first). Null = empty padding cell. */
function buildGrid(year: number, month: number): (number | null)[][] {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DatePickerModal({ visible, value, onConfirm, onClose }: Props) {
  const today = startOfDay(new Date());

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<Date | null>(null);

  // Reset internal state each time the modal opens
  useEffect(() => {
    if (!visible) return;
    const parsed = parseDate(value);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
      setSelected(parsed);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setSelected(null);
    }
  }, [visible]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const isCurrentMonth =
    viewYear  === today.getFullYear() &&
    viewMonth === today.getMonth();

  function goBack() {
    if (isCurrentMonth) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else                 { setViewMonth(m => m - 1); }
  }

  function goForward() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else                  { setViewMonth(m => m + 1); }
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  function confirm() {
    if (selected) onConfirm(toDateStr(selected));
    onClose();
  }

  // ── Grid ───────────────────────────────────────────────────────────────────

  const rows = buildGrid(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={s.sheet}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={s.cancel}>Avbryt</Text>
          </TouchableOpacity>
          <Text style={s.title}>Välj datum</Text>
          <TouchableOpacity onPress={confirm} hitSlop={12}>
            <Text style={[s.done, !selected && s.doneDisabled]}>Klar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Month navigation ───────────────────────────────────────── */}
        <View style={s.monthNav}>
          <TouchableOpacity
            style={[s.navBtn, isCurrentMonth && s.navBtnDisabled]}
            onPress={goBack}
            activeOpacity={isCurrentMonth ? 1 : 0.6}
            disabled={isCurrentMonth}
          >
            <IconChevronLeft size={18} color={isCurrentMonth ? colors.textMuted : colors.forestMid} />
          </TouchableOpacity>

          <Text style={s.monthLabel}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>

          <TouchableOpacity style={s.navBtn} onPress={goForward} activeOpacity={0.6}>
            <IconChevronRight size={18} color={colors.forestMid} />
          </TouchableOpacity>
        </View>

        {/* ── Day-of-week headers ────────────────────────────────────── */}
        <View style={s.dayRow}>
          {DAY_LABELS.map(d => (
            <Text key={d} style={s.dayLabel}>{d}</Text>
          ))}
        </View>

        {/* ── Calendar grid ──────────────────────────────────────────── */}
        <View style={s.grid}>
          {rows.map((row, ri) => (
            <View key={ri} style={s.gridRow}>
              {row.map((day, ci) => {
                if (!day) return <View key={ci} style={s.cell} />;

                const cellDate = new Date(viewYear, viewMonth, day);
                const isPast   = cellDate < today;
                const isToday  = sameDay(cellDate, today);
                const isSel    = !!selected && sameDay(cellDate, selected);

                return (
                  <TouchableOpacity
                    key={ci}
                    style={s.cell}
                    onPress={() => !isPast && setSelected(cellDate)}
                    activeOpacity={isPast ? 1 : 0.65}
                    disabled={isPast}
                  >
                    <View style={[
                      s.dayCircle,
                      isToday && !isSel && s.dayCircleToday,
                      isSel             && s.dayCircleSel,
                    ]}>
                      <Text style={[
                        s.dayNum,
                        isPast  && s.dayNumPast,
                        isToday && !isSel && s.dayNumToday,
                        isSel            && s.dayNumSel,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Bottom padding ─────────────────────────────────────────── */}
        <View style={{ height: 28 }} />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(30,46,36,0.32)',
  },

  sheet: {
    backgroundColor:      colors.white,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
  },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderBottomWidth: 0.5,
    borderColor:       'rgba(74,124,89,0.12)',
  },
  title:        { fontFamily: 'PlayfairDisplay_500', fontSize: 14, color: colors.textDark },
  cancel:       { fontFamily: 'DMSans_400',          fontSize: 14, color: colors.textMuted },
  done:         { fontFamily: 'DMSans_500',          fontSize: 14, color: colors.forestDark },
  doneDisabled: { opacity: 0.35 },

  // Month navigation
  monthNav: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
  },
  monthLabel: {
    fontFamily: 'PlayfairDisplay_500',
    fontSize:   16,
    color:      colors.textDark,
  },
  navBtn:         { padding: spacing.xs },
  navBtnDisabled: { opacity: 0.3 },

  // Day-of-week row
  dayRow: {
    flexDirection:     'row',
    paddingHorizontal: spacing.md,
    paddingBottom:     spacing.xs,
  },
  dayLabel: {
    flex:          1,
    textAlign:     'center',
    fontFamily:    'DMSans_400',
    fontSize:      11,
    color:         colors.textMuted,
    letterSpacing: 0.4,
  },

  // Grid
  grid:            { paddingHorizontal: spacing.md },
  gridRow:         { flexDirection: 'row', marginBottom: 2 },

  cell: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },

  // Day circle
  dayCircle: {
    width:          36,
    height:         36,
    borderRadius:   radius.circle,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.forestMid,
  },
  dayCircleSel: {
    backgroundColor: colors.forestDark,
  },

  // Day number text
  dayNum:      { fontFamily: 'DMSans_400', fontSize: 14, color: colors.textDark },
  dayNumPast:  { color: colors.textMuted, opacity: 0.45 },
  dayNumToday: { fontFamily: 'DMSans_500', color: colors.forestMid },
  dayNumSel:   { fontFamily: 'DMSans_500', color: colors.moss },
});
