import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function MultiplayerIndexScreen() {
  const router = useRouter();
  const { trackId: trackIdParam, id } = useLocalSearchParams<{ trackId?: string; id?: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();

  // دعم كلا الاسمين: trackId (من tracks/[id]/index) أو id (للتوافق مع المستقبل)
  const trackId = parseInt(trackIdParam || id || '1');
  const colors = getTrackColors(trackId) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/multiplayer/create',
      params: { trackId: trackId.toString() }
    });
  };

  const handleJoin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/multiplayer/join',
      params: { trackId: trackId.toString() }
    });
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(tabs)/tracks/[id]',
      params: { id: trackId.toString() }
    });
  };

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>اختبار مع صديق</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.container}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.contentSection}>
            <MaterialIcons name="people" size={64} color={colors.primary} />
            <Text style={[styles.title, { textAlign }]}>اختبار مع صديق</Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              تنافس مع صديقك في نفس الاختبار في الوقت الفعلي
            </Text>
          </Animated.View>

        <View style={styles.buttonsContainer}>
          <Animated.View entering={FadeInUp.duration(600).delay(200)}>
            <TouchableOpacity
              style={[styles.button, styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-circle" size={28} color="#FFFFFF" />
              <Text style={styles.buttonText}>إنشاء جلسة</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(400)}>
            <TouchableOpacity
              style={[styles.button, styles.joinButton, { borderColor: colors.primary }]}
              onPress={handleJoin}
              activeOpacity={0.8}
            >
              <MaterialIcons name="login" size={28} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.primary }]}>انضمام</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  contentSection: {
    alignItems: 'center',
    marginBottom: 60,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  createButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

