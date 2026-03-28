import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { useCafe } from '@/hooks/use-cafe';
import { BRAND } from '@/constants/theme';

interface DailyStats {
  today: number;
  yesterday: number;
  this_week: number;
}

interface TopVisitor {
  user_id: string;
  visit_count: number;
  last_visit: string;
}

interface RecentScan {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export default function DashboardScreen() {
  const { cafe, isLoading: cafeLoading } = useCafe();
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [topVisitors, setTopVisitors] = useState<TopVisitor[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!cafe) return;

    try {
      const [statsRes, visitorsRes, scansRes] = await Promise.all([
        supabase.rpc('get_daily_stats', { p_cafe_id: cafe.id }),
        supabase.rpc('get_top_visitors', { p_cafe_id: cafe.id, p_limit: 10 }),
        supabase.rpc('get_recent_scans', { p_cafe_id: cafe.id, p_limit: 15 }),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (visitorsRes.data) setTopVisitors(visitorsRes.data);
      if (scansRes.data) setRecentScans(scansRes.data);
    } catch (err) {
      if (__DEV__) console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [cafe]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return BRAND.success;
      case 'expired': return BRAND.warning;
      case 'replay': return BRAND.danger;
      case 'invalid_sig': return BRAND.danger;
      case 'rate_limited': return BRAND.warning;
      default: return BRAND.textMuted;
    }
  };

  const statusIcon = (status: string): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
    switch (status) {
      case 'success': return 'check-circle';
      case 'expired': return 'clock-alert-outline';
      case 'replay': return 'content-copy';
      case 'invalid_sig': return 'shield-alert-outline';
      case 'rate_limited': return 'timer-sand';
      default: return 'help-circle-outline';
    }
  };

  if (cafeLoading || isLoading) {
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

  const todayChange = stats
    ? stats.today - stats.yesterday
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-bar" size={28} color={BRAND.primary} />
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      <FlatList
        data={recentScans}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.today ?? 0}</Text>
                <Text style={styles.statLabel}>Today</Text>
                {todayChange !== 0 && (
                  <View style={styles.changeRow}>
                    <MaterialCommunityIcons
                      name={todayChange > 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={todayChange > 0 ? BRAND.success : BRAND.danger}
                    />
                    <Text style={[styles.changeText, { color: todayChange > 0 ? BRAND.success : BRAND.danger }]}>
                      {todayChange > 0 ? '+' : ''}{todayChange} vs yesterday
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.yesterday ?? 0}</Text>
                <Text style={styles.statLabel}>Yesterday</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats?.this_week ?? 0}</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
            </View>

            {/* Top Visitors */}
            <Text style={styles.sectionTitle}>Top Visitors</Text>
            {topVisitors.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No visitors yet</Text>
              </View>
            ) : (
              topVisitors.slice(0, 5).map((v, i) => (
                <View key={v.user_id} style={styles.visitorRow}>
                  <View style={[styles.rankBadge, i === 0 && { backgroundColor: BRAND.accent }]}>
                    <Text style={[styles.rankText, i === 0 && { color: BRAND.background }]}>
                      #{i + 1}
                    </Text>
                  </View>
                  <View style={styles.visitorInfo}>
                    <Text style={styles.visitorId} numberOfLines={1}>
                      {v.user_id.slice(0, 8)}...
                    </Text>
                    <Text style={styles.visitorMeta}>
                      {v.visit_count} visits · Last: {formatTime(v.last_visit)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="coffee" size={20} color={BRAND.accent} />
                  <Text style={styles.visitorCount}>{v.visit_count}</Text>
                </View>
              ))
            )}

            {/* Recent Activity */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Scans</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.scanRow}>
            <MaterialCommunityIcons
              name={statusIcon(item.status)}
              size={22}
              color={statusColor(item.status)}
            />
            <View style={styles.scanInfo}>
              <Text style={styles.scanUser}>{item.user_id.slice(0, 8)}...</Text>
              <Text style={styles.scanTime}>{formatTime(item.created_at)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(item.status)}20` }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No scan activity yet</Text>
          </View>
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
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: BRAND.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: BRAND.text },
  statLabel: { fontSize: 12, color: BRAND.textSecondary, marginTop: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 2 },
  changeText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: BRAND.text, marginBottom: 12 },
  visitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: { fontSize: 13, fontWeight: 'bold', color: BRAND.text },
  visitorInfo: { flex: 1 },
  visitorId: { fontSize: 14, fontWeight: '600', color: BRAND.text },
  visitorMeta: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  visitorCount: { fontSize: 16, fontWeight: 'bold', color: BRAND.accent, marginLeft: 4 },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 10,
  },
  scanInfo: { flex: 1 },
  scanUser: { fontSize: 14, fontWeight: '600', color: BRAND.text },
  scanTime: { fontSize: 12, color: BRAND.textSecondary, marginTop: 2 },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  emptyBox: {
    backgroundColor: BRAND.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: BRAND.textMuted },
});
