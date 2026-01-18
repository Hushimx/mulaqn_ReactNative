import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';

interface PreviewDay {
  date: string;
  day_name: string;
  items: Array<{
    lesson_id: number;
    lesson_title: string;
    difficulty?: string;
  }>;
}

interface PreviewData {
  preview: {
    days: PreviewDay[];
  };
  stats: {
    total_days: number;
    total_lessons: number;
    avg_lessons_per_day: number;
  };
}

export default function ScheduleCreatePreview() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const trackId = parseInt(params.trackId as string) || 1;
  const type = (params.type as string) || 'auto';
  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  // إخفاء Expo Router header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreview();
  }, []);

  const fetchPreview = async () => {
    try {
      setLoading(true);

      const requestData: any = {
        type,
        track_id: trackId,
      };

      // Add type-specific params
      if (type === 'auto') {
        requestData.preset = params.preset || 'balanced';
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
      } else if (type === 'short') {
        requestData.sunday = parseInt(params.sunday as string) || 2;
        requestData.monday = parseInt(params.monday as string) || 3;
        requestData.tuesday = parseInt(params.tuesday as string) || 2;
        requestData.wednesday = parseInt(params.wednesday as string) || 3;
        requestData.thursday = parseInt(params.thursday as string) || 2;
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
      } else if (type === 'custom') {
        if (params.duration_days) {
          requestData.duration_days = parseInt(params.duration_days as string);
        }
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
        // For custom, items should be passed from previous screen
        // This is a simplified version - in production, you'd pass items via navigation state
      }

      const response = await api.post<{ ok: boolean; data: PreviewData }>(
        API_ENDPOINTS.SMART_SCHEDULE_PREVIEW,
        requestData
      );

      if (response && response.ok && response.data) {
        setPreviewData(response.data);
      } else {
        Alert.alert('خطأ', 'فشل في تحميل معاينة الجدول');
        router.back();
      }
    } catch (err: any) {
      logger.error('Error fetching preview:', err);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل معاينة الجدول');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      let endpoint = '';
      let requestData: any = {
        track_id: trackId,
      };

      if (type === 'auto') {
        endpoint = API_ENDPOINTS.SMART_SCHEDULE_CREATE_AUTO;
        requestData.preset = params.preset || 'balanced';
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
      } else if (type === 'short') {
        endpoint = API_ENDPOINTS.SMART_SCHEDULE_CREATE_SHORT;
        requestData.sunday = parseInt(params.sunday as string) || 2;
        requestData.monday = parseInt(params.monday as string) || 3;
        requestData.tuesday = parseInt(params.tuesday as string) || 2;
        requestData.wednesday = parseInt(params.wednesday as string) || 3;
        requestData.thursday = parseInt(params.thursday as string) || 2;
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
      } else if (type === 'custom') {
        endpoint = API_ENDPOINTS.SMART_SCHEDULE_CREATE_CUSTOM;
        if (params.duration_days) {
          requestData.duration_days = parseInt(params.duration_days as string);
        }
        if (params.exam_date) {
          requestData.exam_date = params.exam_date;
        }
        // For custom, items should be passed from previous screen
        // This is a simplified version
      }

      const response = await api.post<{ ok: boolean; data: any }>(
        endpoint,
        requestData
      );

      if (response && response.ok && response.data) {
        Alert.alert('نجح', 'تم إنشاء الجدول بنجاح', [
          {
            text: 'حسناً',
            onPress: () => {
              // Navigate to schedule page
              router.replace({
                pathname: '/(tabs)/tracks/[id]',
                params: { id: trackId.toString() },
              });
            },
          },
        ]);
      } else {
        Alert.alert('خطأ', 'فشل في حفظ الجدول');
      }
    } catch (err: any) {
      logger.error('Error saving schedule:', err);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الجدول');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={trackColor} />
          <Text style={[styles.loadingText, { textAlign, color: trackColor }]}>
            جاري تحميل المعاينة...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!previewData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { textAlign }]}>
            فشل في تحميل المعاينة
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: trackColor }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>العودة</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { preview, stats } = previewData;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleEdit}
          style={[styles.backButton, { flexDirection }]}
        >
          <MaterialIcons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign }]}>
          معاينة الجدول
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={[styles.statsContainer, { borderColor: trackColor }]}
        >
          <Text style={[styles.statsTitle, { textAlign, color: trackColor }]}>
            إحصائيات الجدول
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: trackColor }]}>
                {stats.total_days}
              </Text>
              <Text style={[styles.statLabel, { textAlign }]}>يوم</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: trackColor }]}>
                {stats.total_lessons}
              </Text>
              <Text style={[styles.statLabel, { textAlign }]}>درس</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: trackColor }]}>
                {stats.avg_lessons_per_day.toFixed(1)}
              </Text>
              <Text style={[styles.statLabel, { textAlign }]}>متوسط/يوم</Text>
            </View>
          </View>
        </Animated.View>

        {/* Days Preview */}
        <View style={styles.daysContainer}>
          <Text style={[styles.sectionTitle, { textAlign, color: trackColor }]}>
            جدول الأيام
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScrollContent}
          >
            {preview.days.map((day, index) => (
              <Animated.View
                key={day.date}
                entering={FadeInUp.duration(400).delay(index * 50)}
                style={[
                  styles.dayCard,
                  {
                    borderColor: trackColor,
                    backgroundColor: `${trackColor}15`,
                  },
                ]}
              >
                <View style={[styles.dayHeader, { backgroundColor: `${trackColor}33` }]}>
                  <Text style={[styles.dayName, { textAlign, color: trackColor }]}>
                    {day.day_name}
                  </Text>
                  <Text style={[styles.dayDate, { textAlign, color: trackColor }]}>
                    {new Date(day.date).toLocaleDateString('ar-SA', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <View style={styles.dayItems}>
                  {day.items.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <MaterialIcons
                        name="event-busy"
                        size={24}
                        color={`${trackColor}60`}
                      />
                      <Text style={[styles.emptyText, { textAlign, color: `${trackColor}80` }]}>
                        لا توجد دروس
                      </Text>
                    </View>
                  ) : (
                    day.items.map((item, itemIndex) => (
                      <View
                        key={`${item.lesson_id}-${itemIndex}`}
                        style={[
                          styles.dayItem,
                          {
                            borderColor: trackColor,
                            backgroundColor: `${trackColor}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.itemTitle, { textAlign, color: trackColor }]}
                          numberOfLines={2}
                        >
                          {item.lesson_title}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <Animated.View
          entering={SlideInDown.duration(400)}
          style={styles.actionsContainer}
        >
          <TouchableOpacity
            style={[styles.editButton, { borderColor: '#F59E0B' }]}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={20} color="#F59E0B" />
            <Text style={[styles.editButtonText, { color: '#F59E0B' }]}>عدّل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: trackColor }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>حفظ</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statsContainer: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  daysContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  daysScrollContent: {
    gap: 12,
  },
  dayCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  dayHeader: {
    padding: 12,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayItems: {
    padding: 12,
    minHeight: 200,
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 8,
  },
  dayItem: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});



