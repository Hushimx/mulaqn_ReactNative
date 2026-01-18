import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  SlideInDown,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScheduleItem {
  id: number;
  lesson_id: number;
  lesson_title: string;
  scheduled_date: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  sort_order: number;
  completed_at?: string;
  progress?: {
    avg_score: number;
    level: string;
  };
}

interface DayData {
  date: string;
  day_name: string;
  day_number: number;
  month_name: string;
  items: ScheduleItem[];
  stats: {
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    pending: number;
    completion_rate: number;
  };
  is_past?: boolean;
  is_today?: boolean;
}

interface DayCardProps {
  day: DayData;
  trackColor: string;
  isExpanded: boolean;
  onPress: () => void;
  onItemPress: (item: ScheduleItem) => void;
  flexDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
  isRTL: boolean;
}

// دالة لحساب الفرق بالأيام وإرجاع النص المناسب
const getDayLabel = (dateString: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  switch (diffDays) {
    case -2: return 'قبل أمس';
    case -1: return 'أمس';
    case 0: return 'اليوم';
    case 1: return 'غدًا';
    case 2: return 'بعد غدًا';
    default:
      if (diffDays < -2) return `قبل ${Math.abs(diffDays)} أيام`;
      if (diffDays > 2) return `بعد ${diffDays} أيام`;
      return '';
  }
};

// دالة للحصول على لون الشارة حسب الموقع الزمني
const getDayBadgeColors = (dateString: string): { bg: string; text: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // اليوم - أخضر
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' };
  } else if (diffDays === 1) {
    // غدًا - أزرق
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' };
  } else if (diffDays > 1) {
    // مستقبل - رمادي فاتح
    return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
  } else {
    // ماضي - برتقالي/أحمر
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
  }
};

export function DayCard({
  day,
  trackColor,
  isExpanded,
  onPress,
  onItemPress,
  flexDirection,
  textAlign,
  isRTL,
}: DayCardProps) {
  const isPast = day.is_past !== undefined ? day.is_past : useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(day.date);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  }, [day.date, day.is_past]);

  const isToday = day.is_today !== undefined ? day.is_today : useMemo(() => {
    const today = new Date().toDateString();
    return new Date(day.date).toDateString() === today;
  }, [day.date, day.is_today]);
  
  // حساب موقع اليوم الزمني
  const dayLabel = getDayLabel(day.date);
  const badgeColors = getDayBadgeColors(day.date);

  const cardHeight = useSharedValue(isExpanded ? 0 : 1);
  const contentOpacity = useSharedValue(isExpanded ? 0 : 1);

  React.useEffect(() => {
    cardHeight.value = withSpring(isExpanded ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
    contentOpacity.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
    });
  }, [isExpanded]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      cardHeight.value,
      [0, 1],
      [140, 500],
      Extrapolate.CLAMP
    );
    return {
      height,
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
    };
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'check-circle', color: '#10B981' };
      case 'skipped':
        return { name: 'schedule', color: '#F59E0B' };
      case 'failed':
        return { name: 'close-circle', color: '#EF4444' };
      default:
        return { name: 'radio-button-unchecked', color: '#9CA3AF' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'skipped':
        return 'مؤجل';
      case 'failed':
        return 'فاشل';
      default:
        return 'معلق';
    }
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: isPast && !isExpanded ? 0.6 : 1,
          shadowColor: isExpanded ? trackColor : '#000',
          shadowOffset: { width: 0, height: isExpanded ? 8 : 3 },
          shadowOpacity: isExpanded ? 0.3 : 0.12,
          shadowRadius: isExpanded ? 12 : 6,
          elevation: isExpanded ? 8 : 3,
        },
        cardAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={
          isExpanded
            ? ['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.06)']
            : ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)']
        }
        style={[
          styles.cardGradient,
          {
            borderColor: isExpanded ? trackColor : `${trackColor}35`,
            borderWidth: isExpanded ? 2 : 1.5,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.8}
          style={styles.cardHeader}
        >
          <View style={[styles.headerContent, { flexDirection }]}>
            <View style={styles.headerLeft}>
              {dayLabel && (
                <Animated.View 
                  entering={ZoomIn.duration(300)}
                  style={[styles.dayBadge, { backgroundColor: badgeColors.bg }]}
                >
                  <Text style={[styles.dayBadgeText, { color: badgeColors.text }]}>
                    {dayLabel}
                  </Text>
                </Animated.View>
              )}
              <View style={styles.dayInfo}>
                <Text style={[styles.dayName, { textAlign, color: '#FFFFFF' }]}>
                  {day.day_name}
                </Text>
                <View style={[styles.dateRow, { flexDirection }]}>
                  <MaterialIcons name="calendar-today" size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={[styles.dayDate, { textAlign }]}>
                    {day.day_number} {day.month_name}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.headerRight, { flexDirection }]}>
              <View style={[styles.statsBadge, { backgroundColor: `${trackColor}20` }]}>
                <MaterialIcons name="book" size={14} color={trackColor} />
                <Text style={[styles.statsText, { color: trackColor }]}>
                  {day.stats.total}
                </Text>
              </View>
              <MaterialIcons
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={trackColor}
              />
            </View>
          </View>

          <View style={[styles.progressContainer, { flexDirection }]}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                entering={SlideInDown.duration(400).delay(100)}
                style={[styles.progressBarFill, { width: `${day.stats.completion_rate}%` }]}
              >
                <LinearGradient
                  colors={[trackColor, `${trackColor}DD`]}
                  style={styles.progressGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
            <Text style={[styles.progressText, { textAlign, color: trackColor }]}>
              {day.stats.completion_rate.toFixed(0)}%
            </Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <Animated.View
            style={[styles.cardContent, contentAnimatedStyle]}
            entering={SlideInDown.duration(300)}
          >
            {day.items.length === 0 ? (
              <View style={styles.emptyDay}>
                <MaterialIcons name="event-busy" size={40} color="rgba(255,255,255,0.4)" />
                <Text style={[styles.emptyText, { textAlign }]}>لا توجد دروس</Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {day.items.map((item, index) => {
                  const statusIcon = getStatusIcon(item.status);
                  return (
                    <Animated.View
                      key={item.id}
                      entering={FadeInUp.duration(250).delay(index * 40)}
                    >
                      <TouchableOpacity
                        style={styles.lessonCard}
                        onPress={() => onItemPress(item)}
                        activeOpacity={0.7}
                      >
                        {/* Icon */}
                        <View style={[styles.lessonIcon, { backgroundColor: `${statusIcon.color}25` }]}>
                          <MaterialIcons
                            name={statusIcon.name as any}
                            size={20}
                            color={statusIcon.color}
                          />
                        </View>

                        {/* Content */}
                        <View style={styles.lessonContent}>
                          <Text style={styles.lessonTitle} numberOfLines={2}>
                            {item.lesson_title}
                          </Text>
                          
                          <View style={styles.lessonInfo}>
                            <View style={[styles.lessonBadge, { backgroundColor: `${statusIcon.color}20` }]}>
                              <Text style={[styles.lessonBadgeText, { color: statusIcon.color }]}>
                                {getStatusText(item.status)}
                              </Text>
                            </View>
                            
                            {item.progress && (
                              <View style={[styles.lessonBadge, { backgroundColor: `${trackColor}20` }]}>
                                <Text style={[styles.lessonBadgeText, { color: trackColor }]}>
                                  {item.progress.avg_score.toFixed(0)}%
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Arrow */}
                        <MaterialIcons
                          name="chevron-left"
                          size={20}
                          color="rgba(255,255,255,0.5)"
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingLeft: 20,
    paddingRight: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingRight: 16,
  },
  // شارة الموقع الزمني (اليوم، أمس، غدًا...)
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDate: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    minWidth: 'auto',
  },
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressGradient: {
    width: '100%',
    height: '100%',
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 45,
  },
  cardContent: {
    paddingLeft: 20,
    paddingRight: 24,
    paddingBottom: 18,
  },
  emptyDay: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  itemsList: {
    gap: 12,
  },
  // تصميم بطاقة الدرس - بسيط وواضح
  lessonCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  // أيقونة الدرس
  lessonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // محتوى الدرس
  lessonContent: {
    flex: 1,
    gap: 8,
  },
  // عنوان الدرس
  lessonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  // معلومات الدرس
  lessonInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  // شارات المعلومات
  lessonBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  lessonBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
