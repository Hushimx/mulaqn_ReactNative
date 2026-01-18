import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import Animated, {
  FadeInDown,
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
import { WeekHeader } from '@/components/schedule/WeekHeader';
import { DayCard } from '@/components/schedule/DayCard';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  failure_reason?: string;
  progress?: {
    attempts_count: number;
    last_score: number;
    best_score: number;
    avg_score: number;
    avg_time_sec: number;
    last_attempt_at?: string;
    level: string;
  };
  last_attempt?: {
    id: number;
    raw_score: number;
    score_total: number;
    submitted_at: string;
    time_spent_sec: number;
  };
  skills?: Array<{
    skill_id: number;
    skill_name: string;
    theta: number;
    level: string;
  }>;
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

interface WeekData {
  week_start: string;
  week_end: string;
  days: DayData[];
  stats: {
    total: number;
    completed: number;
    skipped: number;
    failed: number;
    pending: number;
    completion_rate: number;
  };
}

export default function ScheduleWeekView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [trackId, setTrackId] = useState<number>(parseInt(params.trackId as string) || 1);
  const [startDate, setStartDate] = useState<string>(
    params.startDate as string || new Date().toISOString().split('T')[0]
  );
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;


  const fetchWeekData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: WeekData }>(
        `${API_ENDPOINTS.SMART_SCHEDULE_WEEK}?track_id=${trackId}&start_date=${startDate}`
      );

      if (response && response.ok && response.data) {
        setWeekData(response.data);
      }
    } catch (err: any) {
      logger.error('Error fetching week data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, trackId]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  // تحديد اليوم الحالي عند تحميل البيانات
  useEffect(() => {
    if (weekData && weekData.days.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const sortedDays = [...weekData.days].sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      const todayIndex = sortedDays.findIndex(day => day.date === today || day.is_today);
      const indexToScroll = todayIndex >= 0 ? todayIndex : 0;
      
      setCurrentDayIndex(indexToScroll);
    }
  }, [weekData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // مسح cache للـ week endpoint
    api.clearCache(API_ENDPOINTS.SMART_SCHEDULE_WEEK);
    await fetchWeekData();
    setRefreshing(false);
  }, [fetchWeekData]);

  const handlePreviousWeek = useCallback(() => {
    const current = new Date(startDate);
    current.setDate(current.getDate() - 7);
    setStartDate(current.toISOString().split('T')[0]);
    setExpandedDay(null);
  }, [startDate]);

  const handleNextWeek = useCallback(() => {
    const current = new Date(startDate);
    current.setDate(current.getDate() + 7);
    setStartDate(current.toISOString().split('T')[0]);
    setExpandedDay(null);
  }, [startDate]);

  const handleDayPress = useCallback((date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  }, [expandedDay]);

  const handleItemPress = useCallback((item: ScheduleItem) => {
    router.push({
      pathname: '/schedule/completion/[itemId]',
      params: {
        itemId: item.id.toString(),
        trackId: trackId.toString(),
      },
    });
  }, [trackId, router]);

  const handlePreviousDay = useCallback(() => {
    if (weekData && weekData.days.length > 0 && currentDayIndex > 0) {
      const newIndex = currentDayIndex - 1;
      setCurrentDayIndex(newIndex);
      setExpandedDay(null); // إغلاق اليوم المفتوح عند التنقل
    }
  }, [currentDayIndex, weekData]);

  const handleNextDay = useCallback(() => {
    if (weekData && weekData.days.length > 0 && currentDayIndex < weekData.days.length - 1) {
      const newIndex = currentDayIndex + 1;
      setCurrentDayIndex(newIndex);
      setExpandedDay(null); // إغلاق اليوم المفتوح عند التنقل
    }
  }, [currentDayIndex, weekData]);

  if (loading && !weekData) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={trackColor} />
            <Text style={[styles.loadingText, { textAlign, color: trackColor }]}>
              جاري تحميل الخطة...
            </Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!weekData || weekData.days.length === 0) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { flexDirection }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <MaterialIcons
                name={isRTL ? "arrow-forward" : "arrow-back"}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={[styles.headerTitle, { textAlign }]}>خطة الأسبوع</Text>
            </View>
          </View>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${trackColor}20` }]}>
              <MaterialIcons name="event-busy" size={64} color={trackColor} />
            </View>
            <Text style={[styles.emptyText, { textAlign }]}>
              لا توجد خطة أسبوعية متاحة
            </Text>
          </Animated.View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground colors={colors.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { flexDirection }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name={isRTL ? "arrow-forward" : "arrow-back"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { textAlign }]}>خطة الأسبوع</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={trackColor}
              colors={[trackColor]}
            />
          }
          nestedScrollEnabled={true}
        >
          <Animated.View entering={FadeInDown.duration(400)}>
            <WeekHeader
              weekData={weekData}
              trackColor={trackColor}
              onPrevious={handlePreviousWeek}
              onNext={handleNextWeek}
              flexDirection={flexDirection}
              textAlign={textAlign}
            />
          </Animated.View>

          <View style={styles.daysSection}>
            {/* Navigation Arrows */}
            <View style={[styles.navArrowsContainer, { flexDirection }]}>
              <TouchableOpacity
                onPress={handlePreviousDay}
                disabled={currentDayIndex === 0}
                style={[
                  styles.navArrowButton,
                  { 
                    backgroundColor: currentDayIndex === 0 ? 'rgba(255,255,255,0.1)' : `${trackColor}30`,
                    opacity: currentDayIndex === 0 ? 0.5 : 1,
                  }
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={flexDirection === 'row-reverse' ? 'chevron-right' : 'chevron-left'}
                  size={24}
                  color={currentDayIndex === 0 ? 'rgba(255,255,255,0.5)' : trackColor}
                />
              </TouchableOpacity>

              <View style={styles.daysIndicator}>
                <Text style={[styles.daysIndicatorText, { textAlign: 'center', color: trackColor }]}>
                  {currentDayIndex + 1} / {weekData.days.length}
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNextDay}
                disabled={currentDayIndex >= weekData.days.length - 1}
                style={[
                  styles.navArrowButton,
                  { 
                    backgroundColor: currentDayIndex >= weekData.days.length - 1 ? 'rgba(255,255,255,0.1)' : `${trackColor}30`,
                    opacity: currentDayIndex >= weekData.days.length - 1 ? 0.5 : 1,
                  }
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={flexDirection === 'row-reverse' ? 'chevron-left' : 'chevron-right'}
                  size={24}
                  color={currentDayIndex >= weekData.days.length - 1 ? 'rgba(255,255,255,0.5)' : trackColor}
                />
              </TouchableOpacity>
            </View>

            {/* Days ScrollView */}
            <View style={styles.dayCardContainer}>
              {weekData.days
                .sort((a, b) => {
                  // ترتيب بسيط حسب التاريخ (LTR)
                  return new Date(a.date).getTime() - new Date(b.date).getTime();
                })
                .map((day, index) => {
                  // عرض اليوم الحالي فقط
                  if (index !== currentDayIndex) return null;
                  
                  return (
                    <Animated.View
                      key={day.date}
                      entering={FadeInUp.duration(400)}
                      style={styles.dayCardWrapper}
                    >
                      <DayCard
                        day={day}
                        trackColor={trackColor}
                        isExpanded={expandedDay === day.date}
                        onPress={() => handleDayPress(day.date)}
                        onItemPress={handleItemPress}
                        flexDirection={flexDirection}
                        textAlign={textAlign}
                        isRTL={isRTL}
                      />
                    </Animated.View>
                  );
                })}
            </View>
          </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  daysSection: {
    marginTop: 20,
  },
  navArrowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  navArrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  daysIndicator: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  daysIndicatorText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dayCardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dayCardWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});

