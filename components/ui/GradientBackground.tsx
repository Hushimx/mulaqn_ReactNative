import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
}

const defaultColors = ['#0F1419', '#1B365D', '#2E5984'];
const defaultLocations = [0, 0.5, 1];
const defaultStart = { x: 0, y: 1 };
const defaultEnd = { x: 1, y: 0 };

export function GradientBackground({
  children,
  colors = defaultColors,
  locations = defaultLocations,
  start = defaultStart,
  end = defaultEnd,
  style,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      locations={locations}
      start={start}
      end={end}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

