import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  ScaleIn,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import { Alert } from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface DaySelector {
  id: string;
  name: string;
  value: number;
}

const days: DaySelector[] = [
  { id: 'sunday', name: 'الأحد', value: 2 },
  { id: 'monday', name: 'الاثنين', value: 3 },
  { id: 'tuesday', name: 'الثلاثاء', value: 2 },
  { id: 'wednesday', name: 'الأربعاء', value: 3 },
  { id: 'thursday', name: 'الخميس', value: 2 },
];

export default function ScheduleCreateShort() {
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

  const [dayChoices, setDayChoices] = useState<Record<string, number>>({
    sunday: 2,
    monday: 3,
    tuesday: 2,
    wednesday: 3,
    thursday: 2,
  });
  const [loading, setLoading] = useState(false);

  const handleDayChange = (dayId: string, increment: boolean) => {
    setDayChoices((prev) => {
      const current = prev[dayId] || 0;
      const newValue = increment
        ? Math.min(3, current + 1)
        : Math.max(0, current - 1);
      return { ...prev, [dayId]: newValue };
    });
  };

  const hasExamDate = params.hasExamDate === 'true';
  const examDate = params.examDate as string;

  const handlePreview = async () => {
    try {
      setLoading(true);
      
      const requestData: any = {
        type: 'short',
        track_id: trackId,
        ...dayChoices,
      };

      if (hasExamDate && examDate) {
        requestData.exam_date = examDate;
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
            type: 'short',
            hasExamDate: hasExamDate ? 'true' : 'false',
            examDate: examDate || '',
            ...Object.entries(dayChoices).reduce((acc, [key, value]) => {
              acc[key] = value.toString();
              return acc;
            }, {} as Record<string, string>),
          },
        });
      } else {
        Alert.alert('خطأ', 'فشل في معاينة الجدول');
      }
    } catch (err: any) {
      logger.error('Error previewing schedule:', err);
      Alert.alert('خطأ', 'حدث خطأ أثناء معاينة الجدول');
    } finally {
      setLoading(false);
    }
  };

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
          جدول مختصر
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${trackColor}33` }]}>
            <MaterialIcons name="speed" size={48} color={trackColor} />
          </View>
        </View>

        <Text style={[styles.title, { textAlign, color: trackColor }]}>
          اختر عدد الدروس لكل يوم
        </Text>
        <Text style={[styles.subtitle, { textAlign }]}>
          الجمعة: بدون دروس | السبت: درس واحد
        </Text>

        <View style={styles.daysContainer}>
          {days.map((day, index) => {
            const value = dayChoices[day.id] || 0;
            return (
              <Animated.View
                key={day.id}
                entering={FadeInUp.duration(400).delay(index * 100)}
                style={[
                  styles.dayCard,
                  {
                    borderColor: trackColor,
                    backgroundColor: `${trackColor}15`,
                  },
                ]}
              >
                <Text style={[styles.dayName, { textAlign, color: trackColor }]}>
                  {day.name}
                </Text>

                <View style={[styles.selectorContainer, { flexDirection }]}>
                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      {
                        backgroundColor: value === 0 ? `${trackColor}40` : trackColor,
                      },
                    ]}
                    onPress={() => handleDayChange(day.id, false)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="remove"
                      size={20}
                      color={value === 0 ? '#9CA3AF' : '#FFFFFF'}
                    />
                  </TouchableOpacity>

                  <View style={[styles.valueContainer, { backgroundColor: `${trackColor}33` }]}>
                    <Text style={[styles.valueText, { color: trackColor }]}>
                      {value}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.selectorButton,
                      {
                        backgroundColor: value === 3 ? `${trackColor}40` : trackColor,
                      },
                    ]}
                    onPress={() => handleDayChange(day.id, true)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name="add"
                      size={20}
                      color={value === 3 ? '#9CA3AF' : '#FFFFFF'}
                    />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.previewButton, { backgroundColor: trackColor }]}
          onPress={handlePreview}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  daysContainer: {
    gap: 16,
    marginBottom: 32,
  },
  dayCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  dayName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  selectorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueContainer: {
    minWidth: 60,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  valueText: {
    fontSize: 24,
    fontWeight: 'bold',
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
});

