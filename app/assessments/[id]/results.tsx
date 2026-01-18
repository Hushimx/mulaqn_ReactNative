import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
  BounceIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface AssessmentResult {
  attempt_id: number;
  assessment_id: number;
  assessment_name: string;
  track_id: number;
  raw_score: number;
  score_total: number;
  percentage: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  time_taken_min: number;
  lessons_breakdown?: Array<{
    lesson_name: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
}

// Circular Progress Component
const CircularProgress = ({ 
  percentage, 
  size = 200, 
  strokeWidth = 12, 
  color = '#10B981',
  animated = true 
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number; 
  color?: string;
  animated?: boolean;
}) => {
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      // Animate the displayed percentage
      const startTime = Date.now();
      const duration = 1500;
      const startValue = 0;
      const endValue = percentage;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = startValue + (endValue - startValue) * progress;
        setDisplayPercentage(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayPercentage(endValue);
        }
      };
      
      setTimeout(() => animate(), 500);
    } else {
      setDisplayPercentage(percentage);
    }
  }, [percentage, animated]);

  const currentPercentage = animated ? displayPercentage : percentage;
  const strokeDashoffset = circumference * (1 - currentPercentage / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.Text
          entering={FadeIn.delay(1000).duration(500)}
          style={[styles.progressPercentage, { color }]}
        >
          {currentPercentage.toFixed(0)}%
        </Animated.Text>
      </View>
    </View>
  );
};

// Confetti Effect Component
const Confetti = () => {
  const confettiItems = Array.from({ length: 30 }, (_, i) => i);
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#D4AF37'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {confettiItems.map((item) => {
        const delay = Math.random() * 1000;
        const duration = 2000 + Math.random() * 1000;
        const left = Math.random() * width;
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        return (
          <Animated.View
            key={item}
            entering={FadeIn.delay(delay).duration(300)}
            style={{
              position: 'absolute',
              left,
              top: -20,
              width: 12,
              height: 12,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
};

// Motivational Message Component
const MotivationalMessage = ({ percentage }: { percentage: number }) => {
  const messages = {
    excellent: [
      { emoji: '🏆', text: 'أداء استثنائي! أنت على الطريق الصحيح' },
      { emoji: '⭐', text: 'ممتاز! استمر في التميز' },
      { emoji: '🎯', text: 'إنجاز رائع! أنت محترف' },
    ],
    good: [
      { emoji: '💪', text: 'أداء جيد! استمر في التقدم' },
      { emoji: '📈', text: 'تحسن ملحوظ! أنت في الطريق الصحيح' },
      { emoji: '🔥', text: 'مجهود رائع! استمر' },
    ],
    needsImprovement: [
      { emoji: '💪', text: 'لا تستسلم! كل خطوة مهمة' },
      { emoji: '📚', text: 'استمر في التعلم والتطوير' },
      { emoji: '🎓', text: 'الممارسة تصنع الفرق' },
    ],
  };

  let category: keyof typeof messages;
  if (percentage >= 80) {
    category = 'excellent';
  } else if (percentage >= 50) {
    category = 'good';
  } else {
    category = 'needsImprovement';
  }

  const message = messages[category][Math.floor(Math.random() * messages[category].length)];

  return (
    <Animated.View
      entering={FadeInDown.delay(800).duration(600)}
      style={styles.motivationalCard}
    >
      <Text style={styles.motivationalEmoji}>{message.emoji}</Text>
      <Text style={styles.motivationalText}>{message.text}</Text>
    </Animated.View>
  );
};

export default function AssessmentResultsScreen() {
  const { t } = useTranslation();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const router = useRouter();
  const { id, attemptId } = useLocalSearchParams<{ id: string; attemptId: string }>();
  
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      const response = await api.get<{ ok: boolean; data: any }>(
        `/assessment-attempts/${attemptId}`
      );
      
      if (response && response.ok && response.data) {
        const attemptData = response.data;
        
        const resultData: AssessmentResult = {
          attempt_id: attemptData.id,
          assessment_id: attemptData.assessment.id,
          assessment_name: attemptData.assessment.name,
          track_id: attemptData.assessment.track?.id || attemptData.assessment?.track_id || 1,
          raw_score: attemptData.raw_score || 0,
          score_total: attemptData.score_total || attemptData.assessment.items?.length || 0,
          percentage: attemptData.score_total > 0 
            ? Math.round((attemptData.raw_score / attemptData.score_total) * 100 * 10) / 10
            : 0,
          correct_count: attemptData.responses?.filter((r: any) => r.is_correct).length || 0,
          incorrect_count: attemptData.responses?.filter((r: any) => !r.is_correct && r.selected_option_id).length || 0,
          unanswered_count: (attemptData.assessment.items?.length || 0) - (attemptData.responses?.length || 0),
          time_taken_min: attemptData.time_spent_sec 
            ? Math.round(attemptData.time_spent_sec / 60) 
            : 0,
          lessons_breakdown: attemptData.breakdown || [],
        };
        
        setResult(resultData);
        
        // Show confetti if passed
        if (resultData.percentage >= 50) {
          setShowConfetti(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/assessments/${id}/review?attemptId=${attemptId}`);
  };

  const handleHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/' as any);
  };

  if (loading || !result) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>جاري تحميل النتائج...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const trackColors = getTrackColors(result.track_id);
  const isPassed = result.percentage >= 50;
  const progressColor = isPassed ? '#10B981' : result.percentage >= 40 ? '#F59E0B' : '#EF4444';

  // Calculate lesson that needs review based on most incorrect answers
  const getLessonNeedingReview = () => {
    if (!result.lessons_breakdown || result.lessons_breakdown.length === 0) {
      return null;
    }

    // Only suggest if there are incorrect answers
    if (result.incorrect_count === 0) {
      return null;
    }

    // Find lesson with most incorrect answers (lowest correct count relative to total)
    // Calculate incorrect count for each lesson
    const lessonsWithErrors = result.lessons_breakdown
      .map(lesson => ({
        ...lesson,
        incorrect: lesson.total - lesson.correct,
        errorRate: lesson.total > 0 ? (lesson.total - lesson.correct) / lesson.total : 0,
      }))
      .filter(lesson => lesson.incorrect > 0);

    if (lessonsWithErrors.length === 0) {
      return null;
    }

    // Find lesson with highest error rate (most needs review)
    const worstLesson = lessonsWithErrors.reduce((worst, current) => {
      if (!worst || current.errorRate > worst.errorRate) {
        return current;
      }
      // If same error rate, prefer one with more total incorrect
      if (current.errorRate === worst.errorRate && current.incorrect > worst.incorrect) {
        return current;
      }
      return worst;
    });

    return worstLesson;
  };

  const lessonNeedingReview = getLessonNeedingReview();

  return (
    <GradientBackground colors={trackColors.gradient}>
      <StatusBar barStyle="light-content" />
      {showConfetti && <Confetti />}
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success/Result Icon with Animation */}
          <Animated.View
            entering={ZoomIn.duration(600).springify()}
            style={styles.iconContainer}
          >
            <View style={[
              styles.successIconContainer,
              { 
                borderColor: progressColor,
                backgroundColor: `${progressColor}15`,
              }
            ]}>
              {isPassed ? (
                <Animated.View entering={BounceIn.delay(300).duration(800)}>
                  <MaterialIcons name="check-circle" size={100} color={progressColor} />
                </Animated.View>
              ) : (
                <Animated.View entering={ZoomIn.delay(300).duration(600)}>
                  <MaterialIcons name="trending-up" size={100} color={progressColor} />
                </Animated.View>
              )}
            </View>
          </Animated.View>

          {/* Result Title with Animation */}
          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <Text style={styles.resultTitle}>
              {isPassed ? '🎉 مبروك! لقد نجحت' : '💪 استمر في المحاولة'}
            </Text>
            <Text style={styles.resultSubtitle}>{result.assessment_name}</Text>
          </Animated.View>

          {/* Main Score Card with Circular Progress */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(600)}
            style={styles.scoreCardContainer}
          >
            <View style={[styles.scoreCard, { borderColor: progressColor }]}>
              <LinearGradient
                colors={[`${progressColor}20`, `${progressColor}05`]}
                style={styles.scoreCardGradient}
              >
                <View style={styles.scoreContent}>
                  <CircularProgress
                    percentage={result.percentage}
                    size={180}
                    strokeWidth={14}
                    color={progressColor}
                    animated={true}
                  />
                  
                  <View style={styles.scoreDetails}>
                    <Text style={styles.scoreLabel}>درجتك النهائية</Text>
                    <Text style={[styles.scoreValue, { color: progressColor }]}>
                      {result.raw_score} / {result.score_total}
                    </Text>
                    <View style={[styles.scoreBadge, { backgroundColor: `${progressColor}20` }]}>
                      <Text style={[styles.scoreBadgeText, { color: progressColor }]}>
                        {result.percentage >= 80 ? 'ممتاز' : 
                         result.percentage >= 60 ? 'جيد جداً' : 
                         result.percentage >= 50 ? 'مقبول' : 'يحتاج تحسين'}
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Motivational Message */}
          <MotivationalMessage percentage={result.percentage} />

          {/* Statistics Grid with Animations */}
          <Animated.View
            entering={FadeInUp.delay(600).duration(600)}
            style={styles.statsGrid}
          >
            {/* Correct Answers Card */}
            <Animated.View
              entering={FadeInDown.delay(700).duration(500)}
              style={styles.statCardWrapper}
            >
              <LinearGradient
                colors={['#10B98115', '#10B98105', 'transparent']}
                style={[styles.statCard, { borderColor: '#10B981' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={[styles.statIconContainer, { 
                    backgroundColor: '#10B981',
                    shadowColor: '#10B981',
                  }]}>
                    <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>
                      {result.correct_count}
                    </Text>
                    <Text style={styles.statLabel}>إجابة صحيحة</Text>
                  </View>
                </View>
                <View style={[styles.statCardGlow, { backgroundColor: '#10B98120' }]} />
              </LinearGradient>
            </Animated.View>

            {/* Wrong Answers Card */}
            <Animated.View
              entering={FadeInDown.delay(750).duration(500)}
              style={styles.statCardWrapper}
            >
              <LinearGradient
                colors={['#EF444415', '#EF444405', 'transparent']}
                style={[styles.statCard, { borderColor: '#EF4444' }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.statCardContent}>
                  <View style={[styles.statIconContainer, { 
                    backgroundColor: '#EF4444',
                    shadowColor: '#EF4444',
                  }]}>
                    <MaterialIcons name="cancel" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>
                      {result.incorrect_count}
                    </Text>
                    <Text style={styles.statLabel}>إجابة خاطئة</Text>
                  </View>
                </View>
                <View style={[styles.statCardGlow, { backgroundColor: '#EF444420' }]} />
              </LinearGradient>
            </Animated.View>

            {/* Lesson Needing Review Card - Only show if there are incorrect answers */}
            {result.incorrect_count > 0 && lessonNeedingReview ? (
              <Animated.View
                entering={FadeInDown.delay(800).duration(500)}
                style={styles.statCardWrapper}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Navigate to lessons page
                    router.push(`/(tabs)/tracks/${result.track_id}/lessons` as any);
                  }}
                >
                  <LinearGradient
                    colors={['#8B5CF615', '#8B5CF605', 'transparent']}
                    style={[styles.statCard, { borderColor: '#8B5CF6' }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.statCardContent}>
                      <View style={[styles.statIconContainer, { 
                        backgroundColor: '#8B5CF6',
                        shadowColor: '#8B5CF6',
                      }]}>
                        <MaterialIcons name="book" size={32} color="#FFFFFF" />
                      </View>
                      <View style={styles.statTextContainer}>
                        <Text style={[styles.statValue, { color: '#8B5CF6', fontSize: 24 }]} numberOfLines={2}>
                          {lessonNeedingReview.lesson_name.length > 18 
                            ? lessonNeedingReview.lesson_name.substring(0, 18) + '...' 
                            : lessonNeedingReview.lesson_name}
                        </Text>
                        <Text style={styles.statLabel}>درس يحتاج مراجعة</Text>
                        <Text style={[styles.statSubLabel, { color: '#F59E0B' }]}>
                          {lessonNeedingReview.incorrect} خطأ من {lessonNeedingReview.total}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statCardGlow, { backgroundColor: '#8B5CF620' }]} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ) : result.incorrect_count === 0 ? (
              <Animated.View
                entering={FadeInDown.delay(800).duration(500)}
                style={styles.statCardWrapper}
              >
                <LinearGradient
                  colors={['#10B98115', '#10B98105', 'transparent']}
                  style={[styles.statCard, { borderColor: '#10B981' }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.statCardContent}>
                    <View style={[styles.statIconContainer, { 
                      backgroundColor: '#10B981',
                      shadowColor: '#10B981',
                    }]}>
                      <MaterialIcons name="check-circle" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.statValue, { color: '#10B981', fontSize: 24 }]}>
                        ممتاز
                      </Text>
                      <Text style={styles.statLabel}>أداء رائع!</Text>
                      <Text style={[styles.statSubLabel, { color: '#10B981' }]}>
                        لا توجد أخطاء
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statCardGlow, { backgroundColor: '#10B98120' }]} />
                </LinearGradient>
              </Animated.View>
            ) : null}
          </Animated.View>

          {/* Lessons Breakdown */}
          {result.lessons_breakdown && result.lessons_breakdown.length > 0 && (
            <Animated.View entering={FadeInUp.delay(900).duration(600)}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="analytics" size={24} color="#FFFFFF" />
                <Text style={styles.sectionTitle}>تحليل الأداء حسب الدروس</Text>
              </View>
              
              <View style={styles.skillsList}>
                {result.lessons_breakdown.map((lesson, index) => (
                  <Animated.View
                    key={index}
                    entering={FadeInDown.delay(1000 + index * 100).duration(500)}
                    style={styles.skillCard}
                  >
                    <View style={[styles.skillHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.skillName} numberOfLines={1}>
                        {lesson.lesson_name}
                      </Text>
                      <View style={[styles.skillPercentageBadge, {
                        backgroundColor: lesson.percentage >= 70 ? '#10B98120' : 
                                         lesson.percentage >= 50 ? '#F59E0B20' : '#EF444420'
                      }]}>
                        <Text style={[styles.skillPercentage, {
                          color: lesson.percentage >= 70 ? '#10B981' : 
                                 lesson.percentage >= 50 ? '#F59E0B' : '#EF4444'
                        }]}>
                          {lesson.percentage.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.skillProgressBar}>
                      <Animated.View
                        entering={FadeInDown.delay(1200 + index * 100).duration(800)}
                        style={[
                          styles.skillProgressFill,
                          {
                            width: `${lesson.percentage}%`,
                            backgroundColor: lesson.percentage >= 70 ? '#10B981' : 
                                           lesson.percentage >= 50 ? '#F59E0B' : '#EF4444',
                          }
                        ]}
                      />
                    </View>
                    
                    <Text style={styles.skillDetails}>
                      {lesson.correct} صحيحة من {lesson.total} سؤال
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <Animated.View
            entering={FadeInUp.delay(1100).duration(600)}
            style={styles.actionsContainer}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: trackColors.primary }]}
              onPress={handleReview}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[trackColors.primary, `${trackColors.primary}DD`]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="rate-review" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>مراجعة الإجابات</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleHome}
              activeOpacity={0.8}
            >
              <MaterialIcons name="home" size={22} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>العودة للرئيسية</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.bottomSpacing} />
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
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  successIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  resultSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  scoreCardContainer: {
    marginBottom: 24,
  },
  scoreCard: {
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  scoreCardGradient: {
    padding: 32,
  },
  scoreContent: {
    alignItems: 'center',
    gap: 24,
  },
  progressPercentage: {
    fontSize: 42,
    fontWeight: '800',
  },
  scoreDetails: {
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scoreBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  motivationalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  motivationalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  motivationalText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 32,
  },
  statCardWrapper: {
    flex: 1,
    minWidth: '47%',
  },
  statCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statCardContent: {
    alignItems: 'center',
    gap: 16,
    zIndex: 2,
  },
  statIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  statTextContainer: {
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statSubLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
  statCardGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.3,
    zIndex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  skillsList: {
    gap: 16,
    marginBottom: 24,
  },
  skillCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  skillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  skillPercentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skillPercentage: {
    fontSize: 15,
    fontWeight: '700',
  },
  skillProgressBar: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  skillProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  skillDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 14,
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomSpacing: {
    height: 40,
  },
});
