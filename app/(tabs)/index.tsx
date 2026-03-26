import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { pendingReward } from '../../utils/rewardState';
import { useRemoteConfig } from '@/hooks/use-remote-config';

interface Card {
  id: string;
  name: string;
  stamps: number;
  total: number;
  rewards: number;
}

const testUserId = 'test-user-123';

export default function HomeScreen() {
  const router = useRouter();
  const cfg = useRemoteConfig();
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rewardModal, setRewardModal] = useState<{ cafeName: string; stampCount: number } | null>(null);
  const [unclaimedCount, setUnclaimedCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchCards();
      fetchUnclaimedCount();
      if (pendingReward.active) {
        const info = { cafeName: pendingReward.cafeName, stampCount: pendingReward.stampCount };
        pendingReward.clear();
        setRewardModal(info);
      }
    }, [])
  );

  const fetchUnclaimedCount = async () => {
    try {
      const { count, error } = await supabase
        .from('user_rewards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', testUserId)
        .eq('status', 'unclaimed');
      if (!error && count !== null) setUnclaimedCount(count);
    } catch {
      // non-critical — badge just won't show
    }
  };

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      const { data: loyaltyData, error: loyaltyError } = await supabase
        .from('user_loyalty_cards')
        .select(`
          id,
          stamps,
          rewards_redeemed,
          cafe_id,
          cafes:cafe_id (
            id,
            name
          )
        `)
        .eq('user_id', testUserId);

      if (loyaltyError) {
        console.error('❌ Error fetching loyalty cards:', loyaltyError);
        setCards([]);
        return;
      }

      if (!loyaltyData || loyaltyData.length === 0) {
        setCards([]);
        return;
      }

      const transformedCards = loyaltyData.map((card: any) => ({
        id: card.id,
        name: card.cafes?.name || 'Unknown Cafe',
        stamps: card.stamps || 0,
        total: cfg.stampsPerCard,
        rewards: card.rewards_redeemed || 0,
      }));

      setCards(transformedCards);
    } catch (error) {
      console.error('❌ Failed to fetch cards:', error);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const rewardMessage = cfg.rewardModalMessage.replace(
    '{stamps}',
    String(rewardModal?.stampCount ?? cfg.stampsPerCard),
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cfg.backgroundLight }]}>
      {/* Free Coffee Congratulations Modal */}
      <Modal
        visible={rewardModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="coffee" size={72} color={cfg.brandPrimary} />
            <Text style={styles.modalTitle}>{cfg.rewardModalTitle}</Text>
            <Text style={styles.modalMessage}>{rewardMessage}</Text>
            {rewardModal?.cafeName ? (
              <Text style={[styles.modalCafe, { color: cfg.brandPrimary }]}>
                at {rewardModal.cafeName}
              </Text>
            ) : null}
            <Pressable
              style={[styles.modalButton, { backgroundColor: cfg.brandPrimary }]}
              onPress={() => setRewardModal(null)}
              accessibilityRole="button"
              accessibilityLabel="Claim reward"
            >
              <Text style={styles.modalButtonText}>{cfg.rewardClaimButton}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="coffee-outline" size={28} color={cfg.brandPrimary} />
            <Text style={styles.headerTitle}>{cfg.appName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/rewards' as any)}
            style={styles.headerGift}
            accessibilityLabel="View rewards"
          >
            <MaterialCommunityIcons name="gift-outline" size={26} color={cfg.brandPrimary} />
            {unclaimedCount > 0 && (
              <View style={[styles.badge, { backgroundColor: cfg.brandPrimary }]}>
                <Text style={styles.badgeText}>{unclaimedCount > 9 ? '9+' : unclaimedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={[styles.heroCard, { backgroundColor: cfg.brandPrimaryDark }]}>
          <Text style={styles.heroTitle}>{cfg.heroTitle}</Text>
          <Text style={[styles.heroSubtitle, { color: cfg.brandAccent }]}>{cfg.heroSubtitle}</Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => router.push('/scanner')}
          >
            <Text style={[styles.heroButtonText, { color: cfg.brandPrimaryDark }]}>
              {cfg.scanButtonLabel}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your Cards</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={cfg.brandPrimary} />
            <Text style={styles.loadingText}>Loading your cards...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="coffee-outline" size={48} color={cfg.brandPrimary} />
            <Text style={styles.emptyText}>No loyalty cards yet</Text>
            <Text style={styles.emptySubtext}>Scan a cafe's QR code to get started!</Text>
          </View>
        ) : (
          <>
            {cards.map((card) => (
              <View key={card.id} style={[styles.loyaltyCard, { backgroundColor: cfg.brandPrimary }]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={[styles.cardRewards, { color: cfg.brandAccentLight }]}>
                      {card.rewards} rewards redeemed
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="coffee-outline" size={32} color="white" />
                </View>

                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Progress</Text>
                  <Text style={styles.progressValue}>{card.stamps} / {card.total}</Text>
                </View>

                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(card.stamps / card.total) * 100}%` }]} />
                </View>

                <View style={styles.stampGrid}>
                  {[...Array(card.total)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.stampSlot,
                        i < card.stamps && { backgroundColor: cfg.brandAccentLightest },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="coffee"
                        size={20}
                        color={i < card.stamps ? cfg.brandPrimary : '#E5E7EB'}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: 'white' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  headerGift: { position: 'relative', padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  heroCard: { margin: 20, padding: 24, borderRadius: 24 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  heroSubtitle: { fontSize: 16, marginTop: 8, lineHeight: 22 },
  heroButton: { backgroundColor: 'white', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  heroButtonText: { fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15 },
  loyaltyCard: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardRewards: { fontSize: 14 },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  progressText: { color: 'white', opacity: 0.8 },
  progressValue: { color: 'white', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: 8 },
  progressBarFill: { height: 8, backgroundColor: 'black', borderRadius: 4 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  stampSlot: { width: 45, height: 45, backgroundColor: 'white', borderRadius: 12, margin: 4, justifyContent: 'center', alignItems: 'center' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 17,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
  modalCafe: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  modalButton: {
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 28,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});