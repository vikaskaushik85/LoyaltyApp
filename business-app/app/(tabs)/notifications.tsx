import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { useCafe } from '@/hooks/use-cafe';
import { BRAND } from '@/constants/theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  sent_at: string;
  target_count: number;
}

export default function NotificationsScreen() {
  const { cafe, isLoading: cafeLoading } = useCafe();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!cafe) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('cafe_id', cafe.id)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!error && data) setHistory(data);
    } catch {
      // non-critical
    } finally {
      setIsLoading(false);
    }
  }, [cafe]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchHistory();
    }, [fetchHistory])
  );

  const handleSend = async () => {
    if (!cafe) return;
    if (!title.trim()) { Alert.alert('Error', 'Please enter a title.'); return; }
    if (!message.trim()) { Alert.alert('Error', 'Please enter a message.'); return; }

    Alert.alert(
      'Send Notification',
      `This will send a push notification to all customers who visited ${cafe.name} in the last 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setIsSending(true);
            try {
              // 1. Count target users (visited in last 30 days)
              const { count } = await supabase
                .from('transactions')
                .select('user_id', { count: 'exact', head: true })
                .eq('cafe_id', cafe.id)
                .eq('status', 'success')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

              // 2. Save notification record
              const { error: insertError } = await supabase
                .from('notifications')
                .insert({
                  cafe_id: cafe.id,
                  title: title.trim(),
                  message: message.trim(),
                  target_count: count ?? 0,
                  created_by: (await supabase.auth.getUser()).data.user?.id,
                });

              if (insertError) {
                Alert.alert('Error', 'Failed to save notification.');
                return;
              }

              // 3. Trigger Edge Function to actually send push notifications
              // This calls the Supabase Edge Function (deployed separately)
              try {
                await supabase.functions.invoke('send-notification', {
                  body: {
                    cafe_id: cafe.id,
                    title: title.trim(),
                    message: message.trim(),
                  },
                });
              } catch {
                // Edge function might not be deployed yet — notification is saved regardless
                if (__DEV__) console.warn('Edge function call failed (may not be deployed)');
              }

              Alert.alert(
                'Sent!',
                `Notification queued for ${count ?? 0} recent visitors.`,
              );
              setTitle('');
              setMessage('');
              fetchHistory();
            } catch (err) {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (cafeLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!cafe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="store-alert-outline" size={64} color={BRAND.textMuted} />
          <Text style={styles.noDataText}>No cafe linked to your account</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="bullhorn-outline" size={28} color={BRAND.primary} />
        <Text style={styles.headerTitle}>Marketing</Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Compose Section */}
            <Text style={styles.sectionTitle}>Send Discount / Message</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="Notification title (e.g. 50% Off Today!)"
                placeholderTextColor={BRAND.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Message body..."
                placeholderTextColor={BRAND.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.helperText}>
                Targets customers who visited in the last 30 days
              </Text>
              <Pressable
                style={[styles.sendButton, isSending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={18} color="white" />
                    <Text style={styles.sendButtonText}>Send Notification</Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* History */}
            <Text style={styles.sectionTitle}>History</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{item.title}</Text>
              <Text style={styles.historyDate}>{formatDate(item.sent_at)}</Text>
            </View>
            <Text style={styles.historyMessage}>{item.message}</Text>
            <View style={styles.historyFooter}>
              <MaterialCommunityIcons name="account-group-outline" size={14} color={BRAND.textMuted} />
              <Text style={styles.historyTarget}>{item.target_count} recipients</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={BRAND.primary} />
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No notifications sent yet</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 16, color: BRAND.textSecondary, marginTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: BRAND.card,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10, color: BRAND.text },
  listContent: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: BRAND.text, marginBottom: 12 },
  card: {
    backgroundColor: BRAND.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  input: {
    backgroundColor: BRAND.cardLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: BRAND.text,
    marginBottom: 12,
  },
  inputMultiline: { textAlignVertical: 'top', minHeight: 100, paddingTop: 14 },
  helperText: { fontSize: 12, color: BRAND.textMuted, marginBottom: 16 },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  historyCard: {
    backgroundColor: BRAND.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: { fontSize: 15, fontWeight: '700', color: BRAND.text, flex: 1 },
  historyDate: { fontSize: 11, color: BRAND.textMuted },
  historyMessage: { fontSize: 14, color: BRAND.textSecondary, marginTop: 6, lineHeight: 20 },
  historyFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 4 },
  historyTarget: { fontSize: 12, color: BRAND.textMuted },
  emptyBox: {
    backgroundColor: BRAND.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: BRAND.textMuted },
});
