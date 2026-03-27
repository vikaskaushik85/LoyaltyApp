import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  size?: number;
  color?: string;
  showText?: boolean;
  textColor?: string;
}

/**
 * Scalable PerkUp logo — a star-burst / spark icon that represents
 * perks & rewards across any business (cafes, salons, spas, etc.).
 */
export function PerkUpLogo({
  size = 88,
  color = '#D97706',
  showText = false,
  textColor,
}: Props) {
  const iconSize = size * 0.55;

  return (
    <View style={showText ? styles.row : undefined}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      >
        {/* Layered icons: a star-four-points with a gift spark to convey
            "rewards / perks" without tying to any single industry. */}
        <View style={styles.iconStack}>
          <MaterialCommunityIcons
            name="star-four-points"
            size={iconSize}
            color="rgba(255,255,255,0.35)"
            style={{ position: 'absolute' }}
          />
          <MaterialCommunityIcons
            name="star-four-points-outline"
            size={iconSize}
            color="white"
          />
        </View>
      </View>
      {showText && (
        <Text style={[styles.text, { color: textColor ?? color }]}>PerkUp</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  iconStack: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 14,
  },
});
