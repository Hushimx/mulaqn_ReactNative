import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface PerformanceCardProps {
  title: string;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  color: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  delay?: number;
}

export function PerformanceCard({
  title,
  percentage,
  correctAnswers,
  totalQuestions,
  color,
  icon = 'analytics',
  delay = 0,
}: PerformanceCardProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    scale.value = withDelay(
      delay,
      withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      })
    );
    
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400 })
    );

    // Progress bar animation
    progress.value = withDelay(
      delay + 200,
      withTiming(percentage, {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [percentage, delay]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressBarStyle = useAnimatedStyle(() => {
    const width = interpolate(
      progress.value,
      [0, 100],
      [0, 100]
    );
    
    return {
      width: `${width}%`,
    };
  });

  const getPerformanceLevel = (perc: number) => {
    if (perc >= 90) return { text: 'ممتاز', color: '#10b981' };
    if (perc >= 75) return { text: 'جيد جداً', color: '#3b82f6' };
    if (perc >= 60) return { text: 'جيد', color: '#f59e0b' };
    if (perc >= 50) return { text: 'مقبول', color: '#ef4444' };
    return { text: 'ضعيف', color: '#dc2626' };
  };

  const level = getPerformanceLevel(percentage);

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <BlurView intensity={20} tint="dark" style={styles.blurView}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <MaterialIcons name={icon} size={28} color={color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={[styles.levelBadge, { color: level.color }]}>
                {level.text}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color }]}>
                {Math.round(percentage)}%
              </Text>
              <Text style={styles.statLabel}>نسبة الإتقان</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {correctAnswers}/{totalQuestions}
              </Text>
              <Text style={styles.statLabel}>الإجابات الصحيحة</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: color },
                  progressBarStyle,
                ]}
              >
                {/* Glow effect */}
                <View
                  style={[
                    styles.progressGlow,
                    {
                      shadowColor: color,
                      shadowOpacity: 0.8,
                      shadowRadius: 8,
                    },
                  ]}
                />
              </Animated.View>
            </View>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurView: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  cardContent: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  levelBadge: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    position: 'relative',
  },
  progressGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
});

