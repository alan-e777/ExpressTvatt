import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { IconHome, IconUser, IconCalendar, IconPackage } from '@tabler/icons-react-native';

import HomeScreen from '../screens/HomeScreen';
import StrukenTvattScreen from '../screens/StrukenTvattScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import CartPaymentScreen from '../screens/CartPaymentScreen';
import ProductsScreen from '../screens/ProductsScreen';
import BookScreen from '../screens/BookScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ProfileScreen from '../screens/ProfileScreen';
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
    items:      CartItem[];
    total:      number;
    address:    string;
    postalCode: string;
    date:       string;
    time:       string;
    notes:      string;
  };
};

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
const ProductsStack = createNativeStackNavigator<ProductsStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home"         component={HomeScreen} />
      <HomeStack.Screen name="StrukenTvatt" component={StrukenTvattScreen} />
      <HomeStack.Screen name="Checkout"     component={CheckoutScreen} />
      <HomeStack.Screen name="CartPayment"  component={CartPaymentScreen} />
    </HomeStack.Navigator>
  );
}

function ProductsStackNavigator() {
  return (
    <ProductsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductsStack.Screen name="Products" component={ProductsScreen} />
      <ProductsStack.Screen name="Book" component={BookScreen} />
      <ProductsStack.Screen name="Payment" component={PaymentScreen} />
    </ProductsStack.Navigator>
  );
}

type TabParamList = {
  Hem: undefined;
  Products: undefined;
  Ärenden: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.white,
            borderTopColor: 'rgba(74,124,89,0.12)',
            borderTopWidth: 0.5,
          },
          tabBarActiveTintColor: colors.forestDark,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontFamily: 'DMSans_400', fontSize: 9 },
        }}
      >
        <Tab.Screen
          name="Hem"
          component={HomeStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <IconHome size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tab.Screen
          name="Products"
          component={ProductsStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <IconCalendar size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tab.Screen
          name="Ärenden"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <IconPackage size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
        <Tab.Screen
          name="Profil"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <IconUser size={size} color={color} strokeWidth={1.5} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
