import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientBackground } from './ui/GradientBackground';
import { useLanguage } from '@/contexts/LanguageContext';

interface SubscriptionRequiredScreenProps {
  trackName: string;
  trackId: number;
  trackColor?: string;
}

export function SubscriptionRequiredScreen({
  trackName,
  trackId,
  trackColor = '#D4AF37',
}: SubscriptionRequiredScreenProps) {
  const router = useRouter();
  const { textAlign, flexDirection } = useLanguage();

  const handleSubscribe = () => {
    router.push(`/subscription/${trackId}`);
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { borderColor: trackColor }]}>
              <MaterialIcons name="lock" size={64} color={trackColor} />
            </View>
          </View>

          <Text style={[styles.title, { textAlign }]}>
            يتطلب اشتراك
          </Text>

          <Text style={[styles.description, { textAlign }]}>
            يجب عليك الاشتراك في مسار {trackName} للوصول للمحتوى والاختبارات والدروس
          </Text>

          <View style={styles.featuresContainer}>
            <View style={[styles.featureItem, { flexDirection }]}>
              <MaterialIcons name="check-circle" size={20} color={trackColor} />
              <Text style={[styles.featureText, { textAlign }]}>
                الوصول لجميع الاختبارات
              </Text>
            </View>
            <View style={[styles.featureItem, { flexDirection }]}>
              <MaterialIcons name="check-circle" size={20} color={trackColor} />
              <Text style={[styles.featureText, { textAlign }]}>
                الوصول لجميع الدروس
              </Text>
            </View>
            <View style={[styles.featureItem, { flexDirection }]}>
              <MaterialIcons name="check-circle" size={20} color={trackColor} />
              <Text style={[styles.featureText, { textAlign }]}>
                متابعة تقدمك وإحصائياتك
              </Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.subscribeButton, { backgroundColor: trackColor }]}
              onPress={handleSubscribe}
              activeOpacity={0.8}
            >
              <MaterialIcons name="card-membership" size={24} color="#FFFFFF" />
              <Text style={styles.subscribeButtonText}>اشترك الآن</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>العودة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 15,
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});


