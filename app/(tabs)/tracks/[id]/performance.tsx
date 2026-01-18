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
import { NestedRings } from '@/components/ui/NestedRings';
import { PerformanceCard } from '@/components/ui/PerformanceCard';
import { LessonPerformanceRow } from '@/components/ui/LessonPerformanceRow';
import { ShimmerCard, ShimmerRow, ShimmerCircle } from '@/components/ui/ShimmerLoader';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { hapticFeedback } from '@/utils/haptics';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Dimensions } from 'react-native';

interface PerformanceData {
  track: {
    id: number;
    code: string;
    name: string;
  };
  overall_performance: {
    percentage: number | null;
    n_questions: number;
    correct_answers: number;
    total_attempts: number;
    completed_lessons: number;
    source?: 'result' | 'readiness';
    readiness_label?: string;
    badge?: string;
    is_estimate?: boolean;
    reliability?: string;
    generated_at?: string;
    color?: string;
    // ✅ Coverage Data
    coverage_percentage?: number;
    analyzed_lessons_count?: number;
    total_lessons_count?: number;
    prepared_lessons_count?: number;
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
    percentage: number | null;
    correct_answers: number;
    n_questions: number;
    level: string;
    level_ar: string;
    color: string;
    is_estimate?: boolean;
    reliability?: string;
  }>;
  lessons: Array<{
    id: number;
    title: string;
    category_name: string;
    percentage: number | null;
    correct_answers: number;
    n_questions: number;
    level: string;
    level_ar: string;
    color: string;
    is_estimate?: boolean;
    reliability?: string;
    // ✅ Lesson Analysis Status
    is_analyzed?: boolean;
    questions_needed?: number;
  }>;
  comparison: {
    overall_percentage: number;
    recent_percentage: number;
    improvement: number;
    recent_questions: number;
    overall_questions?: number;
    has_recent_activity: boolean;
    is_pending?: boolean;
    missing_conditions?: Array<{
      type: string;
      message: string;
      progress: number;
      days_remaining?: number;
    }>;
    days_remaining?: number;
  };
  recommendations: Array<{
    type: string;
    icon: string;
    title: string;
    description: string;
    action: string;
    color: string;
    lesson_id?: number;
    category_id?: number;
  }>;
  chart_data?: {
    points: number[];
    labels: string[];
    max: number;
    min: number;
    trend: {
      direction: 'improving' | 'declining' | 'stable' | 'insufficient_data';
      improvement_rate: number;
      message: string;
    };
    insight: string;
    has_sufficient_data?: boolean;
    current_count?: number;
    required_count?: number;
  };
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

  // Helper Functions
  function getReliabilityInfo(reliability: string) {
    const reliabilityMap: Record<string, { label: string; message: string }> = {
      insufficient: {
        label: 'غير كافٍ',
        message: 'حل المزيد من الأسئلة للحصول على تقييم دقيق',
      },
      preliminary: {
        label: 'تقدير مبدئي',
        message: 'هذا تقدير مبدئي بناءً على عدد قليل من الأسئلة',
      },
      reliable: {
        label: 'موثوق',
        message: 'هذا تقييم موثوق بناءً على عدد كافٍ من الأسئلة',
      },
      high_confidence: {
        label: 'ثقة عالية',
        message: 'هذا تقييم دقيق بناءً على عدد كبير من الأسئلة',
      },
    };
    return reliabilityMap[reliability] || reliabilityMap.insufficient;
  }

  function formatTimeAgo(isoString: string): string {
    const now = new Date();
    const generated = new Date(isoString);
    const diffMinutes = Math.floor((now.getTime() - generated.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'الآن';
    if (diffMinutes < 60) return `قبل ${diffMinutes} دقيقة`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `قبل ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `قبل ${diffDays} يوم`;
  }

  // Empty State - مع fallback
  const overallCheck = {
    ...data.overall_performance,
    n_questions: data.overall_performance.n_questions ?? (data.overall_performance as any).total_questions ?? 0,
  };
  
  // ✅ فحص إذا كان هناك أي نشاط على الإطلاق:
  // - n_questions > 0 (من الدروس المحللة)
  // - prepared_lessons_count > 0 (دروس قيد التحضير)
  // - total_attempts > 0 (محاولات)
  // - source === 'readiness' (جاهزية تقديرية)
  const hasAnyActivity = overallCheck.n_questions > 0 
    || (overallCheck.prepared_lessons_count ?? 0) > 0 
    || (overallCheck.total_attempts ?? 0) > 0 
    || overallCheck.source === 'readiness';
  
  if (!hasAnyActivity) {
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
              لم تقم بحل أي أسئلة بعد. ابدأ بحل الاختبارات أو الدروس لنتمكن من تحليل أدائك
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
  
  // Fallback: التأكد من n_questions موجود (fallback من total_questions للتوافق مع API القديم)
  const overall = {
    ...overall_performance,
    n_questions: overall_performance.n_questions ?? (overall_performance as any).total_questions ?? 0,
  };
  
  const categoriesWithFallback = categories.map(cat => ({
    ...cat,
    n_questions: cat.n_questions ?? (cat as any).total_questions ?? 0,
  }));
  
  const lessonsWithFallback = lessons.map(lesson => ({
    ...lesson,
    n_questions: lesson.n_questions ?? (lesson as any).total_questions ?? 0,
  }));

  return (
    <GradientBackground colors={colors.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { flexDirection }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticFeedback.light();
              router.back();
            }}
          >
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { textAlign }]}>تحليل الأداء</Text>
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
              {/* ✅ Nested Rings: Performance (Outer) + Coverage (Inner) */}
              {overall.source !== 'readiness' && (
                <NestedRings
                  performancePercentage={overall.percentage}
                  coveragePercentage={overall.coverage_percentage ?? 0}
                  size={280}
                  outerStrokeWidth={18}
                  innerStrokeWidth={14}
                  performanceColor={overall.color || performance_level.color}
                  coverageColor={overall.color || performance_level.color}
                  showGlow={true}
                  coverageLabel="اكتمال التحليل"
                />
              )}
              
              {/* Readiness Display - إذا source === 'readiness' (مع Coverage) */}
              {overall.source === 'readiness' && (
                <View style={styles.readinessContainer}>
                  <NestedRings
                    performancePercentage={null}
                    coveragePercentage={overall.coverage_percentage ?? 0}
                    size={280}
                    outerStrokeWidth={18}
                    innerStrokeWidth={14}
                    performanceColor={overall.color || performance_level.color}
                    coverageColor={overall.color || performance_level.color}
                    showGlow={true}
                    centerLabel={overall.readiness_label || 'جاهزية تقديرية'}
                    coverageLabel="اكتمال التحليل"
                  />
                  <View style={[styles.readinessBadge, { backgroundColor: `${overall.color || performance_level.color}20`, marginTop: 16 }]}>
                    <Text style={[styles.readinessBadgeText, { color: overall.color || performance_level.color }]}>
                      {overall.badge || 'IRT Estimate'}
                    </Text>
                  </View>
                  <Text style={styles.readinessNote}>
                    تقدير مبني على بيانات سابقة
                  </Text>
                </View>
              )}
            </View>
            
            {/* ✅ Coverage Explanation Text */}
            {overall.analyzed_lessons_count !== undefined && overall.total_lessons_count !== undefined && (
              <View style={styles.coverageExplanationContainer}>
                <Text style={styles.coverageExplanationText}>
                  بناءً على {overall.analyzed_lessons_count} درس من أصل {overall.total_lessons_count} درس
                </Text>
                <Text style={styles.coverageExplanationSubtext}>
                  نحتاج 5 أسئلة لكل درس لرفع دقة التحليل
                </Text>
                {overall.prepared_lessons_count !== undefined && overall.prepared_lessons_count > 0 && (
                  <View style={styles.preparedLessonsContainer}>
                    <MaterialIcons name="hourglass-half" size={16} color="#FFC107" />
                    <Text style={styles.preparedLessonsText}>
                      {overall.prepared_lessons_count} درس قيد التحضير
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Level Badge - فقط إذا source !== 'readiness' */}
            {overall.source !== 'readiness' && (
              <View style={[styles.levelBadge, { backgroundColor: `${overall.color || performance_level.color}20` }]}>
                <Text style={[styles.levelText, { color: overall.color || performance_level.color }]}>
                  {performance_level.level_arabic}
                </Text>
              </View>
            )}

            {/* Readiness Badge - إذا source === 'readiness' (بدون level_arabic) */}
            {overall.source === 'readiness' && (
              <View style={[styles.levelBadge, { backgroundColor: `${overall.color || performance_level.color}20` }]}>
                <Text style={[styles.levelText, { color: overall.color || performance_level.color }]}>
                  {overall.badge || 'IRT Estimate'}
                </Text>
              </View>
            )}

            {/* Reliability Message - إذا is_estimate = true */}
            {overall.is_estimate && overall.reliability && (
              <View style={[
                styles.reliabilityContainer, 
                { 
                  [isRTL ? 'borderRightColor' : 'borderLeftColor']: overall.color || performance_level.color,
                  [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                  [isRTL ? 'borderLeftWidth' : 'borderRightWidth']: 0,
                }
              ]}>
                <Text style={[styles.reliabilityLabel, { color: overall.color || performance_level.color, textAlign }]}>
                  {getReliabilityInfo(overall.reliability).label}:
                </Text>
                <Text style={[styles.reliabilityMessage, { textAlign }]}>
                  {getReliabilityInfo(overall.reliability).message}
                </Text>
              </View>
            )}

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
                <Text style={styles.statNumber}>{overall.correct_answers}</Text>
                <Text style={styles.statLabel}>إجابة صحيحة</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="quiz" size={24} color={colors.primary} />
                <Text style={styles.statNumber}>{overall.n_questions}</Text>
                <Text style={styles.statLabel}>سؤال</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="assignment" size={24} color="#3b82f6" />
                <Text style={styles.statNumber}>{overall.total_attempts}</Text>
                <Text style={styles.statLabel}>محاولة</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statBox}>
                <MaterialIcons name="bookmark" size={24} color="#f59e0b" />
                <Text style={styles.statNumber}>{overall.completed_lessons}</Text>
                <Text style={styles.statLabel}>درس مكتمل</Text>
              </View>
            </View>

            {/* Last Updated */}
            {overall.generated_at && (
              <View style={[styles.lastUpdatedContainer, { flexDirection }]}>
                <MaterialIcons name="schedule" size={14} color="rgba(255, 255, 255, 0.5)" />
                <Text style={[styles.lastUpdatedText, { textAlign }]}>
                  آخر تحديث: {formatTimeAgo(overall.generated_at)}
                </Text>
              </View>
            )}
          </View>

          {/* رحلة التقدم Section - يظهر دائماً */}
          {data?.chart_data && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="trending-up" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>رحلة التقدم</Text>
              </View>
              
              {/* حالة كافية - تحليل كامل */}
              {data.chart_data.has_sufficient_data && data.chart_data.points.length >= 3 ? (
                <>
                  {/* الجملة التفسيرية */}
                  {data.chart_data.insight && (
                    <View style={[
                      styles.insightContainer,
                      {
                        backgroundColor: data.chart_data.trend.direction === 'improving' 
                          ? '#10b98120' 
                          : data.chart_data.trend.direction === 'declining' 
                          ? '#ef444420' 
                          : `${colors.primary}20`,
                        borderColor: data.chart_data.trend.direction === 'improving' 
                          ? '#10b981' 
                          : data.chart_data.trend.direction === 'declining' 
                          ? '#ef4444' 
                          : colors.primary,
                        [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                        flexDirection,
                      }
                    ]}>
                      <MaterialIcons
                        name={
                          data.chart_data.trend.direction === 'improving' ? 'trending-up' :
                          data.chart_data.trend.direction === 'declining' ? 'trending-down' :
                          'trending-flat'
                        }
                        size={20}
                        color={
                          data.chart_data.trend.direction === 'improving' ? '#10b981' :
                          data.chart_data.trend.direction === 'declining' ? '#ef4444' :
                          colors.primary
                        }
                      />
                      <Text style={[styles.insightText, { textAlign, flex: 1 }]}>
                        {data.chart_data.insight}
                      </Text>
                    </View>
                  )}
                  
                  {/* الرسم البياني البسيط */}
                  <View style={styles.chartContainer}>
                    <SimpleLineChart
                      data={data.chart_data.points}
                      labels={data.chart_data.labels}
                      color={colors.primary}
                      max={data.chart_data.max}
                      min={data.chart_data.min}
                    />
                  </View>
                </>
              ) : (
                <>
                  {/* حالة جمع البيانات */}
                  <View style={[
                    styles.insightContainer,
                    {
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary,
                      [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                      flexDirection,
                    }
                  ]}>
                    <MaterialIcons
                      name="hourglass-empty"
                      size={20}
                      color={colors.primary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.insightText, { textAlign, flex: 1, marginBottom: 8 }]}>
                        {data.chart_data.insight || 'نحن نجمع بياناتك حاليًا...'}
                      </Text>
                      {data.chart_data.current_count !== undefined && data.chart_data.required_count !== undefined && (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', textAlign }}>
                              التقدم
                            </Text>
                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700', textAlign }}>
                              {data.chart_data.current_count} / {data.chart_data.required_count} محاولات
                            </Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{
                              height: '100%',
                              width: `${Math.min(100, (data.chart_data.current_count / data.chart_data.required_count) * 100)}%`,
                              backgroundColor: colors.primary,
                              borderRadius: 4,
                            }} />
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  {/* الرسم البياني - يعرض البيانات الموجودة أو placeholder */}
                  {data.chart_data.points.length > 0 ? (
                    <View style={styles.chartContainer}>
                      <SimpleLineChart
                        data={data.chart_data.points}
                        labels={data.chart_data.labels}
                        color={colors.primary}
                        max={data.chart_data.max}
                        min={data.chart_data.min}
                        isPending={true}
                      />
                    </View>
                  ) : (
                    <View style={[styles.chartContainer, { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.2)', borderStyle: 'dashed', minHeight: 200, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📊</Text>
                      <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', fontWeight: '600', marginBottom: 4, textAlign: 'center' }}>
                        سيظهر رسمك البياني هنا
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                        ابدأ في حل الاختبارات والدروس لبناء رحلة تقدمك
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Categories Section */}
          {categoriesWithFallback
            .filter((category) => {
              return (
                category.percentage !== null &&
                category.n_questions > 0
              );
            })
            .length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="category" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>تحليل الأقسام</Text>
              </View>
              {categoriesWithFallback.filter(c => c.percentage !== null && c.n_questions > 0 && c.is_estimate).length > 0 && (
                <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40`, flexDirection }]}>
                  <MaterialIcons name="info-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoBannerText, { color: colors.primary, textAlign }]}>
                    بعض الأقسام تعرض تقديرات مبدئية. حل المزيد من الأسئلة للحصول على تحليل دقيق
                  </Text>
                </View>
              )}

              {categoriesWithFallback
                .filter((category) => {
                  return (
                    category.percentage !== null &&
                    category.n_questions > 0
                  );
                })
                .map((category, index) => (
                  <PerformanceCard
                    key={`category-${category.id || index}`}
                    title={category.name}
                    percentage={category.percentage}
                    correctAnswers={category.correct_answers}
                    totalQuestions={category.n_questions}
                    color={colors.primary}
                    icon="category"
                    delay={index * 100}
                    isEstimate={category.is_estimate}
                    reliability={category.reliability}
                    level_ar={category.level_ar}
                    level_color={category.color}
                  />
                ))}
            </View>
          )}

          {/* Lessons Section */}
          {lessonsWithFallback
            .filter((lesson) => {
              return (
                lesson.percentage !== null &&
                lesson.n_questions > 0
              );
            })
            .length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="school" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>تحليل الدروس</Text>
              </View>
              {lessonsWithFallback.filter(l => l.percentage !== null && l.n_questions > 0 && l.is_estimate).length > 0 && (
                <View style={[styles.infoBanner, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40`, flexDirection }]}>
                  <MaterialIcons name="info-outline" size={16} color={colors.primary} />
                  <Text style={[styles.infoBannerText, { color: colors.primary, textAlign }]}>
                    بعض الدروس تعرض تقديرات مبدئية. حل المزيد من الأسئلة للحصول على تحليل دقيق
                  </Text>
                </View>
              )}

              <View style={styles.lessonsContainer}>
                {lessonsWithFallback
                  .filter((lesson) => {
                    return (
                      lesson.percentage !== null &&
                      lesson.n_questions > 0
                    );
                  })
                  .map((lesson, index) => (
                    <LessonPerformanceRow
                      key={`lesson-${lesson.id || index}`}
                      lessonName={lesson.title}
                      categoryName={lesson.category_name}
                      percentage={lesson.percentage ?? null}
                      correctAnswers={lesson.correct_answers}
                      totalQuestions={lesson.n_questions}
                      color={lesson.color || colors.primary}
                      index={index}
                      is_analyzed={lesson.is_analyzed ?? true}
                      questions_needed={lesson.questions_needed ?? 0}
                      level_ar={lesson.level_ar}
                    />
                  ))}
              </View>
            </View>
          )}

          {/* Performance Comparison */}
          <View style={styles.section}>
            <View style={{ marginBottom: 16 }}>
              <View style={[styles.sectionHeader, { flexDirection, marginBottom: 4 }]}>
                <MaterialIcons name={comparison.has_recent_activity ? "trending-up" : "hourglass-empty"} size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                  {comparison.has_recent_activity ? 'مقارنة تقدمك' : 'مقارنة تقدمك - قريباً'}
                </Text>
              </View>
              <Text style={[styles.comparisonSubtext, { textAlign, paddingHorizontal: 36, fontSize: 12 }]}>
                {comparison.has_recent_activity 
                  ? 'أداؤك في آخر 7 أيام مقارنة بالإجمالي'
                  : 'نحتاج مدة أطول لجمع بياناتك بشكل كافٍ'}
              </Text>
            </View>

            {comparison.has_recent_activity ? (
              <View style={styles.comparisonCard}>
                <View style={[styles.comparisonRow, { flexDirection }]}>
                  <View style={styles.comparisonItem}>
                    <Text style={[styles.comparisonLabel, { textAlign }]}>منذ البدء</Text>
                    <Text style={[styles.comparisonValue, { color: colors.primary, textAlign }]}>
                      {Math.round(comparison.overall_percentage)}%
                    </Text>
                    <Text style={[styles.comparisonSubtext, { textAlign }]}>
                      {comparison.overall_questions || overall.n_questions} سؤال
                    </Text>
                  </View>

                  <View style={styles.comparisonDivider} />

                  <View style={styles.comparisonItem}>
                    <Text style={[styles.comparisonLabel, { textAlign }]}>آخر 7 أيام</Text>
                    <Text style={[styles.comparisonValue, { color: colors.primary, textAlign }]}>
                      {Math.round(comparison.recent_percentage)}%
                    </Text>
                    <Text style={[styles.comparisonSubtext, { textAlign }]}>
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
                        flexDirection,
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
                          textAlign,
                          marginLeft: isRTL ? 0 : 8,
                          marginRight: isRTL ? 8 : 0,
                        },
                      ]}
                    >
                      {comparison.improvement > 0 ? 'تحسن' : 'انخفاض'} بنسبة{' '}
                      {Math.abs(Math.round(comparison.improvement))}%
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.pendingComparisonCard}>
                <View style={[styles.pendingContent, { flexDirection }]}>
                  <View style={[styles.pendingIconContainer, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}60` }]}>
                    <MaterialIcons name="hourglass-empty" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {comparison.missing_conditions && comparison.missing_conditions.length > 0 ? (
                      <>
                        {comparison.missing_conditions.map((condition, conditionIndex) => (
                          <View key={conditionIndex} style={{ marginBottom: conditionIndex < comparison.missing_conditions!.length - 1 ? 12 : 0 }}>
                            <Text style={[styles.pendingMessage, { textAlign, color: '#FFFFFF' }]}>
                              {condition.message}
                            </Text>
                            {condition.progress !== undefined && (
                              <View style={styles.pendingProgressContainer}>
                                <View style={styles.pendingProgressBar}>
                                  <View
                                    style={[
                                      styles.pendingProgressFill,
                                      {
                                        width: `${Math.min(condition.progress, 100)}%`,
                                        backgroundColor: colors.primary,
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={[styles.pendingProgressText, { textAlign, color: 'rgba(255,255,255,0.6)' }]}>
                                  التقدم: {condition.progress}%
                                </Text>
                              </View>
                            )}
                            {condition.days_remaining !== undefined && condition.days_remaining !== null && condition.days_remaining > 0 && (
                              <View style={[styles.pendingDaysContainer, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40`, flexDirection }]}>
                                <MaterialIcons name="calendar-today" size={16} color={colors.primary} />
                                <Text style={[styles.pendingDaysText, { color: colors.primary, textAlign }]}>
                                  متوقع خلال {Math.round(condition.days_remaining)} يوم{Math.round(condition.days_remaining) > 1 ? '' : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </>
                    ) : (
                      <Text style={[styles.pendingMessage, { textAlign, color: 'rgba(255,255,255,0.8)' }]}>
                        نحتاج مدة أطول لجمع بياناتك بشكل كافٍ لعرض مقارنة دقيقة لتقدمك
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <View style={styles.section}>
              <View style={[styles.sectionHeader, { flexDirection }]}>
                <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
                <Text style={[styles.sectionTitle, { textAlign, marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>توصيات ذكية</Text>
              </View>

              {recommendations.map((recommendation, index) => (
                <View
                  key={index}
                  style={[
                    styles.recommendationCard,
                    { 
                      [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 4,
                      [isRTL ? 'borderRightColor' : 'borderLeftColor']: recommendation.color,
                    },
                  ]}
                >
                  <View style={[styles.recommendationHeader, { flexDirection }]}>
                    <Text style={[styles.recommendationIcon, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>{recommendation.icon}</Text>
                    <Text style={[styles.recommendationTitle, { textAlign, flex: 1 }]}>{recommendation.title}</Text>
                  </View>
                  <Text style={[styles.recommendationDescription, { textAlign }]}>
                    {recommendation.description}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.recommendationButton,
                      { backgroundColor: `${recommendation.color}20`, alignSelf: isRTL ? 'flex-start' : 'flex-end' },
                    ]}
                    onPress={() => {
                      hapticFeedback.light();
                      
                      if (recommendation.type === 'urgent') {
                        // توصية قسم → صفحة الدروس (يمكن إضافة فلترة حسب category_id لاحقاً)
                        router.push(`/(tabs)/tracks/${id}/lessons`);
                      } else if (recommendation.type === 'improvement' || recommendation.type === 'excellent') {
                        // توصية درس → فتح الدرس
                        if (recommendation.lesson_id) {
                          router.push(`/lessons/${recommendation.lesson_id}`);
                        } else {
                          router.push(`/(tabs)/tracks/${id}/lessons`);
                        }
                      } else if (recommendation.type === 'start') {
                        // "ابدأ" → صفحة track dashboard (التي فيها assessments section)
                        router.push(`/(tabs)/tracks/${id}`);
                      }
                    }}
                  >
                    <Text style={[styles.recommendationButtonText, { color: recommendation.color, textAlign }]}>
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
  coverageExplanationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    maxWidth: 320,
  },
  coverageExplanationText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 6,
    textAlign: 'center',
  },
  coverageExplanationSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  preparedLessonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preparedLessonsText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
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
  readinessContainer: {
    alignItems: 'center',
    width: '100%',
  },
  readinessLabel: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  readinessBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  readinessBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  readinessNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  reliabilityContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  reliabilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  reliabilityMessage: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  pendingComparisonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pendingContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  pendingIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  pendingMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  pendingProgressContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  pendingProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  pendingProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  pendingProgressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  pendingDaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  pendingDaysText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  insightText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
    fontWeight: '500',
    flex: 1,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
});

// Simple Line Chart Component
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 96; // padding
const CHART_HEIGHT = 200;
const CHART_PADDING = 20;

function SimpleLineChart({ data, labels, color, max, min, isPending = false }: {
  data: number[];
  labels: string[];
  color: string;
  max: number;
  min: number;
  isPending?: boolean;
}) {
  if (data.length === 0) return null;

  const chartWidth = CHART_WIDTH - CHART_PADDING * 2;
  const chartHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const range = max - min || 1;
  
  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * chartWidth;
    const y = chartHeight - ((value - min) / range) * chartHeight;
    return { x, y, value };
  });

  // Create path for line
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  // Area path (for fill)
  const areaPath = `${path} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = CHART_PADDING + ratio * chartHeight;
          return (
            <Line
              key={ratio}
              x1={CHART_PADDING}
              y1={y}
              x2={CHART_PADDING + chartWidth}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <Path
          d={areaPath}
          fill={color}
          fillOpacity="0.15"
          transform={`translate(${CHART_PADDING}, ${CHART_PADDING})`}
        />

        {/* Line */}
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={isPending ? "8 4" : undefined}
          strokeDashoffset={isPending ? "0" : undefined}
          strokeOpacity={isPending ? 0.6 : 1}
          transform={`translate(${CHART_PADDING}, ${CHART_PADDING})`}
        />

        {/* Points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={CHART_PADDING + point.x}
            cy={CHART_PADDING + point.y}
            r="5"
            fill={color}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}
      </Svg>
      
      {/* Labels as Text */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: CHART_WIDTH, marginTop: 8 }}>
        {labels.map((label, index) => (
          <Text key={index} style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', flex: 1 }}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}