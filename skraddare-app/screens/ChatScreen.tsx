import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { IconArrowUp } from '@tabler/icons-react-native';
import { ref, onValue, query, orderByChild, update } from 'firebase/database';
import { type User } from 'firebase/auth';
import { auth, realtimeDb } from '../lib/firebase';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';

type Message = { id: string; text: string; from: 'customer' | 'admin'; timestamp: number };

export default function ChatScreen() {
  const [user, setUser]         = useState<User | null>(auth.currentUser);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    const msgQuery = query(ref(realtimeDb, `chats/${user.uid}/messages`), orderByChild('timestamp'));
    const unsub = onValue(msgQuery, snap => {
      const msgs: Message[] = [];
      snap.forEach(child => { msgs.push({ id: child.key!, ...child.val() }); });
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
    await update(ref(realtimeDb), {
      [`chats/${user.uid}/messages/${msgKey}`]: { text, from: 'customer', timestamp: Date.now() },
      [`chats/${user.uid}/customerName`]:  user.displayName ?? 'Kund',
      [`chats/${user.uid}/customerEmail`]: user.email ?? '',
      [`chats/${user.uid}/lastMessage`]:   text,
      [`chats/${user.uid}/lastAt`]:        Date.now(),
      [`chats/${user.uid}/uid`]:           user.uid,
    });
  }

  return (
    <View style={styles.container}>
      <TopBar />
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
              <Text style={[typography.body, { textAlign: 'center', color: colors.moss }]}>
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
                  {new Date(item.timestamp).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
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
            <IconArrowUp size={18} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },

  list: { padding: spacing.lg, paddingBottom: spacing.sm },
  emptyWrap: { paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },

  bubble: { maxWidth: '78%', borderRadius: radius.xl, padding: spacing.md, marginBottom: spacing.md },
  // Mirrors the website's authenticated (.site-shell) chat: left = white card,
  // right = light-teal (forestLight) with dark-teal text. The old forestDark
  // right bubble was nearly invisible against the deep-teal page canvas.
  bubbleLeft:  { backgroundColor: colors.linen,       alignSelf: 'flex-start', borderBottomLeftRadius: radius.sm },
  bubbleRight: { backgroundColor: colors.forestLight, alignSelf: 'flex-end',   borderBottomRightRadius: radius.sm },
  textLeft:  { color: colors.textDark,   lineHeight: 21 },
  textRight: { color: colors.forestDark, lineHeight: 21 },
  timeLeft:  { marginTop: spacing.xs, color: colors.textMuted },
  timeRight: { marginTop: spacing.xs, color: 'rgba(8,63,65,0.55)', alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row', gap: spacing.sm, padding: spacing.md,
    backgroundColor: colors.white, borderTopWidth: 0.5, borderTopColor: 'rgba(14,92,91,0.12)',
  },
  input: {
    flex: 1, backgroundColor: colors.mint, borderRadius: radius.pill,
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    fontFamily: 'Inter_400', fontSize: 15, color: colors.textDark,
  },
  sendBtn: {
    backgroundColor: colors.forestDark, width: 44, height: 44, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
});
