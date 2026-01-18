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
  ZoomIn,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { logger } from '@/utils/logger';
import { Alert } from 'react-native';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type PresetType = 'balanced' | 'intensive' | 'light';

interface Preset {
  id: PresetType;
  title: string;
  description: string;
  icon: string;
}

const presets: Preset[] = [
  {
    id: 'balanced',
    title: 'متوازن',
    description: '2-3 دروس يومياً - توزيع متوازن',
    icon: 'balance',
  },
  {
    id: 'intensive',
    title: 'مكثف',
    description: '3-4 دروس يومياً - برنامج مكثف',
    icon: 'speed',
  },
  {
    id: 'light',
    title: 'خفيف',
    description: '1-2 دروس يومياً - برنامج خفيف',
    icon: 'favorite',
  },
];

export default function ScheduleCreateAuto() {
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

  const [selectedPreset, setSelectedPreset] = useState<PresetType>('balanced');
  const [loading, setLoading] = useState(false);

  const hasExamDate = params.hasExamDate === 'true';
  const examDate = params.examDate as string;

  const handlePreview = async () => {
    try {
      setLoading(true);
      
      const requestData: any = {
        type: 'auto',
        track_id: trackId,
        preset: selectedPreset,
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
            type: 'auto',
            preset: selectedPreset,
            hasExamDate: hasExamDate ? 'true' : 'false',
            examDate: examDate || '',
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
          جدول تلقائي
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
            <MaterialIcons name="auto-awesome" size={48} color={trackColor} />
          </View>
        </View>

        <Text style={[styles.title, { textAlign, color: trackColor }]}>
          اختر نمط الجدول
        </Text>
        <Text style={[styles.subtitle, { textAlign }]}>
          سيتم توزيع الدروس تلقائياً حسب النمط المختار
        </Text>

        <View style={styles.presetsContainer}>
          {presets.map((preset, index) => {
            const isSelected = selectedPreset === preset.id;
            return (
              <AnimatedTouchable
                key={preset.id}
                entering={FadeInUp.duration(400).delay(index * 100)}
                style={[
                  styles.presetCard,
                  {
                    borderColor: isSelected ? trackColor : `${trackColor}40`,
                    borderWidth: isSelected ? 2 : 1,
                    backgroundColor: isSelected
                      ? `${trackColor}20`
                      : 'rgba(255, 255, 255, 0.05)',
                  },
                ]}
                onPress={() => setSelectedPreset(preset.id)}
                activeOpacity={0.8}
              >
                <View style={styles.presetHeader}>
                  <View
                    style={[
                      styles.presetIconContainer,
                      { backgroundColor: `${trackColor}33` },
                    ]}
                  >
                    <MaterialIcons
                      name={preset.icon as any}
                      size={28}
                      color={trackColor}
                    />
                  </View>
                  {isSelected && (
                    <Animated.View
                      entering={ZoomIn.duration(200)}
                      style={[styles.checkIcon, { backgroundColor: trackColor }]}
                    >
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    </Animated.View>
                  )}
                </View>

                <Text style={[styles.presetTitle, { textAlign, color: trackColor }]}>
                  {preset.title}
                </Text>
                <Text style={[styles.presetDescription, { textAlign }]}>
                  {preset.description}
                </Text>
              </AnimatedTouchable>
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
  presetsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  presetCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  presetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  presetDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
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

