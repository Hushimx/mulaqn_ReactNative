import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTrack } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';

interface Lesson {
  id: number;
  title: string;
  description?: string;
  difficulty?: string;
  estimated_duration?: number;
  order_index?: number;
  user_progress?: {
    is_completed: boolean;
    last_score?: number;
    attempts_count?: number;
  };
}

export default function TrackLessonsScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trackColors } = useTrack();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchLessons();
    }
  }, [id]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: Lesson[] }>(
        API_ENDPOINTS.LESSONS(id)
      );

      if (response && response.ok && response.data) {
        setLessons(response.data);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError(err instanceof Error ? err.message : t('lessons.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleLessonPress = (lesson: Lesson) => {
    router.push(`/lessons/${lesson.id}`);
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'hard':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return t('lessons.difficulty.easy');
      case 'medium':
        return t('lessons.difficulty.medium');
      case 'hard':
        return t('lessons.difficulty.hard');
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <GradientBackground colors={trackColors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={trackColors.primary} />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground colors={trackColors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: trackColors.primary }]}
              onPress={fetchLessons}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('tracks.lessonsTitle')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {lessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="school" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>{t('tracks.noLessons')}</Text>
            </View>
          ) : (
            lessons.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                style={[styles.lessonCard, { borderColor: `${trackColors.primary}40` }]}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.7}
              >
                <View style={[styles.lessonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Lesson Number */}
                  <View style={[
                    styles.lessonNumber,
                    lesson.user_progress?.is_completed && { backgroundColor: '#10b981' },
                    !lesson.user_progress?.is_completed && { backgroundColor: trackColors.primary }
                  ]}>
                    {lesson.user_progress?.is_completed ? (
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.lessonNumberText}>{index + 1}</Text>
                    )}
                  </View>

                  {/* Lesson Info */}
                  <View style={styles.lessonInfo}>
                    <Text style={[styles.lessonTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {lesson.title}
                    </Text>
                    
                    {lesson.description && (
                      <Text style={[styles.lessonDescription, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                        {lesson.description}
                      </Text>
                    )}

                    {/* Lesson Meta */}
                    <View style={[styles.lessonMeta, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {lesson.difficulty && (
                        <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) }]}>
                          <Text style={styles.difficultyText}>
                            {getDifficultyLabel(lesson.difficulty)}
                          </Text>
                        </View>
                      )}
                      {lesson.estimated_duration && (
                        <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialIcons name="schedule" size={16} color="#9ca3af" />
                          <Text style={styles.metaText}>{lesson.estimated_duration} {t('lessons.minutes')}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Arrow Icon */}
                  <MaterialIcons
                    name={isRTL ? 'chevron-left' : 'chevron-right'}
                    size={24}
                    color={trackColors.primary}
                  />
                </View>

                {/* Score Badge if completed */}
                {lesson.user_progress?.last_score !== undefined && (
                  <View style={styles.scoreBadge}>
                    <MaterialIcons name="star" size={16} color="#D4AF37" />
                    <Text style={styles.scoreText}>
                      {lesson.user_progress.last_score}%
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.7,
    marginTop: 16,
  },
  lessonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
  },
  lessonContent: {
    alignItems: 'center',
    gap: 12,
  },
  lessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  lessonInfo: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lessonDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  lessonMeta: {
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
});

