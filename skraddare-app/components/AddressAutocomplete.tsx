import { IconCheck } from '@tabler/icons-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchPlaceDetails, fetchSuggestions, type Prediction } from '../lib/places';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (address: string, postalCode: string) => void;
  onConfirmChange?: (confirmed: boolean) => void;
  inputStyle?: object;
};

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onConfirmChange,
  inputStyle,
}: Props) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const [confirmed, setConfirmed]     = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || value.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchSuggestions(value);
        setPredictions(results);
        setOpen(results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  async function handleSelect(prediction: Prediction) {
    setOpen(false);
    setPredictions([]);
    skipFetchRef.current = true;

    const { address, postalCode } = await fetchPlaceDetails(prediction.place_id);
    const resolved = address || prediction.structured_formatting.main_text;

    onChange(resolved);
    onSelect(resolved, postalCode);
    setConfirmed(true);
    onConfirmChange?.(true);
  }

  function handleChangeText(text: string) {
    if (confirmed) {
      setConfirmed(false);
      onConfirmChange?.(false);
    }
    setOpen(true);
    onChange(text);
  }

  return (
    <View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, confirmed && styles.inputConfirmed, inputStyle]}
          placeholder="t.ex. Storgatan 12"
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChangeText}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <View style={styles.iconSlot} pointerEvents="none">
          {loading ? (
            <ActivityIndicator size="small" color={colors.forestMid} />
          ) : confirmed ? (
            <IconCheck size={16} color={colors.forestMid} />
          ) : null}
        </View>
      </View>

      {open && predictions.length > 0 && (
        <View style={styles.dropdown}>
          {predictions.map((p, i) => (
            <TouchableOpacity
              key={p.place_id}
              style={[styles.row, i < predictions.length - 1 && styles.rowBorder]}
              onPress={() => handleSelect(p)}
              activeOpacity={0.7}
            >
              <Text style={styles.main} numberOfLines={1}>
                {p.structured_formatting.main_text}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {p.structured_formatting.secondary_text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex:              1,
    backgroundColor:   colors.linen,
    borderRadius:      radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical:   13,
    paddingRight:      40,
    fontFamily:        'Poppins_400',
    fontSize:          15,
    color:             colors.textDark,
    borderWidth:       0.5,
    borderColor:       'transparent',
  },
  inputConfirmed: {
    borderColor: colors.forestMid,
  },
  iconSlot: {
    position: 'absolute',
    right:    spacing.md,
  },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius:    radius.md,
    borderWidth:     0.5,
    borderColor:     'rgba(14,92,91,0.18)',
    marginTop:       spacing.xs,
    overflow:        'hidden',
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(14,92,91,0.1)',
  },
  main: {
    fontFamily: 'Poppins_400',
    fontSize:   14,
    color:      colors.textDark,
  },
  sub: {
    fontFamily: 'Poppins_400',
    fontSize:   12,
    color:      colors.textMuted,
    marginTop:  2,
  },
});
