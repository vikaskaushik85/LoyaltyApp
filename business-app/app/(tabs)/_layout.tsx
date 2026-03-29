import { Tabs } from 'expo-router';
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BRAND } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: BRAND.textMuted,
        tabBarStyle: {
          backgroundColor: BRAND.card,
          borderTopColor: BRAND.cardLight,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'QR Code',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="qrcode" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="chart-bar" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Marketing',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="bullhorn-outline" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="cog-outline" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
