import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AnimatedDots from '../components/AnimatedDots';
import { GradientBackground } from '../components/ui/GradientBackground';
import { BRAND_COLORS, SHADOWS, SPACING } from '../constants/Theme';
import { markFirstTimeCompleted } from '../utils/firstTimeUser';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingFeature {
  text: string;
}

const onboardingFeatures: OnboardingFeature[] = [
  { text: 'فقط 150 ريال شهريا' },
  { text: 'وصول غير محدود لكل المواد والمستويات' },
  { text: 'دروس تفاعلية وفيديوهات تعليمية ممتعة' },
  { text: 'اختبارات وتمارين بعد كل درس للتأكد من الفهم' },
  { text: 'تحديثات مستمرة للمناهج والدروس الجديدة' },
  { text: 'دعم فني متواصل لمساعدة أولياء الأمور والطلاب' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentStep < 2) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * screenWidth,
        animated: true,
      });
    } else {
      handleSkip();
    }
  };

  const handleSkip = async () => {
    try {
      await markFirstTimeCompleted();
      router.replace('/(tabs)');
    } catch {
      router.replace('/(tabs)');
    }
  };

  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / screenWidth);
    if (step >= 0 && step <= 2) {
      setCurrentStep(step);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={screenWidth}
            snapToAlignment="start"
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Step 1 */}
            <View style={styles.stepContainer}>
              {/* Illustration */}
              <View style={styles.illustrationContainer}>
                <Image 
                  source={require('../assets/images/onboarding/A Plus Wow Sticker by Pudgy Penguins 2.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>

              {/* Title */}
              <Text style={styles.title}>تعلم بمتعة وسهولة!</Text>

              {/* Features List */}
              <View style={styles.featuresContainer}>
                {onboardingFeatures.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <MaterialIcons 
                      name="check-circle" 
                      size={20} 
                      color={BRAND_COLORS.primary} 
                      style={styles.checkIcon}
                    />
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepContainer}>
              <View style={styles.illustrationContainer}>
                <Image 
                  source={require('../assets/images/onboarding/A Plus Wow Sticker by Pudgy Penguins 2.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>دروس تفاعلية</Text>
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>محتوى تعليمي شامل</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>فيديوهات عالية الجودة</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>تمارين تفاعلية</Text>
                </View>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepContainer}>
              <View style={styles.illustrationContainer}>
                <Image 
                  source={require('../assets/images/onboarding/A Plus Wow Sticker by Pudgy Penguins 2.png')}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>تتبع التقدم</Text>
              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>تقارير مفصلة عن الأداء</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>شهادات إتمام</Text>
                </View>
                <View style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={20} color={BRAND_COLORS.primary} style={styles.checkIcon} />
                  <Text style={styles.featureText}>إحصائيات شاملة</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Section - Fixed */}
          <View style={styles.bottomSection}>
            {/* Progress Dots */}
            <View style={styles.dotsWrapper}>
              <AnimatedDots
                count={3}
                activeIndex={currentStep}
                dotColor="#FFFFFF"
                activeDotColor={BRAND_COLORS.primary}
                dotSize={8}
                activeDotSize={8}
                duration={300}
                gap={8}
              />
            </View>

            {/* Next Button */}
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>التالي</Text>
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  stepContainer: {
    width: screenWidth,
    flex: 1,
    paddingTop: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
    paddingBottom: 140, // Space for fixed buttons and dots
  },
  illustrationContainer: {
    width: '100%',
    height: screenHeight * 0.32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  illustration: {
    width: screenWidth * 0.65,
    height: screenHeight * 0.32,
    maxWidth: 280,
    maxHeight: 280,
  },
  dotsWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Cairo-Bold',
    color: BRAND_COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: SPACING.sm,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  checkIcon: {
    marginTop: 1,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: BRAND_COLORS.text.primary,
    lineHeight: 20,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 12,
    backgroundColor: 'transparent',
  },
  nextButton: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#0B1E33',
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: SPACING['2xl'],
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: 'Cairo-SemiBold',
    color: BRAND_COLORS.primary,
    textAlign: 'center',
  },
});