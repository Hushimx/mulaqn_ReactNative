import React, { useLayoutEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  ScaleIn,
  ZoomIn,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTrackColors } from '@/contexts/TrackContext';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ScheduleTypeCard {
  id: 'auto' | 'short' | 'custom';
  title: string;
  description: string;
  icon: string;
  badge?: string;
  color: string;
}

export default function ScheduleCreateIndex() {
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

  const scheduleTypes: ScheduleTypeCard[] = [
    {
      id: 'auto',
      title: 'تلقائي',
      description: 'إنشاء جدول ذكي تلقائياً حسب مستواك',
      icon: 'auto-awesome',
      badge: 'الأفضل',
      color: trackColor,
    },
    {
      id: 'short',
      title: 'مختصر',
      description: 'اختر عدد الدروس لكل يوم بسرعة',
      icon: 'speed',
      color: trackColor,
    },
    {
      id: 'custom',
      title: 'بنفسك',
      description: 'صمم جدولك بنفسك بالكامل',
      icon: 'edit',
      color: trackColor,
    },
  ];

  const handleSelectType = (type: 'auto' | 'short' | 'custom') => {
    // Check if exam date info is already provided
    const hasExamDate = params.hasExamDate === 'true';
    const examDate = params.examDate as string;

    router.push({
      pathname: `/schedule/create/${type}`,
      params: {
        trackId: trackId.toString(),
        hasExamDate: hasExamDate ? 'true' : 'false',
        examDate: examDate || '',
      },
    });
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
          إنشاء جدول ذكي
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { textAlign }]}>
          اختر طريقة إنشاء الجدول
        </Text>

        <View style={styles.cardsContainer}>
          {scheduleTypes.map((type, index) => (
            <AnimatedTouchable
              key={type.id}
              entering={FadeInUp.duration(400).delay(index * 100)}
              style={[
                styles.card,
                {
                  borderColor: type.color,
                  backgroundColor: `${type.color}15`,
                },
              ]}
              onPress={() => handleSelectType(type.id)}
              activeOpacity={0.8}
            >
              {type.badge && (
                <Animated.View
                  entering={ZoomIn.duration(300).delay(200)}
                  style={[styles.badge, { backgroundColor: type.color }]}
                >
                  <Text style={styles.badgeText}>{type.badge}</Text>
                </Animated.View>
              )}

              <View style={styles.cardIconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: `${type.color}33` }]}>
                  <MaterialIcons name={type.icon as any} size={32} color={type.color} />
                </View>
              </View>

              <Text style={[styles.cardTitle, { textAlign, color: type.color }]}>
                {type.title}
              </Text>

              <Text style={[styles.cardDescription, { textAlign }]}>
                {type.description}
              </Text>

              <View style={[styles.cardFooter, { flexDirection }]}>
                <Text style={[styles.cardAction, { color: type.color }]}>
                  ابدأ الآن
                </Text>
                <MaterialIcons
                  name={isRTL ? 'arrow-back' : 'arrow-forward'}
                  size={20}
                  color={type.color}
                />
              </View>
            </AnimatedTouchable>
          ))}
        </View>
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
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cardAction: {
    fontSize: 16,
    fontWeight: '600',
  },
});

