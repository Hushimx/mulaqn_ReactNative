import React, { useState } from 'react';
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
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';

export default function ExamDateSetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isRTL, flexDirection, textAlign } = useLanguage();
  const trackId = parseInt(params.trackId as string) || 1;
  
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasExamDate, setHasExamDate] = useState(true);

  const colors = getTrackColors(trackId);
  const trackColor = colors.primary;

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (hasExamDate && date < new Date()) {
      Alert.alert('خطأ', 'يرجى اختيار تاريخ في المستقبل');
      return;
    }

    try {
      setSubmitting(true);
      
      const examDate = hasExamDate ? date.toISOString().split('T')[0] : null;
      
      const response = await api.post<{ ok: boolean; data: any }>(
        API_ENDPOINTS.SMART_SCHEDULE_SET_EXAM_DATE,
        {
          track_id: trackId,
          exam_date: examDate,
        }
      );

      if (response && response.ok) {
        Alert.alert('نجح', 'تم إنشاء الجدول بنجاح', [
          { text: 'حسناً', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'حدث خطأ أثناء إنشاء الجدول');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={[styles.headerTitle, { textAlign }]}>إعداد موعد الاختبار</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(500)} style={[styles.infoCard, { borderColor: `${trackColor}40` }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: `${trackColor}20` }]}>
              <MaterialIcons name="info-outline" size={40} color={trackColor} />
            </View>
            <Text style={[styles.infoText, { textAlign }]}>
              حدد موعد اختبارك لنساعدك في إنشاء جدول دراسي مناسب
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.optionsContainer}>
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
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { textAlign }]}>لدي موعد اختبار محدد</Text>
                <Text style={[styles.optionSubtitle, { textAlign }]}>
                  سننشئ جدول دراسي مخصص بناءً على موعدك
                </Text>
              </View>
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
              onPress={() => setHasExamDate(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={!hasExamDate ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={24}
                color={!hasExamDate ? trackColor : 'rgba(255,255,255,0.5)'}
              />
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { textAlign }]}>لا يوجد موعد محدد</Text>
                <Text style={[styles.optionSubtitle, { textAlign }]}>
                  سننشئ جدول دراسي مرن
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {hasExamDate && (
            <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.dateContainer}>
              <Text style={[styles.dateLabel, { textAlign }]}>موعد الاختبار</Text>
              <TouchableOpacity
                style={[styles.dateButton, { flexDirection, borderColor: `${trackColor}40` }]}
                onPress={() => setShowPicker(true)}
              >
                <MaterialIcons name="calendar-today" size={20} color={trackColor} />
                <Text style={[styles.dateText, { textAlign }]}>
                  {date.toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <MaterialIcons name="chevron-down" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  locale="ar-SA"
                />
              )}
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.duration(500).delay(600)}>
            <GradientButton
              title={submitting ? 'جاري الإنشاء...' : 'إنشاء الجدول'}
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitButton}
              colors={[trackColor, `${trackColor}CC`]}
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
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
  },
  infoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 26,
    fontWeight: '500',
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  optionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  dateContainer: {
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
  },
});
