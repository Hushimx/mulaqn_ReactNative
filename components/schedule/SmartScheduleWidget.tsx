import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface ScheduleItem {
  id: number;
  lesson_id: number;
  lesson_title: string;
  scheduled_date: string;
  status: 'pending' | 'completed' | 'skipped' | 'failed';
  sort_order: number;
  completed_at?: string;
  skip_reason?: string;
  skip_reason_type?: string;
}

interface ScheduleSummary {
  yesterday: ScheduleItem[];
  today: ScheduleItem[];
  tomorrow: ScheduleItem[];
}

interface SmartScheduleWidgetProps {
  trackId: number;
  trackColor?: string;
  onItemPress?: (item: ScheduleItem) => void;
  onDayPress?: (date: string, items: ScheduleItem[]) => void;
}

type ExpandedDay = 'yesterday' | 'today' | 'tomorrow' | null;

function SmartScheduleWidget({ 
  trackId, 
  trackColor = '#D4AF37',
  onItemPress,
  onDayPress 
}: SmartScheduleWidgetProps) {
  const router = useRouter();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<ExpandedDay>('today');

  // Animation values
  const yesterdayWidth = useSharedValue(0.8);
  const todayWidth = useSharedValue(2.5);
  const tomorrowWidth = useSharedValue(0.7);

  // Animated styles - يجب أن تكون في أعلى مستوى المكون
  const yesterdayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = expandedDay !== 'yesterday' && expandedDay !== null ? 0.5 : 1;
    return {
      flex: yesterdayWidth.value,
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  const todayAnimatedStyle = useAnimatedStyle(() => {
    return {
      flex: todayWidth.value,
      opacity: 1,
    };
  });

  const tomorrowAnimatedStyle = useAnimatedStyle(() => {
    const opacity = expandedDay !== 'tomorrow' && expandedDay !== null ? 0.5 : 1;
    return {
      flex: tomorrowWidth.value,
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  // Content animated styles
  const yesterdayContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(expandedDay === 'yesterday' ? 1 : 0.95, { damping: 20, stiffness: 200 }) }],
  }));

  const todayContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(expandedDay === 'today' ? 1 : 0.95, { damping: 20, stiffness: 200 }) }],
  }));

  const tomorrowContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(expandedDay === 'tomorrow' ? 1 : 0.95, { damping: 20, stiffness: 200 }) }],
  }));

  useEffect(() => {
    fetchSummary();
  }, [trackId]);

  useEffect(() => {
    // Update animations based on expanded day
    if (expandedDay === 'yesterday') {
      yesterdayWidth.value = withSpring(2.5, { damping: 20, stiffness: 200 });
      todayWidth.value = withSpring(0.8, { damping: 20, stiffness: 200 });
      tomorrowWidth.value = withSpring(0.7, { damping: 20, stiffness: 200 });
    } else if (expandedDay === 'today') {
      yesterdayWidth.value = withSpring(0.8, { damping: 20, stiffness: 200 });
      todayWidth.value = withSpring(2.5, { damping: 20, stiffness: 200 });
      tomorrowWidth.value = withSpring(0.7, { damping: 20, stiffness: 200 });
    } else if (expandedDay === 'tomorrow') {
      yesterdayWidth.value = withSpring(0.8, { damping: 20, stiffness: 200 });
      todayWidth.value = withSpring(0.8, { damping: 20, stiffness: 200 });
      tomorrowWidth.value = withSpring(2.5, { damping: 20, stiffness: 200 });
    }
  }, [expandedDay]);

  // Memoize dates calculation - MUST be before any conditional returns
  const dates = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      yesterday: yesterday.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0],
      tomorrow: tomorrow.toISOString().split('T')[0],
    };
  }, []);

  // Memoize processed summary - MUST be before any conditional returns
  const processedSummary = useMemo(() => {
    if (!summary) return null;
    return {
      yesterday: summary.yesterday,
      today: summary.today,
      tomorrow: summary.tomorrow,
    };
  }, [summary]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<{ ok: boolean; data: ScheduleSummary }>(
        `${API_ENDPOINTS.SMART_SCHEDULE_SUMMARY}?track_id=${trackId}&range=-1..+1`
      );

      if (response && response.ok && response.data) {
        setSummary(response.data);
        setError(null);
      } else {
        // إذا لم يكن هناك جدول، نعرض الواجهة الترحيبية
        setSummary(null);
        setError(null);
      }
    } catch (err: any) {
      logger.error('Error fetching schedule summary:', err);
      // إذا كان الخطأ هو عدم وجود جدول، نعرض الواجهة الترحيبية
      if (err?.message?.includes('لا يوجد جدول') || err?.message?.includes('No schedule')) {
        setSummary(null);
        setError(null);
      } else {
        setError('حدث خطأ أثناء تحميل الجدول');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  const handleDayCardPress = useCallback((day: ExpandedDay, date: string, items: ScheduleItem[]) => {
    if (expandedDay === day) {
      // إذا كان متوسع بالفعل، ادخل صفحة اليوم
      if (onDayPress) {
        onDayPress(date, items);
      } else {
        router.push({
          pathname: '/schedule/day',
          params: { date, trackId: trackId.toString() },
        });
      }
    } else {
      // توسيع هذا الجدول
      setExpandedDay(day);
    }
  }, [expandedDay, onDayPress, router, trackId]);

  const handleItemPress = useCallback((item: ScheduleItem, e?: any) => {
    // منع propagation للضغط على الدرس
    if (e) {
      e.stopPropagation();
    }
    if (onItemPress) {
      onItemPress(item);
    } else {
      router.push({
        pathname: '/schedule/completion/[itemId]',
        params: { 
          itemId: item.id.toString(),
          trackId: trackId.toString(),
        },
      });
    }
  }, [onItemPress, router, trackId]);

  const renderDayCard = (
    day: ExpandedDay,
    title: string,
    items: ScheduleItem[],
    date: string,
    isPast: boolean = false,
    animatedStyle: any,
    contentAnimatedStyle: any
  ) => {
    const totalItems = items.length;
    const isExpanded = expandedDay === day;
    const isCollapsed = expandedDay !== day && expandedDay !== null;

    return (
      <Animated.View style={[styles.dayCardWrapper, animatedStyle]}>
        <TouchableOpacity
          style={[
            styles.dayCard,
            {
              borderColor: isExpanded ? trackColor : `${trackColor}40`,
              borderWidth: isExpanded ? 2 : 1,
              backgroundColor: isExpanded 
                ? `rgba(255, 255, 255, 0.1)` 
                : 'rgba(255, 255, 255, 0.05)',
            }
          ]}
          onPress={() => handleDayCardPress(day, date, items)}
          activeOpacity={0.8}
        >
          <Animated.View style={contentAnimatedStyle}>
            <View style={[styles.dayCardHeader, { flexDirection }]}>
              <Text style={[
                styles.dayCardTitle,
                {
                  textAlign,
                  color: isExpanded ? trackColor : `${trackColor}CC`,
                  fontSize: isExpanded ? 16 : 14,
                }
              ]}>
                {title}
              </Text>
              <View style={[styles.dayCardBadge, { backgroundColor: `${trackColor}20` }]}>
                <Text style={[styles.dayCardCount, { color: trackColor }]}>
                  {totalItems}
                </Text>
              </View>
            </View>

            <View style={styles.dayCardItems}>
              {totalItems === 0 ? (
                <View style={styles.emptyDayCard}>
                  <MaterialIcons name="event-busy" size={20} color="rgba(255,255,255,0.4)" />
                  {isExpanded && (
                    <Text style={[styles.emptyDayText, { textAlign }]}>لا توجد دروس</Text>
                  )}
                </View>
              ) : (
                items.slice(0, isExpanded ? 10 : 2).map((item, index) => {
                  const statusIcon = getStatusIcon(item.status);
                  const showTitle = isExpanded || day === 'today';
                  
                  return (
                    <TouchableOpacity
                      key={`item-${item.id}`}
                      style={[
                        styles.dayItem,
                        {
                          flexDirection,
                          backgroundColor: item.status === 'failed'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(255, 255, 255, 0.03)',
                          borderWidth: item.status === 'failed' ? 1 : 0,
                          borderColor: item.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                          paddingVertical: showTitle ? 8 : 4,
                          paddingHorizontal: showTitle ? 10 : 6,
                        }
                      ]}
                      onPress={(e) => handleItemPress(item, e)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={statusIcon.name as any}
                        size={item.status === 'failed' ? 18 : (showTitle ? 16 : 14)}
                        color={statusIcon.color}
                      />
                      {showTitle && (
                        <Text
                          style={[
                            styles.dayItemText,
                            {
                              textAlign,
                              color: item.status === 'failed' ? '#EF4444' : '#FFFFFF',
                              fontWeight: item.status === 'failed' ? '600' : '500',
                              fontSize: isExpanded ? 13 : 12,
                            }
                          ]}
                          numberOfLines={isExpanded ? 2 : 1}
                        >
                          {item.lesson_title || 'درس بدون عنوان'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              {totalItems > (isExpanded ? 10 : 2) && isExpanded && (
                <Text style={[styles.moreItemsText, { textAlign, color: trackColor }]}>
                  +{totalItems - 10} أكثر
                </Text>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { borderColor: `${trackColor}33` }]}>
        <View style={[styles.header, { flexDirection }]}>
          <Text style={[styles.title, { textAlign }]}>📅 الجدول الذكي</Text>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/schedule/settings',
              params: { trackId: trackId.toString() }
            })}
            style={styles.settingsButton}
          >
            <MaterialIcons name="settings" size={20} color={trackColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={trackColor} />
        </View>
      </View>
    );
  }

  const handleCreateSchedule = () => {
    router.push({
      pathname: '/schedule/create/exam-date-setup',
      params: { trackId: trackId.toString() },
    });
  };

  // حالة عدم وجود جدول - واجهة ترحيبية
  // نتحقق من أن جميع الأيام فارغة (لا يوجد جدول نشط)
  const hasNoSchedule = !summary || (
    summary.yesterday.length === 0 &&
    summary.today.length === 0 &&
    summary.tomorrow.length === 0
  );

  if (hasNoSchedule && !error) {
    return (
      <View style={[styles.container, { borderColor: `${trackColor}33` }]}>
        <View style={[styles.header, { flexDirection }]}>
          <Text style={[styles.title, { textAlign }]}>📅 الجدول الذكي</Text>
        </View>
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeIconContainer}>
            <MaterialIcons name="calendar-today" size={48} color={trackColor} />
          </View>
          <Text style={[styles.welcomeTitle, { textAlign, color: trackColor }]}>
            الجدول الذكي 📅
          </Text>
          <Text style={[styles.welcomeDescription, { textAlign }]}>
            أنشئ جدولك الذكي لتنظيم دراستك تلقائياً
          </Text>
          <TouchableOpacity
            onPress={handleCreateSchedule}
            disabled={loading}
            style={[styles.createButton, { backgroundColor: trackColor }]}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>إنشاء جدول ذكي</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // حالة خطأ أخرى
  if (error) {
    return (
      <View style={[styles.container, { borderColor: `${trackColor}33` }]}>
        <View style={[styles.header, { flexDirection }]}>
          <Text style={[styles.title, { textAlign }]}>📅 الجدول الذكي</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { textAlign }]}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={fetchSummary}
            style={[styles.retryButton, { backgroundColor: `${trackColor}33` }]}
          >
            <Text style={[styles.retryText, { color: trackColor }]}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!processedSummary) {
    return null;
  }

  return (
    <View style={[styles.container, { borderColor: `${trackColor}33` }]}>
      <View style={[styles.header, { flexDirection }]}>
        <Text style={[styles.title, { textAlign }]}>📅 الجدول الذكي</Text>
        <View style={[styles.headerActions, { flexDirection }]}>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/schedule/week',
              params: { trackId: trackId.toString() }
            })}
            style={[styles.headerButton, { marginRight: flexDirection === 'row-reverse' ? 0 : 8, marginLeft: flexDirection === 'row-reverse' ? 8 : 0 }]}
          >
            <MaterialIcons name="view-week" size={20} color={trackColor} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/schedule/settings',
              params: { trackId: trackId.toString() }
            })}
            style={styles.settingsButton}
          >
            <MaterialIcons name="settings" size={20} color={trackColor} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.daysContainer, { flexDirection }]}>
        {renderDayCard(
          'yesterday',
          'أمس',
          processedSummary.yesterday,
          dates.yesterday,
          true,
          yesterdayAnimatedStyle,
          yesterdayContentStyle
        )}
        {renderDayCard(
          'today',
          'اليوم',
          processedSummary.today,
          dates.today,
          false,
          todayAnimatedStyle,
          todayContentStyle
        )}
        {renderDayCard(
          'tomorrow',
          'غداً',
          processedSummary.tomorrow,
          dates.tomorrow,
          false,
          tomorrowAnimatedStyle,
          tomorrowContentStyle
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 12,
  },
  welcomeContainer: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  welcomeDescription: {
    fontSize: 15,
    color: '#E5E7EB',
    lineHeight: 24,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
    fontWeight: '500',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  dayCardWrapper: {
    minWidth: 60,
    alignSelf: 'flex-start',
  },
  dayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    minHeight: 140,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayCardTitle: {
    fontWeight: '700',
    flex: 1,
  },
  dayCardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  dayCardCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayCardItems: {
    gap: 6,
  },
  emptyDayCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyDayText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 6,
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    gap: 6,
    minHeight: 24,
  },
  dayItemText: {
    flex: 1,
    fontWeight: '500',
  },
  moreItemsText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});

// Memoize component with custom comparison
export default React.memo(SmartScheduleWidget, (prevProps, nextProps) => {
  // Only re-render if trackId or trackColor changes
  return prevProps.trackId === nextProps.trackId && 
         prevProps.trackColor === nextProps.trackColor &&
         prevProps.onItemPress === nextProps.onItemPress &&
         prevProps.onDayPress === nextProps.onDayPress;
});
