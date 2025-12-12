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
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GradientButton } from '@/components/ui/GradientButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { SkeletonLessonHeader, SkeletonLoader } from '@/components/ui/SkeletonLoader';

interface Lesson {
  id: number;
  title: string;
  description?: string;
  content?: string;
  difficulty?: string;
  estimated_duration?: number;
  questions_count?: number;
  track?: {
    id: number;
    name: string;
    code: string;
  };
  user_progress?: {
    is_completed: boolean;
    last_score?: number;
    attempts_count?: number;
    best_score?: number;
  };
}

export default function LessonShowScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLesson();
    }
  }, [id]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: Lesson }>(
        API_ENDPOINTS.LESSON(id)
      );

      if (response && response.ok && response.data) {
        setLesson(response.data);
      }
    } catch (err) {
      console.error('Error fetching lesson:', err);
      setError(err instanceof Error ? err.message : t('lessons.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartLesson = async () => {
    if (!lesson) return;

    try {
      setStarting(true);

      // إنشاء محاولة جديدة
      const response = await api.post<{ ok: boolean; data: { id: number } }>(
        API_ENDPOINTS.LESSON_ATTEMPTS,
        { lesson_id: lesson.id }
      );

      if (response && response.ok && response.data) {
        // الانتقال إلى صفحة حل الأسئلة
        router.push(`/lessons/attempt/${response.data.id}`);
      }
    } catch (err) {
      console.error('Error starting lesson:', err);
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('lessons.errorStarting')
      );
    } finally {
      setStarting(false);
    }
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
            <SkeletonLoader width="50%" height={20} borderRadius={6} />
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Lesson Header Skeleton */}
            <SkeletonLessonHeader />

            {/* Description Section Skeleton */}
            <View style={styles.section}>
              <SkeletonLoader width="40%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="95%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="90%" height={14} borderRadius={6} />
            </View>

            {/* Content Section Skeleton */}
            <View style={styles.section}>
              <SkeletonLoader width="35%" height={18} borderRadius={6} style={{ marginBottom: 12 }} />
              <View style={styles.contentCard}>
                <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="100%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="95%" height={14} borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonLoader width="90%" height={14} borderRadius={6} />
              </View>
            </View>
          </ScrollView>

          {/* Bottom Button Skeleton */}
          <View style={styles.bottomContainer}>
            <SkeletonLoader width="100%" height={56} borderRadius={12} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error || !lesson) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error || t('lessons.errorNotFound')}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchLesson}
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
          <Text style={styles.headerTitle}>{t('lessons.lessonDetails')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Lesson Header Card */}
          <View style={styles.lessonHeader}>
            <Text style={[styles.lessonTitle]}>
              {lesson.title}
            </Text>

            {lesson.track && (
              <View style={[styles.trackBadge, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                <MaterialIcons name="folder" size={16} color="#D4AF37" />
                <Text style={styles.trackText}>{lesson.track.name}</Text>
              </View>
            )}

            {/* Meta Info */}
            <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {lesson.difficulty && (
                <View style={[styles.metaBadge, { backgroundColor: getDifficultyColor(lesson.difficulty) }]}>
                  <MaterialIcons name="signal-cellular-alt" size={16} color="#FFFFFF" />
                  <Text style={styles.metaBadgeText}>{getDifficultyLabel(lesson.difficulty)}</Text>
                </View>
              )}
              {lesson.estimated_duration && (
                <View style={styles.metaBadge}>
                  <MaterialIcons name="schedule" size={16} color="#FFFFFF" />
                  <Text style={styles.metaBadgeText}>
                    {lesson.estimated_duration} {t('lessons.minutes')}
                  </Text>
                </View>
              )}
              {lesson.questions_count && (
                <View style={styles.metaBadge}>
                  <MaterialIcons name="quiz" size={16} color="#FFFFFF" />
                  <Text style={styles.metaBadgeText}>
                    {lesson.questions_count} {t('lessons.questions')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {lesson.description && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle]}>
                {t('lessons.description')}
              </Text>
              <Text style={[styles.descriptionText]}>
                {lesson.description}
              </Text>
            </View>
          )}

          {/* Content */}
          {lesson.content && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle]}>
                {t('lessons.content')}
              </Text>
              <View style={styles.contentCard}>
                <Text style={[styles.contentText]}>
                  {lesson.content}
                </Text>
              </View>
            </View>
          )}

          {/* Progress Stats */}
          {lesson.user_progress && lesson.user_progress.attempts_count > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle]}>
                {t('lessons.yourProgress')}
              </Text>
              <View style={styles.statsCard}>
                <View style={[styles.statRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.statItem}>
                    <MaterialIcons name="replay" size={32} color="#3b82f6" />
                    <Text style={styles.statValue}>{lesson.user_progress.attempts_count}</Text>
                    <Text style={styles.statLabel}>{t('lessons.attempts')}</Text>
                  </View>
                  {lesson.user_progress.last_score !== undefined && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="grade" size={32} color="#f59e0b" />
                      <Text style={styles.statValue}>{lesson.user_progress.last_score}%</Text>
                      <Text style={styles.statLabel}>{t('lessons.lastScore')}</Text>
                    </View>
                  )}
                  {lesson.user_progress.best_score !== undefined && (
                    <View style={styles.statItem}>
                      <MaterialIcons name="star" size={32} color="#D4AF37" />
                      <Text style={styles.statValue}>{lesson.user_progress.best_score}%</Text>
                      <Text style={styles.statLabel}>{t('lessons.bestScore')}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Completion Badge */}
          {lesson.user_progress?.is_completed && (
            <View style={styles.completionBadge}>
              <MaterialIcons name="check-circle" size={24} color="#10b981" />
              <Text style={styles.completionText}>{t('lessons.completed')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomContainer}>
          <GradientButton
            title={
              lesson.user_progress?.attempts_count > 0
                ? t('lessons.tryAgain')
                : t('lessons.startLesson')
            }
            onPress={handleStartLesson}
            loading={starting}
            icon={
              <MaterialIcons
                name={lesson.user_progress?.attempts_count > 0 ? 'replay' : 'play-arrow'}
                size={24}
                color="#FFFFFF"
              />
            }
          />
        </View>
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
    paddingBottom: 120,
  },
  lessonHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  lessonTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  trackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  trackText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: {
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  descriptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 22,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statRow: {
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  completionText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(27, 54, 93, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});

