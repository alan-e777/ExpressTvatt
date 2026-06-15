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
import { useCart } from '../lib/cart';
import { RUT_DISCOUNT_PERCENT } from '../lib/rut';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';
import ScreenBackground from '../components/ScreenBackground';
import Confetti from '../components/Confetti';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'CartPayment'>;
  route:      RouteProp<HomeStackParamList, 'CartPayment'>;
};

export default function CartPaymentScreen({ navigation, route }: Props) {
  const {
    address, postalCode, date, time, deliveryDate, deliveryTime, notes,
    name, email, phone, rutAvdrag, personnummer,
    subtotalKr, savingsKr, rutDiscountKr, deliveryFeeKr, grandTotalKr, isFirstTime,
  } = route.params;
  const cart = useCart();
  const { confirmPayment } = useStripe();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId,      setOrderId]      = useState<string | null>(null);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [cardReady,    setCardReady]    = useState(false);
  const [status,       setStatus]       = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    const user = auth.currentUser;
    const customerId = user?.uid ?? undefined;
    const items = cart.lines.map(l => ({ id: l.id, name: l.name, price: l.price, qty: l.qty, type: l.type }));
    (user ? user.getIdToken() : Promise.resolve<string | null>(null))
      .then(idToken => fetch(`${API_URL}/api/create-cart-payment`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          items, customerId,
          name, email, phone,
          address, postalCode,
          date, time, deliveryDate, deliveryTime, notes,
          rutAvdrag, personnummer: rutAvdrag ? personnummer : '',
          platform: 'mobile',
        }),
      }))
      .then(r => r.json())
      .then(data => {
        if (data.clientSecret) { setClientSecret(data.clientSecret); setOrderId(data.orderId ?? null); }
        else setLoadError(data.error ?? 'Kunde inte starta betalning.');
      })
      .catch(() => setLoadError('Nätverksfel — kontrollera anslutningen.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePay() {
    if (!clientSecret) return;
    setStatus('processing');
    const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });
    if (error) {
      Alert.alert('Betalning misslyckades', error.message);
      setStatus('idle');
    } else {
      cart.clear();
      setStatus('success');
    }
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (status === 'success') {
    const orderNo = orderId ? `#${orderId.slice(-7).toUpperCase()}` : '—';
    return (
      <View style={styles.container}>
        <ScreenBackground />
        <TopBar title="Bekräftelse" />
        <View style={styles.successWrap}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
            <Text style={styles.successTitle}>Din beställning är mottagen</Text>
            <Text style={styles.successText}>
              Vi har tagit hand om din order och bekräftat din upphämtning.
            </Text>
            <View style={styles.orderPill}>
              <Text style={styles.orderPillLabel}>Viktigt! Spara detta</Text>
              <Text style={styles.orderPillValue}>{orderNo}</Text>
            </View>
            <Text style={styles.successSteps}>
              Du får uppdateringar i varje steg:{'\n'}upphämtning → tvätt → leverans.
            </Text>
            <CTAButton label="Tillbaka till startsidan" onPress={() => navigation.popToTop()} large style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
        <Confetti />
      </View>
    );
  }

  // ── Payment form ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScreenBackground />
      <TopBar title="Betala" onBack={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order summary */}
        <View style={styles.summary}>
          <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Din bokning</Text>

          {cart.lines.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={typography.small}>{item.qty}× {item.name}</Text>
              <Text style={typography.small}>{item.price * item.qty} kr</Text>
            </View>
          ))}

          <View style={styles.divider} />
          {savingsKr > 0 && (
            <>
              <View style={styles.row}>
                <Text style={typography.small}>Delsumma</Text>
                <Text style={typography.small}>{subtotalKr} kr</Text>
              </View>
              <View style={styles.row}>
                <Text style={[typography.small, { color: colors.forestMid }]}>Rabatt{isFirstTime ? ' (förstagång)' : ''}</Text>
                <Text style={[typography.small, { color: colors.forestMid }]}>−{savingsKr} kr</Text>
              </View>
            </>
          )}
          {rutDiscountKr > 0 && (
            <View style={styles.row}>
              <Text style={[typography.small, { color: colors.forestMid }]}>RUT-avdrag −{RUT_DISCOUNT_PERCENT}%</Text>
              <Text style={[typography.small, { color: colors.forestMid }]}>−{rutDiscountKr} kr</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={typography.small}>Leverans</Text>
            <Text style={typography.small}>{deliveryFeeKr > 0 ? `${deliveryFeeKr} kr` : 'Gratis'}</Text>
          </View>

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={typography.small}>Adress</Text>
            <Text style={[typography.small, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>{address}{postalCode ? `, ${postalCode}` : ''}</Text>
          </View>
          <View style={styles.row}>
            <Text style={typography.small}>Upphämtning</Text>
            <Text style={typography.small}>{date} · {spanLabel(time)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={typography.small}>Avlämning</Text>
            <Text style={typography.small}>{deliveryDate} · {spanLabel(deliveryTime)}</Text>
          </View>

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={typography.bodyBold}>Totalt</Text>
            <Text style={styles.totalValue}>{grandTotalKr} kr</Text>
          </View>
        </View>

        {/* Card input */}
        <Text style={[typography.label, { marginBottom: spacing.md, color: colors.moss }]}>Kortuppgifter</Text>

        {loadError ? (
          <Text style={[typography.small, { color: '#e88', marginBottom: spacing.lg }]}>{loadError}</Text>
        ) : !clientSecret ? (
          <ActivityIndicator color={colors.forestMid} style={{ marginBottom: spacing.xl }} />
        ) : (
          <CardField
            postalCodeEnabled={false}
            style={styles.cardField}
            cardStyle={{
              backgroundColor: colors.white, borderWidth: 0.5, borderColor: 'rgba(14,92,91,0.25)',
              borderRadius: radius.sm, textColor: colors.textDark,
            }}
            onCardChange={details => setCardReady(details.complete)}
          />
        )}

        <CTAButton
          label={`Betala ${grandTotalKr} kr`}
          onPress={handlePay}
          icon={<IconLock size={14} color="#FFFFFF" strokeWidth={1.5} />}
          disabled={!cardReady || !clientSecret}
          loading={status === 'processing'}
        />

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

// '08-12' → '08:00–12:00' for the summary; pass through anything unexpected.
function spanLabel(span: string): string {
  const map: Record<string, string> = { '08-12': '08:00–12:00', '12-16': '12:00–16:00', '16-20': '16:00–20:00' };
  return map[span] ?? span;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content:   { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  summary: { backgroundColor: colors.linen, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  divider: { height: 0.5, backgroundColor: 'rgba(14,92,91,0.18)', marginVertical: spacing.md },
  totalValue: { fontFamily: 'Inter_700', fontSize: 18, color: colors.textDark },

  cardField: { height: 50, marginBottom: spacing.lg },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },

  // Success — a white card floating on the gradient canvas (mirrors the website's
  // success-box; dark text on white for the premium, contained feel).
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  successCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl,
    alignItems: 'center', width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  successCheck: { fontFamily: 'Inter_600', fontSize: 28, color: colors.forestDark },
  successTitle: { fontFamily: 'Inter_700', fontSize: 20, color: colors.textDark, textAlign: 'center', marginBottom: spacing.sm },
  successText: { fontFamily: 'Inter_400', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: spacing.lg, maxWidth: 280 },
  orderPill: {
    backgroundColor: colors.mint, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(74,124,89,0.25)',
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl, alignItems: 'center', alignSelf: 'stretch',
  },
  orderPillLabel: { fontFamily: 'Inter_500', fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' } as any,
  orderPillValue: { fontFamily: 'Inter_700', fontSize: 22, color: colors.forestDark, marginTop: 2, letterSpacing: 1 },
  successSteps: { fontFamily: 'Inter_400', fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginTop: spacing.lg, marginBottom: spacing.xl },
});
