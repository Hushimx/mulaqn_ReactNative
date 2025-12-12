import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  LogBox,
} from 'react-native';

// إخفاء warnings للصفحة
LogBox.ignoreLogs(['Warning: ...']);
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { PerformanceCard } from '@/components/ui/PerformanceCard';
import { LessonPerformanceRow } from '@/components/ui/LessonPerformanceRow';
import { ShimmerCard, ShimmerRow, ShimmerCircle } from '@/components/ui/ShimmerLoader';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { hapticFeedback } from '@/utils/haptics';

interface PerformanceData {
  track: {
    id: number;
    code: string;
    name: string;
  };
  overall_performance: {
    percentage: number;
    total_questions: number;
    correct_answers: number;
    total_attempts: number;
    completed_lessons: number;
  };
  performance_level: {
    level: string;
    level_arabic: string;
    color: string;
  };
  categories: Array<{
    id: number;
    name: string;
    code: string;
    percentage: number;
    correct_answers: number;
    total_questions: number;
    level: string;
    level_ar: string;
    color: string;
  }>;
  lessons: Array<{
    id: number;
    title: string;
    category_name: string;
    percentage: number;
    correct_answers: number;
    total_questions: number;
    level: string;
    level_ar: string;
    color: string;
  }>;
  comparison: {
    overall_percentage: number;
    recent_percentage: number;
    improvement: number;
    recent_questions: number;
    has_recent_activity: boolean;
  };
  recommendations: Array<{
    type: string;
    icon: string;
    title: string;
    description: string;
    action: string;
    color: string;
  }>;
}

export default function PerformanceAnalysisScreen() {
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackId = parseInt(id);
  const colors = getTrackColors(trackId);

  // إخفاء Development indicator
  useEffect(() => {
    if (__DEV__) {
      // @ts-ignore
      global.__EXPO_HIDE_DEV_INDICATOR__ = true;
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [id]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ ok: boolean; data: PerformanceData }>(
        API_ENDPOINTS.TRACK_PERFORMANCE(id)
      );

      if (response && response.ok && response.data) {
        setData(response.data);
        // Success haptic feedback
        if (!loading) {
          hapticFeedback.success();
        }
      }
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError('حدث خطأ في تحميل البيانات');
      hapticFeedback.error();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPerformanceData();
  };

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تحليل الأداء</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section Shimmer */}
            <View style={styles.heroSection}>
              <ShimmerCircle size={220} style={{ marginBottom: 20 }} />
              <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} style={styles.statBox}>
                    <ShimmerCircle size={24} style={{ marginBottom: 8 }} />
                    <ShimmerCircle size={20} style={{ marginBottom: 4, width: 40 }} />
                    <ShimmerCircle size={11} style={{ width: 60 }} />
                  </View>
                ))}
              </View>
            </View>

            {/* Categories Shimmer */}
            <View style={styles.section}>
              <ShimmerCircle size={24} style={{ marginBottom: 16, width: 150, height: 24 }} />
              <ShimmerCard />
              <ShimmerCard />
            </View>

            {/* Lessons Shimmer */}
            <View style={styles.section}>
              <ShimmerCircle size={24} style={{ marginBottom: 16, width: 150, height: 24 }} />
              {[1, 2, 3].map((i) => (
                <ShimmerRow key={i} />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error || !data) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticFeedback.light();
                router.back();
              }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تحليل الأداء</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.errorText}>{error || 'حدث خطأ'}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                hapticFeedback.medium();
                fetchPerformanceData();
              }}
            >
              <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Empty State
  if (data.overall_performance.total_questions === 0) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticFeedback.light();
                router.back();
              }}
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تحليل الأداء</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="insights" size={80} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>ابدأ رحلتك التعليمية</Text>
            <Text style={styles.emptyMessage}>
              لم تقم بحل أي اختبار بعد. ابدأ بحل الاختبارات لنتمكن من تحليل أدائك
              وتقديم توصيات مخصصة لك
            </Text>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                hapticFeedback.medium();
                router.back();
              }}
            >
              <Text style={styles.startButtonText}>ابدأ الآن</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { overall_performance, performance_level, categories, lessons, comparison, recommendations } = data;

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              router.back();
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تحليل الأداء</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              hapticFeedback.light();
              onRefresh();
            }}
          >
            <MaterialIcons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Hero Section - Overall Performance */}
          <View style={styles.heroSection}>
            <Text style={styles.trackName}>{data.track.name}</Text>
            
            <View style={styles.circularProgressContainer}>
              <CircularProgress
                percentage={overall_performance.percentage}
                size={220}
                strokeWidth={18}
                color={colors.primary}
                showGlow={true}
              />
            </View>

            <View style={[styles.levelBadge, { backgroundColor: `${performance_level.color}20` }]}>
              <Text style={[styles.levelText, { color: performance_level.color }]}>
                {performance_level.level_arabic}
              </Text>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
                <Text style={styles.statNumber}>{overall_performance.correct_answers}</Text>
                <Text style={styles.statLabel}>إجابة صحيحة</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="quiz" size={24} color={colors.primary} />
                <Text style={styles.statNumber}>{overall_performance.total_questions}</Text>
                <Text style={styles.statLabel}>سؤال</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="assignment" size={24} color="#3b82f6" />
                <Text style={styles.statNumber}>{overall_performance.total_attempts}</Text>
                <Text style={styles.statLabel}>محاولة</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="bookmark" size={24} color="#f59e0b" />
                <Text style={styles.statNumber}>{overall_performance.completed_lessons}</Text>
                <Text style={styles.statLabel}>درس مكتمل</Text>
              </View>
            </View>
          </View>

          {/* Categories Section */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="category" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>تحليل الأقسام</Text>
              </View>

              {categories.map((category, index) => (
                <PerformanceCard
                  key={`category-${category.id || index}`}
                  title={category.name}
                  percentage={category.percentage}
                  correctAnswers={category.correct_answers}
                  totalQuestions={category.total_questions}
                  color={colors.primary}
                  icon="category"
                  delay={index * 100}
                />
              ))}
            </View>
          )}

          {/* Lessons Section */}
          {lessons.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="school" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>تحليل الدروس</Text>
              </View>

              <View style={styles.lessonsContainer}>
                {lessons.map((lesson, index) => (
                  <LessonPerformanceRow
                    key={`lesson-${lesson.id || index}`}
                    lessonName={lesson.title}
                    categoryName={lesson.category_name}
                    percentage={lesson.percentage}
                    correctAnswers={lesson.correct_answers}
                    totalQuestions={lesson.total_questions}
                    color={colors.primary}
                    index={index}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Performance Comparison */}
          {comparison.has_recent_activity && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="trending-up" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>مقارنة التقدم</Text>
              </View>

              <View style={styles.comparisonCard}>
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>الأداء الكلي</Text>
                    <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                      {Math.round(comparison.overall_percentage)}%
                    </Text>
                    <Text style={styles.comparisonSubtext}>
                      {overall_performance.correct_answers}/{overall_performance.total_questions}
                    </Text>
                  </View>

                  <View style={styles.comparisonDivider} />

                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>آخر 7 أيام</Text>
                    <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                      {Math.round(comparison.recent_percentage)}%
                    </Text>
                    <Text style={styles.comparisonSubtext}>
                      {comparison.recent_questions} سؤال
                    </Text>
                  </View>
                </View>

                {Math.abs(comparison.improvement) > 2 && (
                  <View
                    style={[
                      styles.trendBadge,
                      {
                        backgroundColor:
                          comparison.improvement > 0 ? '#10b98120' : '#ef444420',
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={comparison.improvement > 0 ? 'trending-up' : 'trending-down'}
                      size={20}
                      color={comparison.improvement > 0 ? '#10b981' : '#ef4444'}
                    />
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color: comparison.improvement > 0 ? '#10b981' : '#ef4444',
                        },
                      ]}
                    >
                      {comparison.improvement > 0 ? 'تحسن' : 'انخفاض'} بنسبة{' '}
                      {Math.abs(Math.round(comparison.improvement))}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>توصيات ذكية</Text>
              </View>

              {recommendations.map((recommendation, index) => (
                <View
                  key={index}
                  style={[
                    styles.recommendationCard,
                    { borderLeftWidth: 4, borderLeftColor: recommendation.color },
                  ]}
                >
                  <View style={styles.recommendationHeader}>
                    <Text style={styles.recommendationIcon}>{recommendation.icon}</Text>
                    <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                  </View>
                  <Text style={styles.recommendationDescription}>
                    {recommendation.description}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.recommendationButton,
                      { backgroundColor: `${recommendation.color}20` },
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                    }}
                  >
                    <Text style={[styles.recommendationButtonText, { color: recommendation.color }]}>
                      {recommendation.action}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Bottom Padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  },
  headerSpacer: {
    width: 40,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  trackName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  circularProgressContainer: {
    marginBottom: 20,
  },
  levelBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  lessonsContainer: {
    marginTop: 8,
  },
  comparisonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  comparisonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  comparisonDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  recommendationDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  recommendationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  recommendationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

