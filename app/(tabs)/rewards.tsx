import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { useRemoteConfig } from '@/hooks/use-remote-config';
import { useAuth } from '@/hooks/use-auth';

interface Reward {
  id: string;
  cafe_id: string;
  cafeName: string;
  status: 'unclaimed' | 'claimed';
  created_at: string;
}

export default function RewardsScreen() {
  const cfg = useRemoteConfig();
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRewards();
    }, [])
  );

  const fetchRewards = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_rewards')
        .select(`
          id,
          cafe_id,
          status,
          created_at,
          cafes:cafe_id ( name )
        `)
        .eq('user_id', userId)
        .eq('status', 'unclaimed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching rewards:', error);
        setRewards([]);
        return;
      }

      const mapped: Reward[] = (data ?? []).map((r: any) => ({
        id: r.id,
        cafe_id: r.cafe_id,
        cafeName: r.cafes?.name ?? 'Unknown Cafe',
        status: r.status,
        created_at: r.created_at,
      }));

      setRewards(mapped);
    } catch (err) {
      console.error('❌ Failed to fetch rewards:', err);
      setRewards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async (rewardId: string) => {
    setClaimingId(rewardId);
    try {
      const { error } = await supabase
        .from('user_rewards')
        .update({ status: 'claimed' })
        .eq('id', rewardId);

      if (error) {
        Alert.alert('Error', 'Failed to claim reward. Please try again.');
        console.error('❌ Claim error:', error);
        return;
      }

      // Remove from local list immediately for snappy UI
      setRewards((prev) => prev.filter((r) => r.id !== rewardId));
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('❌ Claim threw:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderReward = ({ item }: { item: Reward }) => (
    <View style={[styles.card, { borderLeftColor: cfg.brandPrimary }]}>
      <View style={styles.cardBody}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.brandAccentLightest }]}>
          <MaterialCommunityIcons name="coffee" size={28} color={cfg.brandPrimary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Free Coffee</Text>
          <Text style={styles.cardCafe}>{item.cafeName}</Text>
          <Text style={styles.cardDate}>Earned {formatDate(item.created_at)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.claimButton, { backgroundColor: cfg.brandPrimary }]}
        onPress={() => claimReward(item.id)}
        disabled={claimingId === item.id}
        activeOpacity={0.8}
      >
        {claimingId === item.id ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Text style={styles.claimButtonText}>Claim</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.backgroundLight }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="gift-outline" size={28} color={cfg.brandPrimary} />
        <Text style={styles.headerTitle}>My Rewards</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={cfg.brandPrimary} />
          <Text style={styles.loadingText}>Loading rewards...</Text>
        </View>
      ) : rewards.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="gift-open-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No unclaimed rewards</Text>
          <Text style={styles.emptySubtext}>
            Collect {cfg.stampsPerCard} stamps at a cafe to earn a free coffee!
          </Text>
        </View>
      ) : (
        <FlatList
          data={rewards}
          renderItem={renderReward}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  list: { padding: 20, paddingBottom: 100 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBody: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { flex: 1, marginLeft: 14 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937' },
  cardCafe: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  cardDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  claimButton: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  claimButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 16 },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
