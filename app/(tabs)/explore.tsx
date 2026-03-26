import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRemoteConfig } from '@/hooks/use-remote-config';

// Dummy Data
const CAFES = [
  { id: '1', name: 'Curtis Stone', location: 'Melbourne, VIC', distance: '0.2km', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500' },
  { id: '2', name: 'The Espresso Lab', location: 'Sydney, NSW', distance: '1.5km', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500' },
  { id: '3', name: 'Brew & Bean', location: 'Melbourne, VIC', distance: '2.1km', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500' },
  { id: '4', name: 'Golden Roast', location: 'Brisbane, QLD', distance: '4.8km', image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500' },
  { id: '5', name: 'Urban Grind', location: 'Perth, WA', distance: '5.2km', image: 'https://images.unsplash.com/photo-1559925393-8be0ec41b507?w=500' },
];

export default function ExploreScreen() {
  const cfg = useRemoteConfig();

  const renderCafe = ({ item }: { item: typeof CAFES[0] }) => (
    <TouchableOpacity style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.location}>{item.location}</Text>
      </View>
      <View style={styles.distanceTag}>
        <Text style={styles.distanceText}>{item.distance}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{cfg.exploreTitle}</Text>
      <FlatList
        data={CAFES}
        renderItem={renderCafe}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF5E6', paddingHorizontal: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#3C2A21', marginBottom: 20 },
  list: { paddingBottom: 100 },
  card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  image: { width: 80, height: 80 },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#3C2A21' },
  location: { fontSize: 14, color: '#8D7B68' },
  distanceTag: { padding: 10, justifyContent: 'center' },
  distanceText: { color: '#6F4E37', fontWeight: '600' }
});