import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { IconArrowUp } from '@tabler/icons-react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius, spacing } from '../theme/spacing';
import TopBar from '../components/TopBar';

type Message = {
  id: string;
  text: string;
  from: 'customer' | 'tailor';
  time: string;
};

const MOCK_MESSAGES: Message[] = [
  { id: '1', text: 'Hej! Hur kan jag hjälpa dig?', from: 'tailor', time: '10:02' },
  { id: '2', text: 'Hej! Jag undrar om lagning av en jacka.', from: 'customer', time: '10:04' },
  { id: '3', text: 'Självklart, berätta gärna mer om vad som behöver lagas.', from: 'tailor', time: '10:05' },
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [input, setInput]       = useState('');

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id:   String(Date.now()),
        text,
        from: 'customer',
        time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setInput('');
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
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.from === 'customer' ? styles.bubbleRight : styles.bubbleLeft]}>
              <Text style={[typography.body, item.from === 'customer' ? styles.bubbleTextRight : styles.bubbleTextLeft]}>
                {item.text}
              </Text>
              <Text style={[typography.micro, item.from === 'customer' ? styles.timeRight : styles.timeLeft]}>
                {item.time}
              </Text>
            </View>
          )}
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
            <IconArrowUp size={18} color="#c8e6c9" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.noticeBar}>
          <Text style={typography.micro}>Realtidschatt aktiveras när Firebase är kopplat</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  list: { padding: spacing.lg, paddingBottom: spacing.sm },

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
  bubbleTextLeft: { color: colors.textDark, lineHeight: 21 },
  bubbleTextRight: { color: '#c8e6c9', lineHeight: 21 },
  timeLeft: { marginTop: spacing.xs, color: colors.textMuted },
  timeRight: { marginTop: spacing.xs, color: 'rgba(200,230,201,0.6)', alignSelf: 'flex-end' },

  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(74,124,89,0.12)',
  },
  input: {
    flex: 1,
    backgroundColor: colors.linen,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontFamily: 'DMSans_400',
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

  noticeBar: {
    backgroundColor: colors.linen,
    padding: spacing.sm,
    alignItems: 'center',
  },
});
