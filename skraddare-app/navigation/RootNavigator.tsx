import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconHome, IconUser, IconMessage } from '@tabler/icons-react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { auth } from '../lib/firebase';
import HomeScreen from '../screens/HomeScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import CartPaymentScreen from '../screens/CartPaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import AuthScreen from '../screens/AuthScreen';
import Logo from '../components/Logo';
import { colors } from '../theme/colors';
import { type Service, type CartItem } from '../types';

export type HomeStackParamList = {
  Home:         undefined;
  StrukenTvatt: undefined;
  Checkout: {
    items: CartItem[];
    total: number;
  };
  CartPayment: {
    items:        CartItem[];
    total:        number;
    address:      string;
    postalCode:   string;
    date:         string; // pickup (Upphämtning)
    time:         string;
    deliveryDate: string; // delivery (Avlämning)
    deliveryTime: string;
    notes:        string;
  };
};

// Kept for the legacy single-service flow screens (Products/Book/Payment).
// These are not part of the migrated 3-tab app but are preserved, not deleted.
export type ProductsStackParamList = {
  Products: undefined;
  Book: { service: Service };
  Payment: {
    service: Service;
    address: string;
    postalCode: string;
    date: string;
    time: string;
    notes: string;
    customFields: Record<string, string>;
  };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home"        component={HomeScreen} />
      <HomeStack.Screen name="Checkout"    component={CheckoutScreen} />
      <HomeStack.Screen name="CartPayment" component={CartPaymentScreen} />
    </HomeStack.Navigator>
  );
}

type TabParamList = {
  Hem:    undefined;
  Chatt:  undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,            // icon-only navigation
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: 'rgba(14,92,91,0.12)',
          borderTopWidth: 0.5,
          height: 64,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.forestDark,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Hem"
        component={HomeStackNavigator}
        options={{ tabBarIcon: ({ color, size }) => <IconHome size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tab.Screen
        name="Chatt"
        component={ChatScreen}
        options={{ tabBarIcon: ({ color, size }) => <IconMessage size={size} color={color} strokeWidth={1.5} /> }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ color, size }) => <IconUser size={size} color={color} strokeWidth={1.5} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser]   = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setReady(true); });
    return unsub;
  }, []);

  // Splash while auth resolves
  if (!ready) {
    return (
      <View style={styles.splash}>
        <Logo size="lg" />
        <ActivityIndicator color={colors.moss} style={{ marginTop: 24 }} />
      </View>
    );
  }

  // No authentication = no access: a fullscreen login prompt, no tabs.
  if (!user) return <AuthScreen />;

  return (
    <NavigationContainer>
      <Tabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
});
