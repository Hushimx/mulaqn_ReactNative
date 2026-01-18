import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  ZoomIn,
  SlideInDown,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function ExamDateSetup() {
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

  const [hasExamDate, setHasExamDate] = useState<boolean | null>(null);
  const [examDate, setExamDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const handleContinue = () => {
    if (hasExamDate === null) {
      return;
    }

    router.push({
      pathname: '/schedule/create',
      params: {
        trackId: trackId.toString(),
        hasExamDate: hasExamDate ? 'true' : 'false',
        examDate: hasExamDate ? examDate.toISOString().split('T')[0] : '',
      },
    });
  };

  const handleSelectOption = (hasDate: boolean) => {
    setHasExamDate(hasDate);
    if (hasDate) {
      setTempDate(examDate);
      setShowDatePicker(true);
    }
  };

  const handleDateConfirm = () => {
    setExamDate(tempDate);
    setShowDatePicker(false);
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
          إعداد الجدول
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.iconContainer}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${trackColor}33` }]}>
            <MaterialIcons name="event" size={64} color={trackColor} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Text style={[styles.title, { textAlign, color: trackColor }]}>
            هل لديك موعد اختبار محدد؟
          </Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            اختر موعد الاختبار لتوزيع الدروس بشكل أفضل، أو اختر جدول مرن لمدة 90 يوم
          </Text>
        </Animated.View>

        <View style={styles.optionsContainer}>
          <AnimatedTouchable
            entering={FadeInUp.duration(400).delay(200)}
            style={[
              styles.optionCard,
              {
                borderColor: hasExamDate === true ? trackColor : `${trackColor}40`,
                borderWidth: hasExamDate === true ? 3 : 2,
                backgroundColor:
                  hasExamDate === true ? `${trackColor}20` : `${trackColor}10`,
              },
            ]}
            onPress={() => handleSelectOption(true)}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <View
                style={[
                  styles.optionIconContainer,
                  {
                    backgroundColor:
                      hasExamDate === true ? trackColor : `${trackColor}40`,
                  },
                ]}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={32}
                  color={hasExamDate === true ? '#FFFFFF' : trackColor}
                />
              </View>
              {hasExamDate === true && (
                <Animated.View
                  entering={ZoomIn.duration(200)}
                  style={[styles.checkBadge, { backgroundColor: trackColor }]}
                >
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                </Animated.View>
              )}
            </View>
            <Text style={[styles.optionTitle, { textAlign, color: trackColor }]}>
              نعم، لدي موعد اختبار
            </Text>
            <Text style={[styles.optionDescription, { textAlign }]}>
              سأختار تاريخ الاختبار لتوزيع الدروس بشكل محسّن
            </Text>
            {hasExamDate === true && (
              <Animated.View
                entering={SlideInDown.duration(300)}
                style={styles.datePreview}
              >
                <MaterialIcons name="event-available" size={20} color={trackColor} />
                <Text style={[styles.datePreviewText, { textAlign, color: trackColor }]}>
                  {examDate.toLocaleDateString('ar-SA', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTempDate(examDate);
                    setShowDatePicker(true);
                  }}
                  style={[styles.editDateButton, { backgroundColor: trackColor }]}
                >
                  <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </AnimatedTouchable>

          <AnimatedTouchable
            entering={FadeInUp.duration(400).delay(300)}
            style={[
              styles.optionCard,
              {
                borderColor: hasExamDate === false ? trackColor : `${trackColor}40`,
                borderWidth: hasExamDate === false ? 3 : 2,
                backgroundColor:
                  hasExamDate === false ? `${trackColor}20` : `${trackColor}10`,
              },
            ]}
            onPress={() => handleSelectOption(false)}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <View
                style={[
                  styles.optionIconContainer,
                  {
                    backgroundColor:
                      hasExamDate === false ? trackColor : `${trackColor}40`,
                  },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={32}
                  color={hasExamDate === false ? '#FFFFFF' : trackColor}
                />
              </View>
              {hasExamDate === false && (
                <Animated.View
                  entering={ZoomIn.duration(200)}
                  style={[styles.checkBadge, { backgroundColor: trackColor }]}
                >
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                </Animated.View>
              )}
            </View>
            <Text style={[styles.optionTitle, { textAlign, color: trackColor }]}>
              لا، جدول مرن
            </Text>
            <Text style={[styles.optionDescription, { textAlign }]}>
              جدول مرن لمدة 90 يوم بدون موعد محدد
            </Text>
          </AnimatedTouchable>
        </View>

        <Animated.View entering={SlideInDown.duration(400).delay(400)}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor:
                  hasExamDate !== null ? trackColor : `${trackColor}60`,
              },
            ]}
            onPress={handleContinue}
            disabled={hasExamDate === null}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>متابعة</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

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
                  اختر تاريخ الاختبار
                </Text>
                <TouchableOpacity
                  onPress={handleDateConfirm}
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
    marginBottom: 32,
    marginTop: 20,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    lineHeight: 24,
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 40,
  },
  optionCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    minHeight: 180,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
  },
  datePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  datePreviewText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  editDateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
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



