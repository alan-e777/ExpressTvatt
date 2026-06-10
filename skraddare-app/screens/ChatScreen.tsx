import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { IconArrowUp, IconLock } from '@tabler/icons-react-native';
import { ref, onValue, query, orderByChild, update } from 'firebase/database';
import { type User } from 'firebase/auth';
import { auth, realtimeDb } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';
import CTAButton from '../components/CTAButton';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

type TabParamList = {
  Hem: undefined;
  Products: undefined;
  Chatt: undefined;
  Profil: undefined;
};

type Message = {
  id: string;
  text: string;
  from: 'customer' | 'admin';
  timestamp: number;
};

export default function ChatScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'loggedIn'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      setAuthState(u ? 'loggedIn' : 'guest');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const msgQuery = query(
      ref(realtimeDb, `chats/${user.uid}/messages`),
      orderByChild('timestamp'),
    );
    const unsub = onValue(msgQuery, snap => {
      const msgs: Message[] = [];
      snap.forEach(child => {
        msgs.push({ id: child.key!, ...child.val() });
      });
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    });
    return unsub;
  }, [user]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !user) return;
    setInput('');

    const msgKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const updates: Record<string, unknown> = {
      [`chats/${user.uid}/messages/${msgKey}`]: {
        text,
        from: 'customer',
        timestamp: Date.now(),
      },
      [`chats/${user.uid}/customerName`]: user.displayName ?? 'Kund',
      [`chats/${user.uid}/customerEmail`]: user.email ?? '',
      [`chats/${user.uid}/lastMessage`]: text,
      [`chats/${user.uid}/lastAt`]: Date.now(),
      [`chats/${user.uid}/uid`]: user.uid,
    };
    await update(ref(realtimeDb), updates);
  }

  if (authState === 'loading') {
    return (
      <View style={styles.container}>
        <TopBar title="Chatt" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.forestMid} />
        </View>
      </View>
    );
  }

  if (authState === 'guest') {
    return (
      <View style={styles.container}>
        <TopBar title="Chatt" />
        <View style={styles.gateWrap}>
          <View style={styles.gateIcon}>
            <IconLock size={32} color={colors.forestMid} strokeWidth={1.5} />
          </View>
          <Text style={[typography.h2, styles.gateTitle]}>Logga in för att chatta</Text>
          <Text style={[typography.body, styles.gateSub]}>
            Du behöver ett konto för att skicka meddelanden till oss.
          </Text>
          <CTAButton
            label="Logga in / Skapa konto"
            onPress={() => navigation.navigate('Profil')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Chatt" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={88}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted }]}>
                Skicka ett meddelande för att starta en konversation.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCustomer = item.from === 'customer';
            return (
              <View style={[styles.bubble, isCustomer ? styles.bubbleRight : styles.bubbleLeft]}>
                <Text style={[typography.body, isCustomer ? styles.textRight : styles.textLeft]}>
                  {item.text}
                </Text>
                <Text style={[typography.micro, isCustomer ? styles.timeRight : styles.timeLeft]}>
                  {new Date(item.timestamp).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Skriv ett meddelande…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
            <IconArrowUp size={18} color="#B7DCD7" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  gateIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.moss,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  gateTitle: { textAlign: 'center', color: colors.white },
  gateSub:   { textAlign: 'center', color: colors.moss, marginBottom: spacing.sm },

  list: { padding: spacing.lg, paddingBottom: spacing.sm },
  emptyWrap: { paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },

  bubble: {
    maxWidth: '78%',
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bubbleLeft: {
    backgroundColor: colors.linen,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
  },
  bubbleRight: {
    backgroundColor: colors.forestDark,
    alignSelf: 'flex-end',
    borderBottomRightRadius: radius.sm,
  },
  textLeft:  { color: colors.textDark, lineHeight: 21 },
  textRight: { color: '#B7DCD7', lineHeight: 21 },
  timeLeft:  { marginTop: spacing.xs, color: colors.textMuted },
  timeRight: { marginTop: spacing.xs, color: 'rgba(183,220,215,0.6)', alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(14,92,91,0.12)',
  },
  input: {
    flex: 1,
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontFamily: 'Poppins_400',
    fontSize: 15,
    color: colors.textDark,
  },
  sendBtn: {
    backgroundColor: colors.forestDark,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
