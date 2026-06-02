import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display';
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import RootNavigator from './navigation/RootNavigator';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500: PlayfairDisplay_500Medium,
    DMSans_300:          DMSans_300Light,
    DMSans_400:          DMSans_400Regular,
    DMSans_500:          DMSans_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.com.amosskradderi">
        <StatusBar style="light" />
        <RootNavigator />
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
