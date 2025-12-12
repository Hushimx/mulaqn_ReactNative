import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function MultiplayerCreateScreen() {
  const router = useRouter();
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [questionsCount, setQuestionsCount] = useState(30);
  const [winType, setWinType] = useState<'first_to_errors' | 'highest_percentage'>('highest_percentage');
  const [winValue, setWinValue] = useState<number | null>(null);

  const trackIdNum = parseInt(trackId || '1');
  const colors = getTrackColors(trackIdNum) || {
    primary: '#D4AF37',
    gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
  };

  const handleCreate = async () => {
    if (loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const response = await api.post<{
        ok: boolean;
        data: { session_id: number; session_code: string; status: string };
      }>(API_ENDPOINTS.MULTIPLAYER_CREATE, {
        track_id: trackIdNum,
        questions_count: questionsCount,
        win_type: winType,
        win_value: winType === 'first_to_errors' ? winValue : null,
      });

      if (response && response.ok && response.data) {
        router.push({
          pathname: '/multiplayer/waiting',
          params: {
            sessionId: response.data.session_id.toString(),
            sessionCode: response.data.session_code
          }
        });
      } else {
        Alert.alert('خطأ', 'فشل إنشاء الجلسة');
      }
    } catch (error: any) {
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء إنشاء الجلسة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name={flexDirection === 'row-reverse' ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.title}>إنشاء جلسة</Text>
        </Animated.View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Questions Count */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>عدد الأسئلة</Text>
            <View style={styles.countContainer}>
              {[15, 30, 50, 100].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countButton,
                    questionsCount === count && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setQuestionsCount(count);
                  }}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      questionsCount === count && { color: '#FFFFFF' },
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Win Type */}
          <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>نوع الفوز</Text>
            <TouchableOpacity
              style={[
                styles.optionCard,
                winType === 'highest_percentage' && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWinType('highest_percentage');
                setWinValue(null);
              }}
            >
              <MaterialIcons
                name={winType === 'highest_percentage' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
                color={winType === 'highest_percentage' ? colors.primary : '#FFFFFF'}
              />
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>أعلى نسبة</Text>
                <Text style={styles.optionDesc}>الفائز هو من يحصل على أعلى نسبة إجابات صحيحة</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                winType === 'first_to_errors' && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setWinType('first_to_errors');
                setWinValue(5);
              }}
            >
              <MaterialIcons
                name={winType === 'first_to_errors' ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
                color={winType === 'first_to_errors' ? colors.primary : '#FFFFFF'}
              />
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>أول من يخطئ</Text>
                <Text style={styles.optionDesc}>أول من يصل لعدد معين من الأخطاء يخسر</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Win Value (if first_to_errors) */}
          {winType === 'first_to_errors' && (
            <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>عدد الأخطاء</Text>
              <View style={styles.countContainer}>
                {[5, 10, 15].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.countButton,
                      winValue === value && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setWinValue(value);
                    }}
                  >
                    <Text
                      style={[
                        styles.countButtonText,
                        winValue === value && { color: '#FFFFFF' },
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Create Button */}
          <Animated.View entering={FadeInUp.duration(600).delay(800)}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              disabled={loading || (winType === 'first_to_errors' && !winValue)}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="add-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>إنشاء الجلسة</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  countContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  countButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  countButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
    marginTop: 20,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

