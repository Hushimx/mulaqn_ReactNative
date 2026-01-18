import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

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

export default function ScheduleDayView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [date, setDate] = useState<string>(params.date as string || new Date().toISOString().split('T')[0]);
  const [trackId, setTrackId] = useState<number>(parseInt(params.trackId as string) || 1);

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  useEffect(() => {
    fetchDayData();
  }, [date, trackId]);

  const fetchDayData = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: { date: string; items: ScheduleItem[] } }>(
        `${API_ENDPOINTS.SMART_SCHEDULE_DAY}?date=${date}&track_id=${trackId}`
      );

      if (response && response.ok && response.data) {
        setItems(response.data.items || []);
        setDate(response.data.date);
      }
    } catch (err: any) {
      console.error('Error fetching day data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'check-circle', color: '#10B981' };
      case 'skipped':
        return { name: 'schedule', color: '#F59E0B' };
      case 'failed':
        return { name: 'error', color: '#EF4444' };
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
        return 'فشل';
      default:
        return 'معلق';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('ar-SA', options);
  };

  if (loading) {
    return (
      <GradientBackground colors={colors.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={trackColor} />
          </View>
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
            <Text style={[styles.headerTitle, { textAlign }]}>دروس اليوم</Text>
            <Text style={[styles.headerDate, { textAlign }]}>{formatDate(date)}</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: `${trackColor}20` }]}>
                <MaterialIcons name="event-busy" size={64} color={trackColor} />
              </View>
              <Text style={[styles.emptyText, { textAlign }]}>لا توجد دروس مجدولة لهذا اليوم</Text>
            </Animated.View>
          ) : (
            items.map((item, index) => {
              const statusIcon = getStatusIcon(item.status);
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInUp.duration(400).delay(index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.itemCard, 
                      { 
                        flexDirection,
                        borderColor: `${trackColor}30`,
                      }
                    ]}
                    onPress={() => router.push({
                      pathname: '/schedule/completion/[itemId]',
                      params: { 
                        itemId: item.id.toString(),
                        trackId: trackId.toString(),
                      },
                    })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: `${statusIcon.color}20` }]}>
                      <MaterialIcons 
                        name={statusIcon.name as any} 
                        size={24} 
                        color={statusIcon.color} 
                      />
                    </View>
                    <View style={[styles.itemContent, { flex: 1 }]}>
                      <Text style={[styles.itemTitle, { textAlign }]}>{item.lesson_title}</Text>
                      <View style={[styles.itemMeta, { flexDirection }]}>
                        <View style={[styles.statusBadge, { backgroundColor: `${statusIcon.color}20` }]}>
                          <Text style={[styles.itemStatus, { color: statusIcon.color }]}>
                            {getStatusText(item.status)}
                          </Text>
                        </View>
                        {item.completed_at && (
                          <View style={[styles.timeBadge, { flexDirection }]}>
                            <MaterialIcons name="access-time" size={14} color="rgba(255,255,255,0.6)" />
                            <Text style={[styles.itemTime, { textAlign }]}>
                              {new Date(item.completed_at).toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.skip_reason && (
                        <Text style={[styles.skipReason, { textAlign }]} numberOfLines={2}>
                          {item.skip_reason}
                        </Text>
                      )}
                    </View>
                    <MaterialIcons 
                      name={isRTL ? "chevron-left" : "chevron-right"} 
                      size={24} 
                      color={trackColor} 
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },
  itemTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  skipReason: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
