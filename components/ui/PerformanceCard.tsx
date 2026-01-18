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
import { getPerformanceLevel } from '@/constants/PerformanceLevels';
import { useLanguage } from '@/contexts/LanguageContext';

interface PerformanceCardProps {
  title: string;
  percentage: number | null;
  correctAnswers: number;
  totalQuestions: number;
  color: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  delay?: number;
  isEstimate?: boolean;
  reliability?: string;
  level_ar?: string;
  level_color?: string;
}

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

export function PerformanceCard({
  title,
  percentage,
  correctAnswers,
  totalQuestions,
  color,
  icon = 'analytics',
  delay = 0,
  isEstimate,
  reliability,
  level_ar,
  level_color,
}: PerformanceCardProps) {
  const { isRTL, textAlign, flexDirection } = useLanguage();
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

    // Progress bar animation - فقط إذا percentage !== null
    if (percentage !== null) {
      progress.value = withDelay(
        delay + 200,
        withTiming(percentage, {
          duration: 1000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );
    }
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

  // استخدام level_ar + level_color من backend إذا موجودة
  // وإلا استخدام PerformanceLevels.ts
  const level = level_ar && level_color
    ? { text: level_ar, color: level_color }
    : percentage !== null
    ? getPerformanceLevel(percentage)
    : { text: 'غير متاح', color: '#6B7280' };

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <BlurView intensity={20} tint="dark" style={styles.blurView}>
        <View style={styles.cardContent}>
          {/* Header */}
          <View style={[styles.header, { flexDirection }]}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20`, marginHorizontal: 12 }]}>
              <MaterialIcons name={icon} size={28} color={color} />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { textAlign }]}>{title}</Text>
              <Text style={[styles.levelBadge, { color: level.color, textAlign }]}>
                {level.text}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={[styles.statsContainer, { flexDirection }]}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color, textAlign }]}>
                {percentage !== null ? `${Math.round(percentage)}%` : '-'}
              </Text>
              <Text style={[styles.statLabel, { textAlign }]}>نسبة الإتقان</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { textAlign }]}>
                {correctAnswers}/{totalQuestions}
              </Text>
              <Text style={[styles.statLabel, { textAlign }]}>الإجابات الصحيحة</Text>
            </View>
          </View>

          {/* Progress Bar - فقط إذا percentage !== null */}
          {percentage !== null && (
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
          )}

          {/* Reliability Message - يظهر فقط عند is_estimate = true */}
          {isEstimate && reliability && (
            <View style={[
              styles.reliabilityContainer,
              {
                [isRTL ? 'borderRightColor' : 'borderLeftColor']: level_color || color,
                [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 3,
                [isRTL ? 'borderLeftWidth' : 'borderRightWidth']: 0,
              }
            ]}>
              <View style={{ flexDirection }}>
                <MaterialIcons 
                  name="info-outline" 
                  size={16} 
                  color={level_color || color} 
                  style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}
                />
                <Text style={[styles.reliabilityLabel, { color: level_color || color, textAlign, flex: 1 }]}>
                  {getReliabilityInfo(reliability).label}
                </Text>
              </View>
              <Text style={[styles.reliabilityMessage, { textAlign, marginTop: 4 }]}>
                {getReliabilityInfo(reliability).message}
              </Text>
            </View>
          )}
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
  reliabilityContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  reliabilityLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  reliabilityMessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
  },
});

