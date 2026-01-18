import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { GradientButton } from '@/components/ui/GradientButton';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function ScheduleSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const trackId = parseInt(params.trackId as string) || 1;
  
  const [loading, setLoading] = useState(true);
  const [examDate, setExamDate] = useState<Date | null>(null);
  const [hasExamDate, setHasExamDate] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  useEffect(() => {
    fetchScheduleData();
  }, [trackId]);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      // جلب بيانات الجدول من API
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching schedule data:', err);
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setExamDate(selectedDate);
      setHasExamDate(true);
    }
  };

  const handleUpdateExamDate = async () => {
    if (hasExamDate && examDate && examDate < new Date()) {
      Alert.alert('خطأ', 'يرجى اختيار تاريخ في المستقبل');
      return;
    }

    try {
      setSubmitting(true);
      
      const newExamDate = hasExamDate && examDate ? examDate.toISOString().split('T')[0] : null;
      
      const response = await api.put<{ ok: boolean; data: any }>(
        API_ENDPOINTS.SMART_SCHEDULE_UPDATE_EXAM_DATE,
        {
          track_id: trackId,
          exam_date: newExamDate,
        }
      );

      if (response && response.ok) {
        Alert.alert('نجح', 'تم تحديث موعد الاختبار بنجاح', [
          { text: 'حسناً', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء تحديث موعد الاختبار');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerate = () => {
    Alert.alert(
      'إعادة إنشاء الجدول',
      'سيتم أرشفة الجدول الحالي وإنشاء جدول جديد. هل تريد المتابعة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'متابعة',
          style: 'default',
          onPress: () => {
            // الانتقال إلى صفحة إعداد موعد الاختبار لإعادة إنشاء الجدول
            router.push({
              pathname: '/schedule/create/exam-date-setup',
              params: { trackId: trackId.toString() },
            });
          },
        },
      ]
    );
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
          <Text style={[styles.headerTitle, { textAlign }]}>إعدادات الجدول</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={[styles.section, { borderColor: `${trackColor}30` }]}>
            <View style={[styles.sectionHeader, { flexDirection }]}>
              <MaterialIcons name="event" size={24} color={trackColor} />
              <Text style={[styles.sectionTitle, { textAlign }]}>موعد الاختبار</Text>
            </View>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  hasExamDate && { 
                    backgroundColor: `${trackColor}20`,
                    borderColor: trackColor,
                  },
                  { flexDirection }
                ]}
                onPress={() => setHasExamDate(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={hasExamDate ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={24}
                  color={hasExamDate ? trackColor : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.optionLabel, { textAlign }]}>لدي موعد محدد</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  !hasExamDate && { 
                    backgroundColor: `${trackColor}20`,
                    borderColor: trackColor,
                  },
                  { flexDirection }
                ]}
                onPress={() => {
                  setHasExamDate(false);
                  setExamDate(null);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={!hasExamDate ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={24}
                  color={!hasExamDate ? trackColor : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.optionLabel, { textAlign }]}>لا يوجد موعد محدد</Text>
              </TouchableOpacity>
            </View>

            {hasExamDate && (
              <View style={styles.dateContainer}>
                <Text style={[styles.dateLabel, { textAlign }]}>موعد الاختبار</Text>
                <TouchableOpacity
                  style={[styles.dateButton, { flexDirection, borderColor: `${trackColor}40` }]}
                  onPress={() => setShowPicker(true)}
                >
                  <MaterialIcons name="calendar-today" size={20} color={trackColor} />
                  <Text style={[styles.dateText, { textAlign }]}>
                    {examDate
                      ? examDate.toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'اختر التاريخ'}
                  </Text>
                  <MaterialIcons name="chevron-down" size={20} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={examDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    locale="ar-SA"
                  />
                )}
              </View>
            )}

            <GradientButton
              title="تحديث الموعد"
              onPress={handleUpdateExamDate}
              loading={submitting}
              style={styles.updateButton}
              colors={[trackColor, `${trackColor}CC`]}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(500).delay(200)} style={[styles.section, { borderColor: `${trackColor}30` }]}>
            <View style={[styles.sectionHeader, { flexDirection }]}>
              <MaterialIcons name="refresh" size={24} color="#EF4444" />
              <Text style={[styles.sectionTitle, { textAlign }]}>إعادة توليد الجدول</Text>
            </View>
            <Text style={[styles.sectionDescription, { textAlign }]}>
              سيتم أرشفة الجدول الحالي وإعادة إنشاء جدول جديد. يمكنك اختيار موعد الاختبار ونوع الجدول من جديد
            </Text>
            <GradientButton
              title="إعادة توليد الجدول"
              onPress={handleRegenerate}
              loading={submitting}
              style={styles.regenerateButton}
              colors={['#EF4444', '#DC2626']}
            />
          </Animated.View>
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 20,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
    fontWeight: '500',
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  updateButton: {
    marginTop: 8,
  },
  regenerateButton: {
    marginTop: 8,
  },
});
