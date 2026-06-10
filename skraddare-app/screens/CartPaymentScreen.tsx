import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { IconLock, IconShieldCheck } from '@tabler/icons-react-native';
import { HomeStackParamList } from '../navigation/RootNavigator';
import { auth } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'CartPayment'>;
  route:      RouteProp<HomeStackParamList, 'CartPayment'>;
};

export default function CartPaymentScreen({ navigation, route }: Props) {
  const { items, total, address, postalCode, date, time, notes } = route.params;
  const { confirmPayment } = useStripe();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [cardReady,    setCardReady]    = useState(false);
  const [status,       setStatus]       = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    const customerId = auth.currentUser?.uid ?? undefined;
    fetch(`${API_URL}/api/create-cart-payment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ items, customerId, address, postalCode, date, time, notes }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setLoadError(data.error ?? 'Kunde inte starta betalning.');
      })
      .catch(() => setLoadError('Nätverksfel — kontrollera anslutningen.'));
  }, []);

  async function handlePay() {
    if (!clientSecret) return;
    setStatus('processing');
    const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });
    if (error) {
      Alert.alert('Betalning misslyckades', error.message);
      setStatus('idle');
    } else {
      setStatus('success');
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <View style={styles.container}>
        <TopBar title="Bekräftelse" />
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={[typography.h1, { textAlign: 'center', marginBottom: spacing.md, color: colors.white }]}>
            Betalning mottagen!
          </Text>
          <Text style={[typography.body, { textAlign: 'center', color: colors.moss, marginBottom: spacing.xxl }]}>
            Tack för din bokning.{'\n'}Vi hör av oss innan upphämtning.
          </Text>
          <CTAButton label="Tillbaka till startsidan" onPress={() => navigation.popToTop()} />
        </View>
      </View>
    );
  }

  // ── Payment form ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <TopBar title="Betala" onBack={() => navigation.goBack()} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <View style={styles.summary}>
          <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Ordersammanfattning</Text>

          {items.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={typography.small}>
                {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
              </Text>
              <Text style={typography.small}>{item.price * item.qty} kr</Text>
            </View>
          ))}

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={typography.small}>Hämtning & leverans</Text>
            <Text style={typography.small}>Ingår</Text>
          </View>
          <View style={styles.row}>
            <Text style={typography.small}>Adress</Text>
            <Text style={typography.small}>{address}, {postalCode}</Text>
          </View>
          <View style={styles.row}>
            <Text style={typography.small}>Datum & tid</Text>
            <Text style={typography.small}>{date} kl. {time}</Text>
          </View>

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[typography.bodyBold]}>Totalt</Text>
            <Text style={styles.totalValue}>{total} kr</Text>
          </View>
        </View>

        {/* Card input */}
        <Text style={[typography.label, { marginBottom: spacing.md, color: colors.moss }]}>Kortuppgifter</Text>

        {loadError ? (
          <Text style={[typography.small, { color: '#c0392b', marginBottom: spacing.lg }]}>
            {loadError}
          </Text>
        ) : !clientSecret ? (
          <ActivityIndicator color={colors.forestMid} style={{ marginBottom: spacing.xl }} />
        ) : (
          <CardField
            postalCodeEnabled={false}
            style={styles.cardField}
            cardStyle={{
              backgroundColor: colors.white,
              borderWidth:     0.5,
              borderColor:     'rgba(14,92,91,0.25)',
              borderRadius:    radius.sm,
              textColor:       colors.textDark,
            }}
            onCardChange={details => setCardReady(details.complete)}
          />
        )}

        <CTAButton
          label={`Betala ${total} kr`}
          onPress={handlePay}
          icon={<IconLock size={14} color="#FFFFFF" strokeWidth={1.5} />}
          disabled={!cardReady || !clientSecret}
          loading={status === 'processing'}
        />

        {/* Trust signals */}
        <View style={styles.trustRow}>
          <IconShieldCheck size={13} color={colors.moss} strokeWidth={1.5} />
          <Text style={[typography.micro, { marginLeft: spacing.xs, color: colors.moss }]}>256-bit SSL</Text>
          <Text style={[typography.micro, { marginHorizontal: spacing.sm, color: colors.moss }]}>·</Text>
          <Text style={[typography.micro, { color: colors.moss }]}>Säkrad via </Text>
          <Text style={[typography.micro, { color: '#B7DCD7' }]}>stripe</Text>
        </View>

        <Text style={[typography.micro, { textAlign: 'center', marginTop: spacing.lg, color: colors.moss }]}>
          Testkort: 4242 4242 4242 4242 · valfri exp/cvv
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  summary: {
    backgroundColor: colors.linen,
    borderRadius:    radius.md,
    padding:         spacing.lg,
    marginBottom:    spacing.lg,
  },
  row: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginBottom:   spacing.sm,
  },
  divider: {
    height:          0.5,
    backgroundColor: 'rgba(14,92,91,0.18)',
    marginVertical:  spacing.md,
  },
  totalValue: {
    fontFamily: 'Inter_600',
    fontSize:   18,
    color:      colors.textDark,
  },

  cardField: { height: 50, marginBottom: spacing.lg },

  trustRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.lg,
  },

  // ─ Success ─
  successContent: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        spacing.xxl,
  },
  successIcon: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: colors.moss,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.xl,
  },
  successCheck: {
    fontFamily: 'Inter_600',
    fontSize:   28,
    color:      colors.forestDark,
  },
});
