import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function MultiplayerDisconnectedScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();

  const colors = getTrackColors(1) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };
  const isLeft = reason === 'left';
  const message = isLeft
    ? 'انسحب صديقك من الجلسة'
    : 'انقطع اتصال صديقك';

  const handleHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/');
  };

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={ZoomIn.duration(800)} style={styles.iconContainer}>
          <MaterialIcons
            name={isLeft ? 'person-off' : 'wifi-off'}
            size={80}
            color="#EF4444"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.content}>
          <Text style={styles.title}>{message}</Text>
          <Text style={styles.subtitle}>
            {isLeft
              ? 'تم إلغاء الجلسة بسبب انسحاب صديقك'
              : 'تم إلغاء الجلسة بسبب انقطاع الاتصال'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(400)}>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={handleHome}
          >
            <MaterialIcons name="home" size={24} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>العودة للرئيسية</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    minWidth: 200,
  },
  homeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

