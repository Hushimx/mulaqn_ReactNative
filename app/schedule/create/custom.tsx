import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DayColumn } from '@/components/schedule/DayColumn';
import { DraggableLesson } from '@/components/schedule/DraggableLesson';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface Lesson {
  id: number;
  title: string;
  difficulty?: string;
}

interface ScheduleItem {
  date: string;
  lesson_id: number;
  sort_order: number;
}

export default function ScheduleCreateCustom() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const trackId = parseInt(params.trackId as string) || 1;
  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  // إخفاء Expo Router header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const hasExamDateParam = params.hasExamDate === 'true';
  const examDateParam = params.examDate as string;
  const [hasExamDate, setHasExamDate] = useState<boolean>(hasExamDateParam);
  const [examDate, setExamDate] = useState<Date>(
    examDateParam ? new Date(examDateParam) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ ok: boolean; data: Lesson[] }>(
        API_ENDPOINTS.LESSONS(trackId)
      );

      if (response && response.ok && response.data) {
        setLessons(response.data);
      }
    } catch (err: any) {
      logger.error('Error fetching lessons:', err);
      Alert.alert('خطأ', 'فشل في تحميل الدروس');
    } finally {
      setLoading(false);
    }
  };

  const getUsageCount = (lessonId: number): number => {
    return scheduleItems.filter((item) => item.lesson_id === lessonId).length;
  };

  const getSortedLessons = (): Lesson[] => {
    return [...lessons].sort((a, b) => {
      const countA = getUsageCount(a.id);
      const countB = getUsageCount(b.id);
      return countA - countB;
    });
  };

  const generateDays = (): Array<{ date: string; dayName: string; dayNumber: number }> => {
    const days: Array<{ date: string; dayName: string; dayNumber: number }> = [];
    const startDate = new Date();
    const endDate = new Date();

    if (hasExamDate) {
      endDate.setTime(examDate.getTime());
    } else {
      // جدول مرن 90 يوم
      endDate.setDate(startDate.getDate() + 90);
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayName = current.toLocaleDateString('ar-SA', { weekday: 'long' });
      days.push({
        date: dateStr,
        dayName,
        dayNumber: current.getDate(),
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const handleLessonSelect = (lessonId: number) => {
    setSelectedLesson(lessonId);
  };

  const handleDayPress = (date: string) => {
    if (!selectedLesson) {
      Alert.alert('تنبيه', 'يرجى اختيار درس أولاً');
      return;
    }

    const existingItems = scheduleItems.filter(
      (item) => item.date === date && item.lesson_id === selectedLesson
    );

    if (existingItems.length > 0) {
      Alert.alert('تنبيه', 'هذا الدرس موجود بالفعل في هذا اليوم');
      return;
    }

    const sortOrder = scheduleItems.filter((item) => item.date === date).length;
    setScheduleItems([
      ...scheduleItems,
      {
        date,
        lesson_id: selectedLesson,
        sort_order: sortOrder,
      },
    ]);

    setSelectedLesson(null);
  };

  const handleRemoveItem = (date: string, lessonId: number) => {
    setScheduleItems(scheduleItems.filter(
      (item) => !(item.date === date && item.lesson_id === lessonId)
    ));
  };

  const handlePreview = async () => {
    if (scheduleItems.length === 0) {
      Alert.alert('تنبيه', 'يرجى إضافة دروس إلى الجدول أولاً');
      return;
    }

    try {
      setPreviewLoading(true);

      const requestData: any = {
        type: 'custom',
        track_id: trackId,
        items: scheduleItems,
      };

      if (hasExamDate) {
        requestData.exam_date = examDate.toISOString().split('T')[0];
      } else {
        requestData.duration_days = 90;
      }

      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.SMART_SCHEDULE_PREVIEW,
        requestData
      );

      if (response && response.ok && response.data) {
        router.push({
          pathname: '/schedule/create/preview',
          params: {
            trackId: trackId.toString(),
            type: 'custom',
            hasExamDate: hasExamDate ? 'true' : 'false',
            examDate: hasExamDate ? examDate.toISOString().split('T')[0] : '',
          },
        });
      } else {
        Alert.alert('خطأ', 'فشل في معاينة الجدول');
      }
    } catch (err: any) {
      logger.error('Error previewing schedule:', err);
      Alert.alert('خطأ', 'حدث خطأ أثناء معاينة الجدول');
    } finally {
      setPreviewLoading(false);
    }
  };

  const days = generateDays();
  const sortedLessons = getSortedLessons();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={trackColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { flexDirection }]}
        >
          <MaterialIcons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { textAlign }]}>
          تصميم بنفسك
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Exam Date Info and Edit */}
        <View style={styles.examDateSection}>
          <View style={[styles.examDateCard, { borderColor: trackColor, backgroundColor: `${trackColor}15` }]}>
            <View style={[styles.examDateHeader, { flexDirection }]}>
              <View style={[styles.examDateIconContainer, { backgroundColor: `${trackColor}33` }]}>
                <MaterialIcons
                  name={hasExamDate ? 'event' : 'schedule'}
                  size={24}
                  color={trackColor}
                />
              </View>
              <View style={styles.examDateInfo}>
                <Text style={[styles.examDateLabel, { textAlign, color: trackColor }]}>
                  {hasExamDate ? 'موعد الاختبار' : 'جدول مرن'}
                </Text>
                <Text style={[styles.examDateValue, { textAlign }]}>
                  {hasExamDate
                    ? examDate.toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '90 يوم بدون موعد محدد'}
                </Text>
              </View>
              {hasExamDate && (
                <TouchableOpacity
                  style={[styles.editDateButton, { backgroundColor: trackColor }]}
                  onPress={() => {
                    setTempDate(examDate);
                    setShowDatePicker(true);
                  }}
                >
                  <MaterialIcons name="edit" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Date Picker Modal for iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.modalCancelButton}
                  >
                    <Text style={styles.modalCancelText}>إلغاء</Text>
                  </TouchableOpacity>
                  <Text style={[styles.modalTitle, { color: trackColor }]}>
                    تعديل تاريخ الاختبار
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setExamDate(tempDate);
                      setShowDatePicker(false);
                    }}
                    style={[styles.modalDoneButton, { backgroundColor: trackColor }]}
                  >
                    <Text style={styles.modalDoneText}>تم</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempDate(selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                  style={styles.datePickerIOS}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Date Picker for Android */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setExamDate(selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )}

        {/* Lessons List */}
        <View style={styles.lessonsSection}>
          <Text style={[styles.sectionTitle, { textAlign, color: trackColor }]}>
            الدروس المتاحة
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lessonsList}
          >
            {sortedLessons.map((lesson, index) => {
              const isSelected = selectedLesson === lesson.id;
              return (
                <AnimatedTouchable
                  key={lesson.id}
                  entering={FadeInUp.duration(400).delay(index * 50)}
                  style={[
                    styles.lessonCard,
                    {
                      borderColor: isSelected ? trackColor : `${trackColor}40`,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: isSelected ? `${trackColor}20` : `${trackColor}10`,
                    },
                  ]}
                  onPress={() => handleLessonSelect(lesson.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.lessonTitle, { textAlign, color: trackColor }]}
                    numberOfLines={2}
                  >
                    {lesson.title}
                  </Text>
                  <View style={[styles.lessonFooter, { flexDirection }]}>
                    <View style={[styles.countBadge, { backgroundColor: trackColor }]}>
                      <Text style={styles.countText}>
                        {getUsageCount(lesson.id)}
                      </Text>
                    </View>
                    {isSelected && (
                      <Animated.View entering={ZoomIn.duration(200)}>
                        <MaterialIcons name="check-circle" size={20} color={trackColor} />
                      </Animated.View>
                    )}
                  </View>
                </AnimatedTouchable>
              );
            })}
          </ScrollView>
        </View>

        {/* Days Scroll */}
        <View style={styles.daysSection}>
          <Text style={[styles.sectionTitle, { textAlign, color: trackColor }]}>
            الأيام ({days.length} يوم)
          </Text>
          <Text style={[styles.instructionText, { textAlign }]}>
            {selectedLesson
              ? 'اضغط على يوم لإضافة الدرس المحدد'
              : 'اختر درساً ثم اضغط على يوم لإضافته'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysList}
            style={styles.daysScroll}
          >
            {days.map((day) => {
              const dayItems = scheduleItems
                .filter((item) => item.date === day.date)
                .map((item) => {
                  const lesson = lessons.find((l) => l.id === item.lesson_id);
                  return {
                    lesson_id: item.lesson_id,
                    lesson_title: lesson?.title || 'درس غير محدد',
                  };
                });

              return (
                <TouchableOpacity
                  key={day.date}
                  onPress={() => handleDayPress(day.date)}
                  activeOpacity={0.8}
                >
                  <DayColumn
                    date={day.date}
                    dayName={day.dayName}
                    dayNumber={day.dayNumber}
                    items={dayItems}
                    trackColor={trackColor}
                    isRTL={isRTL}
                    textAlign={textAlign}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Preview Button */}
        <TouchableOpacity
          style={[styles.previewButton, { backgroundColor: trackColor }]}
          onPress={handlePreview}
          disabled={previewLoading}
          activeOpacity={0.8}
        >
          {previewLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <MaterialIcons name="preview" size={20} color="#FFFFFF" />
              <Text style={styles.previewButtonText}>معاينة الجدول</Text>
            </>
          )}
        </TouchableOpacity>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  examDateSection: {
    marginBottom: 24,
  },
  examDateCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  examDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examDateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  examDateInfo: {
    flex: 1,
  },
  examDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  examDateValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editDateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  lessonsList: {
    gap: 12,
  },
  lessonCard: {
    width: 160,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    minHeight: 120,
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    flex: 1,
  },
  lessonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysSection: {
    marginBottom: 32,
  },
  instructionText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  daysScroll: {
    maxHeight: 300,
  },
  daysList: {
    gap: 12,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalDoneButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerIOS: {
    height: 200,
    marginTop: 10,
  },
});

