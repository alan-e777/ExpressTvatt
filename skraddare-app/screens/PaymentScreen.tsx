import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { IconLock, IconShieldCheck } from '@tabler/icons-react-native';
import { ProductsStackParamList } from '../navigation/RootNavigator';
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function createPaymentIntentFull(params: {
  serviceId: string;
  customerId?: string;
  address: string;
  postalCode: string;
  date: string;
  time: string;
  notes: string;
  customFields: Record<string, string>;
}): Promise<string> {
  const res = await fetch(`${API_URL}/api/create-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Kunde inte starta betalning.');
  }
  const data = await res.json();
  return data.clientSecret as string;
}
import { formatPrice } from '../types';
import { auth } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';

type Props = {
  navigation: NativeStackNavigationProp<ProductsStackParamList, 'Payment'>;
  route: RouteProp<ProductsStackParamList, 'Payment'>;
};

export default function PaymentScreen({ navigation, route }: Props) {
  const { service, address, postalCode, date, time, notes, customFields } = route.params;
  const { confirmPayment } = useStripe();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [cardReady, setCardReady]       = useState(false);
  const [status, setStatus]             = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    const customerId = auth.currentUser?.uid || undefined;
    createPaymentIntentFull({ serviceId: service.id, customerId, address, postalCode, date, time, notes, customFields })
      .then(setClientSecret)
      .catch((e: Error) => setLoadError(e.message));
  }, [service.id]);

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

  if (status === 'success') {
    return (
      <View style={styles.container}>
        <TopBar title="Bekräftelse" />
        <View style={styles.successContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={[typography.h1, { textAlign: 'center', marginBottom: spacing.md }]}>
            Betalning mottagen!
          </Text>
          <Text style={[typography.body, { textAlign: 'center', marginBottom: spacing.xxl }]}>
            Tack för din bokning av {service.name}.{'\n'}Skräddaren hör av sig inom kort.
          </Text>
          <CTAButton label="Tillbaka till startsidan" onPress={() => navigation.popToTop()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Betala" onBack={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order summary */}
        <View style={styles.summary}>
          <Text style={[typography.bodyBold, { marginBottom: spacing.md }]}>Ordersammanfattning</Text>
          <Row label="Tjänst" value={service.name} />
          <Row label="Adress" value={`${address}, ${postalCode}`} />
          <Row label="Datum & tid" value={`${date} kl. ${time}`} />
          {notes.trim() ? <Row label="Notering" value={notes} /> : null}
          <View style={styles.divider} />
          <Row label="Totalt" value={formatPrice(service.price_ore)} bold />
        </View>

        <Text style={[typography.label, { marginBottom: spacing.md }]}>Kortuppgifter</Text>

        {loadError ? (
          <Text style={[typography.small, { color: '#c0392b', marginBottom: spacing.lg }]}>{loadError}</Text>
        ) : !clientSecret ? (
          <ActivityIndicator color={colors.forestMid} style={{ marginBottom: spacing.xl }} />
        ) : (
          <CardField
            postalCodeEnabled={false}
            style={styles.cardField}
            cardStyle={{
              backgroundColor: colors.white,
              borderWidth: 0.5,
              borderColor: 'rgba(14,92,91,0.25)',
              borderRadius: radius.sm,
              textColor: colors.textDark,
            }}
            onCardChange={(details) => setCardReady(details.complete)}
          />
        )}

        <CTAButton
          label={`Betala ${formatPrice(service.price_ore)}`}
          onPress={handlePay}
          icon={<IconLock size={14} color="#B7DCD7" strokeWidth={1.5} />}
          disabled={!cardReady || !clientSecret}
          loading={status === 'processing'}
        />

        {/* Trust row */}
        <View style={styles.trustRow}>
          <IconShieldCheck size={13} color={colors.textMuted} strokeWidth={1.5} />
          <Text style={[typography.micro, { marginLeft: spacing.xs }]}>256-bit SSL</Text>
          <Text style={[typography.micro, { marginHorizontal: spacing.sm }]}>·</Text>
          <Text style={[typography.micro]}>Säkrad via </Text>
          <Text style={[typography.micro, { color: '#635bff' }]}>stripe</Text>
        </View>

        <Text style={[typography.micro, { textAlign: 'center', marginTop: spacing.lg }]}>
          Testkort: 4242 4242 4242 4242 · valfri exp/cvv
        </Text>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={typography.small}>{label}</Text>
      <Text style={[typography.small, bold && { fontFamily: 'Poppins_600', color: colors.textDark }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },

  summary: {
    backgroundColor: colors.linen,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(14,92,91,0.18)',
    marginVertical: spacing.md,
  },

  cardField: { height: 50, marginBottom: spacing.lg },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successCheck: { fontSize: 32, color: colors.forestDark, fontWeight: '700' },
});
