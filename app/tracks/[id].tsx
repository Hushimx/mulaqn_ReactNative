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
import { api, API_ENDPOINTS } from '@/utils/api';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  total_lessons?: number;
  completed_lessons?: number;
}

interface Lesson {
  id: number;
  title: string;
  description?: string;
  difficulty?: string;
  estimated_duration?: number;
  order_index?: number;
  is_completed?: boolean;
  user_progress?: {
    is_completed: boolean;
    last_score?: number;
    attempts_count?: number;
  };
}

export default function TrackDashboardScreen() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [track, setTrack] = useState<Track | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTrackAndLessons();
    }
  }, [id]);

  const fetchTrackAndLessons = async () => {
    try {
      setLoading(true);
      setError(null);

      // جلب معلومات المسار
      const trackResponse = await api.get<{ ok: boolean; data: Track }>(
        API_ENDPOINTS.TRACK(id)
      );

      if (trackResponse && trackResponse.ok && trackResponse.data) {
        setTrack(trackResponse.data);
      }

      // جلب دروس المسار
      const lessonsResponse = await api.get<{ ok: boolean; data: Lesson[] }>(
        API_ENDPOINTS.LESSONS(id)
      );

      if (lessonsResponse && lessonsResponse.ok && lessonsResponse.data) {
        setLessons(lessonsResponse.data);
      }
    } catch (err) {
      console.error('Error fetching track data:', err);
      setError(err instanceof Error ? err.message : t('tracks.errorLoading'));
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
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error || !track) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error || t('tracks.errorNotFound')}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchTrackAndLessons}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
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
          <Text style={styles.headerTitle}>{track.name}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Track Info Card */}
          <View style={styles.trackCard}>
            <Text style={[styles.trackName, { textAlign: isRTL ? 'right' : 'left' }]}>
              {track.name}
            </Text>
            {track.description && (
              <Text style={[styles.trackDescription, { textAlign: isRTL ? 'right' : 'left' }]}>
                {track.description}
              </Text>
            )}
            
            {/* Progress Stats */}
            <View style={[styles.statsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.statItem}>
                <MaterialIcons name="book" size={24} color="#D4AF37" />
                <Text style={styles.statValue}>{lessons.length}</Text>
                <Text style={styles.statLabel}>{t('tracks.totalLessons')}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
                <Text style={styles.statValue}>
                  {lessons.filter(l => l.user_progress?.is_completed).length}
                </Text>
                <Text style={styles.statLabel}>{t('tracks.completed')}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="trending-up" size={24} color="#3b82f6" />
                <Text style={styles.statValue}>
                  {lessons.length > 0
                    ? Math.round((lessons.filter(l => l.user_progress?.is_completed).length / lessons.length) * 100)
                    : 0}%
                </Text>
                <Text style={styles.statLabel}>{t('tracks.progress')}</Text>
              </View>
            </View>
          </View>

          {/* Lessons List */}
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('tracks.lessonsTitle')}
          </Text>

          {lessons.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="school" size={64} color="#6b7280" />
              <Text style={styles.emptyText}>{t('tracks.noLessons')}</Text>
            </View>
          ) : (
            lessons.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                style={styles.lessonCard}
                onPress={() => handleLessonPress(lesson)}
                activeOpacity={0.7}
              >
                <View style={[styles.lessonContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Lesson Number */}
                  <View style={[
                    styles.lessonNumber,
                    lesson.user_progress?.is_completed && styles.lessonNumberCompleted
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
                        <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) }]}>
                            <Text style={styles.difficultyText}>
                              {getDifficultyLabel(lesson.difficulty)}
                            </Text>
                          </View>
                        </View>
                      )}
                      {lesson.estimated_duration && (
                        <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialIcons name="schedule" size={16} color="#9ca3af" />
                          <Text style={styles.metaText}>{lesson.estimated_duration} {t('lessons.minutes')}</Text>
                        </View>
                      )}
                      {lesson.user_progress && lesson.user_progress.attempts_count > 0 && (
                        <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <MaterialIcons name="replay" size={16} color="#9ca3af" />
                          <Text style={styles.metaText}>
                            {lesson.user_progress.attempts_count} {t('lessons.attempts')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Arrow Icon */}
                  <MaterialIcons
                    name={isRTL ? 'chevron-left' : 'chevron-right'}
                    size={24}
                    color="#9ca3af"
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
    backgroundColor: '#D4AF37',
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
  trackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  trackDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 20,
    lineHeight: 20,
  },
  statsRow: {
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  lessonContent: {
    alignItems: 'center',
    gap: 12,
  },
  lessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  lessonNumberCompleted: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  lessonNumberText: {
    color: '#D4AF37',
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
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.7,
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

