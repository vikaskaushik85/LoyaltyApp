import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../utils/supabase';
import { pendingReward } from '../../utils/rewardState';

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
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rewardModal, setRewardModal] = useState<{ cafeName: string; stampCount: number } | null>(null);

  // Fetch loyalty cards whenever screen comes into focus, and check
  // whether the scanner left a pending reward notification for us.
  useFocusEffect(
    useCallback(() => {
      fetchCards();
      if (pendingReward.active) {
        const info = { cafeName: pendingReward.cafeName, stampCount: pendingReward.stampCount };
        pendingReward.clear(); // clear immediately so it only fires once
        setRewardModal(info);
      }
    }, [])
  );

  const fetchCards = async () => {
    try {
      setIsLoading(true);
      console.log('📥 Fetching loyalty cards for user:', testUserId);

      // Get user's loyalty cards with cafe info
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
        console.log('ℹ️ No loyalty cards found');
        setCards([]);
        return;
      }

      // Transform data to card format
      const transformedCards = loyaltyData.map((card: any) => ({
        id: card.id,
        name: card.cafes?.name || 'Unknown Cafe',
        stamps: card.stamps || 0,
        total: 10, // Default to 10 stamps per loyalty card
        rewards: card.rewards_redeemed || 0,
      }));

      console.log('✅ Loaded', transformedCards.length, 'loyalty cards');
      setCards(transformedCards);
    } catch (error) {
      console.error('❌ Failed to fetch cards:', error);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Free Coffee Congratulations Modal */}
      <Modal
        visible={rewardModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRewardModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <MaterialCommunityIcons name="coffee" size={72} color="#D97706" />
            <Text style={styles.modalTitle}>Congratulations! 🎉</Text>
            <Text style={styles.modalMessage}>
              {"You've earned "}{rewardModal?.stampCount}{" stamps!\nYou deserve a free coffee!"}
            </Text>
            {rewardModal?.cafeName ? (
              <Text style={styles.modalCafe}>at {rewardModal.cafeName}</Text>
            ) : null}
            <Pressable
              style={styles.modalButton}
              onPress={() => setRewardModal(null)}
              accessibilityRole="button"
              accessibilityLabel="Claim reward"
            >
              <Text style={styles.modalButtonText}>Claim My Free Coffee ☕️</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="coffee-outline" size={28} color="#D97706" />
          <Text style={styles.headerTitle}>CafeLoyalty</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Welcome back!</Text>
          <Text style={styles.heroSubtitle}>Collect stamps and get free coffee at your favorite cafes</Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => router.push('/scanner')}
          >
            <Text style={styles.heroButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your Cards</Text>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={styles.loadingText}>Loading your cards...</Text>
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="coffee-outline" size={48} color="#D97706" />
            <Text style={styles.emptyText}>No loyalty cards yet</Text>
            <Text style={styles.emptySubtext}>Scan a cafe's QR code to get started!</Text>
          </View>
        ) : (
          <>
            {/* Loyalty Cards */}
            {cards.map((card) => (
              <View key={card.id} style={styles.loyaltyCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardName}>{card.name}</Text>
                    <Text style={styles.cardRewards}>{card.rewards} rewards redeemed</Text>
                  </View>
                  <MaterialCommunityIcons name="coffee-outline" size={32} color="white" />
                </View>

                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>Progress</Text>
                  <Text style={styles.progressValue}>{card.stamps} / {card.total}</Text>
                </View>
                
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${(card.stamps/card.total)*100}%` }]} />
                </View>

                <View style={styles.stampGrid}>
                  {[...Array(card.total)].map((_, i) => (
                    <View key={i} style={[styles.stampSlot, i < card.stamps && styles.activeStamp]}>
                      <MaterialCommunityIcons 
                        name="coffee" 
                        size={20} 
                        color={i < card.stamps ? "#D97706" : "#E5E7EB"} 
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'white' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  heroCard: { backgroundColor: '#B45309', margin: 20, padding: 24, borderRadius: 24 },
  heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  heroSubtitle: { color: '#FCD34D', fontSize: 16, marginTop: 8, lineHeight: 22 },
  heroButton: { backgroundColor: 'white', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 },
  heroButtonText: { color: '#B45309', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15 },
  loyaltyCard: { backgroundColor: '#D97706', marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  cardRewards: { color: '#FEF3C7', fontSize: 14 },
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  progressText: { color: 'white', opacity: 0.8 },
  progressValue: { color: 'white', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: 8 },
  progressBarFill: { height: 8, backgroundColor: 'black', borderRadius: 4 },
  stampGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 },
  stampSlot: { width: 45, height: 45, backgroundColor: 'white', borderRadius: 12, margin: 4, justifyContent: 'center', alignItems: 'center' },
  activeStamp: { backgroundColor: '#FFFBEB' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  // Reward modal
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
    color: '#D97706',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#D97706',
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