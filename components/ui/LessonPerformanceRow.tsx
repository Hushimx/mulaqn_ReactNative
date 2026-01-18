import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';

interface LessonPerformanceRowProps {
  lessonName: string;
  categoryName: string;
  percentage: number | null;
  correctAnswers: number;
  totalQuestions: number;
  color: string;
  index: number;
  // ✅ Lesson Analysis Status
  is_analyzed?: boolean;
  questions_needed?: number;
  level_ar?: string;
}

export function LessonPerformanceRow({
  lessonName,
  categoryName,
  percentage,
  correctAnswers,
  totalQuestions,
  color,
  index,
  is_analyzed = true,
  questions_needed = 0,
  level_ar,
}: LessonPerformanceRowProps) {
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const progress = useSharedValue(0);
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);
  
  // ✅ تحديد اللون حسب is_analyzed
  const displayColor = is_analyzed ? color : '#FFC107';
  const displayPercentage = percentage ?? 0;

  useEffect(() => {
    const delay = index * 100; // Stagger animation

    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));

    progress.value = withDelay(
      delay + 200,
      withTiming(displayPercentage, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [displayPercentage, index]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 100], [0, 100]);

    return {
      width: `${width}%`,
    };
  });

  // ✅ Progress bar style للتحضير (X/5 أسئلة)
  const preparationProgressStyle = useAnimatedStyle(() => {
    const width = (totalQuestions / 5) * 100;
    return {
      width: `${Math.min(width, 100)}%`,
    };
  });

  const getPerformanceLevel = (perc: number | null) => {
    if (perc === null) return { text: 'قيد التحضير', emoji: '⏳', color: '#FFC107' };
    if (perc >= 90) return { text: 'ممتاز', emoji: '🌟', color: '#10b981' };
    if (perc >= 75) return { text: 'جيد جداً', emoji: '✨', color: '#3b82f6' };
    if (perc >= 60) return { text: 'جيد', emoji: '👍', color: '#f59e0b' };
    if (perc >= 50) return { text: 'مقبول', emoji: '📈', color: '#ef4444' };
    return { text: 'يحتاج تحسين', emoji: '📚', color: '#dc2626' };
  };

  const level = level_ar 
    ? { text: level_ar, emoji: '📊', color: displayColor }
    : getPerformanceLevel(percentage);

  return (
    <Animated.View style={[
      styles.row, 
      rowStyle,
      !is_analyzed && { borderColor: '#FFC10750', borderRightWidth: isRTL ? 4 : 0, borderLeftWidth: isRTL ? 0 : 4 }
    ]}>
      <View style={styles.content}>
        {/* Lesson Info */}
        <View style={[styles.header, { flexDirection }]}>
          <View style={[styles.textContainer, { marginEnd: isRTL ? 12 : 0, marginStart: isRTL ? 0 : 12, flex: 1 }]}>
            <Text style={[styles.lessonName, { textAlign }]} numberOfLines={1}>
              {lessonName}
            </Text>
            <Text style={[styles.categoryName, { textAlign }]} numberOfLines={1}>
              {categoryName}
            </Text>
            <Text style={[styles.score, { textAlign, marginTop: 6 }]}>
              <MaterialIcons name="check-circle" size={12} color="#10b981" /> {correctAnswers}/{totalQuestions} سؤال
            </Text>
            
            {/* ✅ عرض حالة "قيد التحضير" للدروس غير المحللة */}
            {!is_analyzed && totalQuestions > 0 && (
              <View style={[styles.preparationContainer, { marginTop: 12 }]}>
                <View style={[styles.preparationHeader, { flexDirection }]}>
                  <MaterialIcons name="hourglass-half" size={14} color="#FFC107" />
                  <Text style={styles.preparationLabel}>قيد التحضير</Text>
                </View>
                <Text style={[styles.preparationText, { textAlign }]}>
                  أجب على <Text style={{ color: '#FFC107', fontWeight: '700' }}>{questions_needed} سؤال</Text> إضافي لإكمال التحليل
                </Text>
                {/* Progress Bar للتحضير (X/5) */}
                <View style={styles.preparationProgressContainer}>
                  <View style={styles.preparationProgressBackground}>
                    <Animated.View
                      style={[
                        styles.preparationProgressFill,
                        preparationProgressStyle,
                      ]}
                    />
                  </View>
                  <Text style={styles.preparationProgressText}>
                    {totalQuestions} / 5 أسئلة
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.statsContainer, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
            <View style={[styles.levelBadge, { backgroundColor: `${displayColor}20`, flexDirection }]}>
              <Text style={styles.levelEmoji}>{level.emoji}</Text>
              <Text style={[styles.levelText, { color: displayColor, marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }]}>
                {level.text}
              </Text>
            </View>
            
            <View style={styles.scoreContainer}>
              {percentage !== null ? (
                <>
                  <Text style={[styles.percentage, { color: displayColor, textAlign, opacity: is_analyzed ? 1 : 0.7 }]}>
                    {Math.round(percentage)}%
                  </Text>
                </>
              ) : (
                <Text style={[styles.percentage, { color: displayColor, textAlign, opacity: 0.7 }]}>
                  -
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Progress Bar (للأداء - فقط للدروس المحللة) */}
        {percentage !== null && is_analyzed && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: displayColor },
                  progressBarStyle,
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
  },
  lessonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  levelEmoji: {
    fontSize: 14,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  percentage: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  score: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  // ✅ Preparation Status Styles
  preparationContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderRightWidth: 3,
  },
  preparationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  preparationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFC107',
  },
  preparationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    lineHeight: 18,
  },
  preparationProgressContainer: {
    marginTop: 4,
  },
  preparationProgressBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  preparationProgressFill: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 3,
  },
  preparationProgressText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'left',
  },
});

