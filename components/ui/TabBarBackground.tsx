import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTrack } from '@/contexts/TrackContext';

export default function TabBarBackground() {
  // استخدام ألوان الـ Track الحالي من Context
  const { trackColors, currentTrackId } = useTrack();
  
  // استخدام useMemo للتأكد من إعادة الحساب عند تغيير الألوان
  // استخدام ألوان متناسقة مع الـ track الحالي
  const colors: readonly [string, string, string] = useMemo(() => {
    if (currentTrackId === 1) {
      // قدرات - أخضر
      return [
        'rgba(15, 20, 25, 0.95)',    // أسود داكن
        'rgba(16, 55, 47, 0.90)',    // أخضر داكن متناسق
        'rgba(17, 141, 102, 0.85)',  // أخضر track
      ] as const;
    } else if (currentTrackId === 2) {
      // تحصيلي - أزرق
      return [
        'rgba(15, 20, 25, 0.95)',    // أسود داكن
        'rgba(23, 41, 68, 0.90)',    // أزرق داكن متناسق
        'rgba(59, 130, 246, 0.85)',  // أزرق track
      ] as const;
    } else if (currentTrackId === 3) {
      // STEP - بنفسجي
      return [
        'rgba(15, 20, 25, 0.95)',    // أسود داكن
        'rgba(55, 48, 163, 0.90)',    // بنفسجي داكن متناسق
        'rgba(139, 92, 246, 0.85)',  // بنفسجي track
      ] as const;
    } else {
      // افتراضي
      return [
        'rgba(15, 20, 25, 0.95)',    // أسود داكن
        'rgba(27, 54, 93, 0.90)',    // أزرق داكن
        'rgba(212, 175, 55, 0.85)',  // ذهبي
      ] as const;
    }
  }, [trackColors.gradient, currentTrackId]);
  
  return (
    <View style={StyleSheet.absoluteFill} key={`tabbar-${currentTrackId}`}>
      <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={colors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </BlurView>
    </View>
  );
}

export function useBottomTabOverflow() {
  return 0;
}
