import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const cards = [
    { id: '1', name: 'Curtis Stone', stamps: 7, total: 10, rewards: 2 },
    { id: '2', name: 'The Daily Grind', stamps: 5, total: 8, rewards: 1 },
  ];

  return (
    <SafeAreaView style={styles.container}>
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
  activeStamp: { backgroundColor: '#FFFBEB' }
});