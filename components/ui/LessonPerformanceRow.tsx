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

interface LessonPerformanceRowProps {
  lessonName: string;
  categoryName: string;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  color: string;
  index: number;
}

export function LessonPerformanceRow({
  lessonName,
  categoryName,
  percentage,
  correctAnswers,
  totalQuestions,
  color,
  index,
}: LessonPerformanceRowProps) {
  const progress = useSharedValue(0);
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

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
      withTiming(percentage, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [percentage, index]);

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

  const getPerformanceLevel = (perc: number) => {
    if (perc >= 90) return { text: 'ممتاز', emoji: '🌟', color: '#10b981' };
    if (perc >= 75) return { text: 'جيد جداً', emoji: '✨', color: '#3b82f6' };
    if (perc >= 60) return { text: 'جيد', emoji: '👍', color: '#f59e0b' };
    if (perc >= 50) return { text: 'مقبول', emoji: '📈', color: '#ef4444' };
    return { text: 'يحتاج تحسين', emoji: '📚', color: '#dc2626' };
  };

  const level = getPerformanceLevel(percentage);

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={styles.content}>
        {/* Lesson Info */}
        <View style={styles.header}>
          <View style={styles.textContainer}>
            <Text style={styles.lessonName} numberOfLines={1}>
              {lessonName}
            </Text>
            <Text style={styles.categoryName} numberOfLines={1}>
              {categoryName}
            </Text>
          </View>

          <View style={styles.statsContainer}>
            <View style={[styles.levelBadge, { backgroundColor: `${level.color}20` }]}>
              <Text style={styles.levelEmoji}>{level.emoji}</Text>
              <Text style={[styles.levelText, { color: level.color }]}>
                {level.text}
              </Text>
            </View>
            
            <View style={styles.scoreContainer}>
              <Text style={[styles.percentage, { color }]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={styles.score}>
                {correctAnswers}/{totalQuestions}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: color },
                progressBarStyle,
              ]}
            />
          </View>
        </View>
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
    marginEnd: 12,
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
    marginRight: 4,
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
});

