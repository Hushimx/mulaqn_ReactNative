import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    I18nManager,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import RiveAnimation from '../components/onboarding/RiveAnimation';
import { GradientBackground } from '../components/ui/GradientBackground';
import { ParticlesBackground } from '../components/ui/ParticlesBackground';
import { BRAND_COLORS, SPACING } from '../constants/Theme';
import { markFirstTimeCompleted } from '../utils/firstTimeUser';
import { useLanguage } from '../contexts/LanguageContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// إعدادات الأنيميشنز - بسيطة وواضحة
const animationConfig = [
  {
    src: require('../assets/animations/onboarding/owl_sc_1.riv'),
    autoPlay: true,
    delay: 0,
  },
  {
    src: require('../assets/animations/onboarding/owl_sc_2_new_animation.riv'),
    autoPlay: true,
    delay: 0,
  },
  {
    src: require('../assets/animations/onboarding/owl_sc_3_new_animation.riv'),
    autoPlay: true,
    delay: 0,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const pageX = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Debug: Check RTL status (DEV only) - log once on mount
  useEffect(() => {
    if (__DEV__) {
      console.log({ isRTL: I18nManager.isRTL, langIsRTL: isRTL });
    }
  }, []); // Empty dependency array - log only once
  
  // Button animations
  // Calculate width accounting for padding
  const containerPadding = SPACING.lg * 2; // padding on both sides (24px * 2 = 48px)
  const buttonGap = SPACING.md; // gap between buttons in step 1/2 (16px)
  const availableWidth = screenWidth - containerPadding; // available width for buttons
  
  // Step 0: 90% of available width
  const step0Width = availableWidth * 0.9;
  // Step 1/2: 45% of available width (with gap between buttons)
  const step12Width = (availableWidth - buttonGap) / 2;
  
  const nextButtonWidth = useRef(new Animated.Value(step0Width)).current;
  const prevButtonWidth = useRef(new Animated.Value(0)).current;
  const prevButtonOpacity = useRef(new Animated.Value(0)).current;
  
  // Indicators animations
  const [activeIndicator, setActiveIndicator] = useState(0);
  const indicatorRotate = useRef(new Animated.Value(0)).current;
  const rotateAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const indicatorOpacity = useRef([
    new Animated.Value(1), // First indicator starts active (Step 0)
    new Animated.Value(0.4),
    new Animated.Value(0.4),
  ]).current;
  const indicatorBorderOpacity = useRef([
    new Animated.Value(1), // First indicator border starts visible (Step 0)
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  
  // Feature animations (per step, isolated)
  const featureScale = useRef([
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 0
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 1
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 2
  ]).current;
  const featureGlow = useRef([
    [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)], // Step 0
    [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)], // Step 1
    [new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)], // Step 2
  ]).current;
  const featureBorderOpacity = useRef([
    [new Animated.Value(0.5), new Animated.Value(0.5), new Animated.Value(0.5)], // Step 0
    [new Animated.Value(0.5), new Animated.Value(0.5), new Animated.Value(0.5)], // Step 1
    [new Animated.Value(0.5), new Animated.Value(0.5), new Animated.Value(0.5)], // Step 2
  ]).current;
  const featureBulletPulse = useRef([
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 0
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 1
    [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)], // Step 2
  ]).current;
  const bulletPulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const featureCycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featureCycleAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  
  // Pulse animation for active bullet icon
  const startBulletPulse = (stepIndex: number, featureIndex: number) => {
    // Stop previous pulse
    if (bulletPulseAnimationRef.current) {
      bulletPulseAnimationRef.current.stop();
    }
    
    // Reset pulse value
    featureBulletPulse[stepIndex][featureIndex].setValue(1);
    
    // Create pulse loop
    const pulse = () => {
      bulletPulseAnimationRef.current = Animated.sequence([
        Animated.timing(featureBulletPulse[stepIndex][featureIndex], {
          toValue: 1.15,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureBulletPulse[stepIndex][featureIndex], {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      
      bulletPulseAnimationRef.current.start(({ finished }) => {
        if (finished) {
          pulse(); // Loop
        }
      });
    };
    
    pulse();
  };
  
  // Auto-cycling function (isolated per step)
  const startFeatureCycling = (stepIndex: number) => {
    // Cleanup previous
    if (featureCycleTimeoutRef.current) {
      clearTimeout(featureCycleTimeoutRef.current);
    }
    if (featureCycleAnimationRef.current) {
      featureCycleAnimationRef.current.stop();
    }
    
    // Reset all features in current step to normal
    featureScale[stepIndex].forEach(anim => anim.setValue(1));
    featureGlow[stepIndex].forEach(anim => anim.setValue(0.3));
    featureBorderOpacity[stepIndex].forEach(anim => anim.setValue(0.5));
    
    // Activate first feature
    const activateFeature = (featureIndex: number) => {
      // Dim previous
      const prevIndex = (featureIndex - 1 + 3) % 3;
      // Stop pulse for previous
      featureBulletPulse[stepIndex][prevIndex].setValue(1);
      
      Animated.parallel([
        Animated.timing(featureScale[stepIndex][prevIndex], {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureGlow[stepIndex][prevIndex], {
          toValue: 0.3,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureBorderOpacity[stepIndex][prevIndex], {
          toValue: 0.5,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
      
      // Brighten current
      featureCycleAnimationRef.current = Animated.parallel([
        Animated.timing(featureScale[stepIndex][featureIndex], {
          toValue: 1.05,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureGlow[stepIndex][featureIndex], {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureBorderOpacity[stepIndex][featureIndex], {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      
      featureCycleAnimationRef.current.start();
      setActiveFeatureIndex(featureIndex);
      
      // Start pulse animation for active bullet
      startBulletPulse(stepIndex, featureIndex);
      
      // Continue cycling (longer delay)
      featureCycleTimeoutRef.current = setTimeout(() => {
        const nextIndex = (featureIndex + 1) % 3;
        activateFeature(nextIndex);
      }, 4000); // Increased from 2500 to 4000ms
    };
    
    // Start after delay
    featureCycleTimeoutRef.current = setTimeout(() => {
      activateFeature(0);
    }, 1000);
  };
  
  // Handle manual press
  const handleFeaturePress = (stepIndex: number, featureIndex: number) => {
    if (featureIndex === activeFeatureIndex) return;
    
    // Stop current cycle
    if (featureCycleTimeoutRef.current) {
      clearTimeout(featureCycleTimeoutRef.current);
    }
    if (featureCycleAnimationRef.current) {
      featureCycleAnimationRef.current.stop();
    }
    if (bulletPulseAnimationRef.current) {
      bulletPulseAnimationRef.current.stop();
    }
    
    // Stop pulse for previous
    featureBulletPulse[stepIndex][activeFeatureIndex].setValue(1);
    
    // Animate to pressed feature
    Animated.parallel([
      // Dim previous
      Animated.parallel([
        Animated.timing(featureScale[stepIndex][activeFeatureIndex], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureGlow[stepIndex][activeFeatureIndex], {
          toValue: 0.3,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureBorderOpacity[stepIndex][activeFeatureIndex], {
          toValue: 0.5,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Brighten pressed
      Animated.parallel([
        Animated.spring(featureScale[stepIndex][featureIndex], {
          toValue: 1.08,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(featureGlow[stepIndex][featureIndex], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(featureBorderOpacity[stepIndex][featureIndex], {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Return to normal scale
      Animated.timing(featureScale[stepIndex][featureIndex], {
        toValue: 1.05,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
    
    setActiveFeatureIndex(featureIndex);
    
    // Start pulse animation for pressed bullet
    startBulletPulse(stepIndex, featureIndex);
    
    // Stop cycling completely when user interacts
    // Cycling will resume only when moving to next page
  };
  
  // Start cycling when step changes
  useEffect(() => {
    // Reset active feature
    setActiveFeatureIndex(0);
    
    // Start cycling for current step
    startFeatureCycling(currentStep);
    
    // Cleanup on step change or unmount
    return () => {
      if (featureCycleTimeoutRef.current) {
        clearTimeout(featureCycleTimeoutRef.current);
      }
      if (featureCycleAnimationRef.current) {
        featureCycleAnimationRef.current.stop();
      }
    };
  }, [currentStep]);
  
  // Continuous rotation animation (loop)
  const startContinuousRotation = () => {
    // Stop previous rotation if exists
    if (rotateAnimationRef.current) {
      rotateAnimationRef.current.stop();
    }
    
    // Reset to 0
    indicatorRotate.setValue(0);
    
    // Create loop animation
    const rotate = () => {
      rotateAnimationRef.current = Animated.timing(indicatorRotate, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      
      rotateAnimationRef.current.start(({ finished }) => {
        if (finished) {
          indicatorRotate.setValue(0);
          rotate(); // Loop
        }
      });
    };
    
    rotate();
  };
  
  // Start continuous rotation on mount
  useEffect(() => {
    startContinuousRotation();
    
    return () => {
      if (rotateAnimationRef.current) {
        rotateAnimationRef.current.stop();
      }
    };
  }, []);
  
  // Sync indicators with page transitions (no auto-play, only manual)
  useEffect(() => {
    // Update active indicator when page changes
    setActiveIndicator(currentStep);
    
    // Smooth transition: fade out previous, fade in new
    Animated.parallel([
      // New active indicator: fade in (brighten) from 0.4 to 1
      Animated.timing(indicatorOpacity[currentStep], {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // New active border: fade in instantly
      Animated.timing(indicatorBorderOpacity[currentStep], {
        toValue: 1,
        duration: 0, // Instant - no animation
        useNativeDriver: true,
      }),
      // Previous indicators: fade out (dim) from 1 to 0.4
      ...indicatorOpacity.map((anim, i) => 
        i !== currentStep 
          ? Animated.timing(anim, {
              toValue: 0.4,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            })
          : null
      ).filter(Boolean) as Animated.CompositeAnimation[],
      // Previous borders: fade out
      ...indicatorBorderOpacity.map((anim, i) => 
        i !== currentStep 
          ? Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            })
          : null
      ).filter(Boolean) as Animated.CompositeAnimation[],
    ]).start();
  }, [currentStep]);
  
  const handleNext = () => {
    if (currentStep === 2) {
      // الصفحة الأخيرة - اذهب لصفحة اختيار المسار
      markFirstTimeCompleted().then(() => {
        router.replace('/track-selection');
      });
      return;
    }
    
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    const next = currentStep + 1;
    
    // If transitioning from step 0 to step 1, animate buttons after page transition
    if (currentStep === 0) {
      // Animate page transition first, then buttons after swap
      animatePageTransition(next, () => {
        // After swap to Step1, animate buttons
        Animated.parallel([
          // Next button: shrink width only (no translateX)
          Animated.timing(nextButtonWidth, {
            toValue: step12Width,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          // Prev button: expand width and fade in
          Animated.timing(prevButtonWidth, {
            toValue: step12Width,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(prevButtonOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // Must be false when mixing with width animations
          }),
        ]).start();
      });
    } else {
      // Step 1 → 2: Buttons already in step1/2 state, just animate page transition
      animatePageTransition(next);
    }
  };

  const handlePrevious = () => {
    if (currentStep <= 0 || isAnimating) return;
    
    setIsAnimating(true);
    
    const prev = currentStep - 1;
    
    // If going back to step 0, animate buttons after page transition (same order as forward)
    if (prev === 0) {
      // Animate page transition first, then buttons after swap (same order as forward)
      animatePageTransition(prev, () => {
        // After swap to Step0, animate buttons to baseline (same smoothness as forward)
        Animated.parallel([
          // Next button: expand width back to full
          Animated.timing(nextButtonWidth, {
            toValue: step0Width,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          // Prev button: shrink width and fade out
          Animated.timing(prevButtonWidth, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.timing(prevButtonOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // Must be false when mixing with width animations
          }),
        ]).start();
      });
    } else {
      // Step 2 → 1: No button animation, just page transition
      animatePageTransition(prev);
    }
  };
  
  const animatePageTransition = (targetStep: number, onAfterSwap?: () => void) => {
    const isForward = targetStep > currentStep;
    
    if (isForward) {
      // Forward: Slide out left, then slide in from right
      Animated.timing(pageX, {
        toValue: -screenWidth,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // الآن خارج الشاشة (يسار) - swap step خارج الرؤية
        pageX.setValue(screenWidth); // انقله فورًا يمين خارج الشاشة
        setCurrentStep(targetStep); // غيّر المحتوى وهو خارج الشاشة
        
        // Call callback after swap if provided
        if (onAfterSwap) {
          onAfterSwap();
        }
        
        requestAnimationFrame(() => {
          // Slide in from right
          Animated.timing(pageX, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setIsAnimating(false);
          });
        });
      });
    } else {
      // Backward: Slide out right, then slide in from left
      Animated.timing(pageX, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        // الآن خارج الشاشة (يمين) - swap step خارج الرؤية
        pageX.setValue(-screenWidth); // انقله فورًا يسار خارج الشاشة
        setCurrentStep(targetStep); // غيّر المحتوى وهو خارج الشاشة
        
        // Call callback after swap if provided
        if (onAfterSwap) {
          onAfterSwap();
        }
        
        requestAnimationFrame(() => {
          // Slide in from left
          Animated.timing(pageX, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            setIsAnimating(false);
          });
        });
      });
    }
  };

  const renderStep = (stepIndex: number, shouldPlay: boolean = true) => {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.illustrationContainer}>
          <RiveAnimation
            key={`animation-${stepIndex}`}
            src={animationConfig[stepIndex].src}
            shouldPlay={shouldPlay}
            style={styles.illustration}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.titleText, { textAlign: 'center' }]}>
            {stepIndex === 0 && 'أهلاً وسهلاً بك في ملقن'}
            {stepIndex === 1 && 'تحليل ذكي • استنتاج دقيق 🧠'}
            {stepIndex === 2 && 'جاهزية كاملة • ثقة تامة 🎯'}
          </Text>
          
          {stepIndex === 0 && (
            <>
              <Text style={[styles.subtitleText, { textAlign: 'center' }]}>
                منصة معتمدة من هيئة التعليم
              </Text>
              <View style={styles.featuresContainer}>
                {[
                  { bullet: '✅', text: 'منصة معتمدة من هيئة التعليم' },
                  { bullet: '🚀', text: 'منصة جديدة لرفع مستوى التعليم في المملكة' },
                  { bullet: '💪', text: 'نحفزك للاستمرار في أي وقت يناسبك' },
                ].map((feature, index) => {
                  const glowOpacity = featureGlow[0][index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  });
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleFeaturePress(0, index)}
                      activeOpacity={0.9}
                    >
                      <Animated.View
                        style={[
                          styles.featureItem,
                          {
                            flexDirection,
                            transform: [{ scale: featureScale[0][index] }],
                            shadowColor: BRAND_COLORS.primary,
                            shadowOffset: { width: 0, height: 0 },
                            shadowRadius: 15,
                            shadowOpacity: glowOpacity,
                          },
                        ]}
                      >
                        <Animated.Text 
                          style={[
                            styles.featureBullet,
                            {
                              transform: [{ scale: featureBulletPulse[0][index] }],
                            },
                          ]}
                        >
                          {feature.bullet}
                        </Animated.Text>
                        <Text style={[styles.featureText, { textAlign }]}>
                          {feature.text}
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          
          {stepIndex === 1 && (
            <>
              <Text style={[styles.subtitleText, { textAlign: 'center' }]}>
                نحلل أداءك من مجرد إجاباتك
              </Text>
              <View style={styles.featuresContainer}>
                {[
                  { bullet: '🧠', text: 'تحليل ذكي لمستواك من إجاباتك وأخطائك' },
                  { bullet: '📅', text: 'جدول دراسي متناسق يساعدك على التذاكر' },
                  { bullet: '📊', text: 'نحلل مستواك ونعطيك تحليلاتك الشاملة' },
                ].map((feature, index) => {
                  const glowOpacity = featureGlow[1][index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  });
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleFeaturePress(1, index)}
                      activeOpacity={0.9}
                    >
                      <Animated.View
                        style={[
                          styles.featureItem,
                          {
                            flexDirection,
                            transform: [{ scale: featureScale[1][index] }],
                            shadowColor: BRAND_COLORS.primary,
                            shadowOffset: { width: 0, height: 0 },
                            shadowRadius: 15,
                            shadowOpacity: glowOpacity,
                          },
                        ]}
                      >
                        <Animated.Text 
                          style={[
                            styles.featureBullet,
                            {
                              transform: [{ scale: featureBulletPulse[1][index] }],
                            },
                          ]}
                        >
                          {feature.bullet}
                        </Animated.Text>
                        <Text style={[styles.featureText, { textAlign }]}>
                          {feature.text}
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
          
          {stepIndex === 2 && (
            <>
              <Text style={[styles.subtitleText, { textAlign: 'center' }]}>
                نوصلك لمرحلة الجاهزية الكاملة
              </Text>
              <View style={styles.featuresContainer}>
                {[
                  { bullet: '⏰', text: 'نعلمك كم باقي على اختبارك ونخطط معك' },
                  { bullet: '💡', text: 'اقتراحات ممتازة لفهم نفسك والاختبار' },
                  { bullet: '🎯', text: 'توصل لمرحلة تروح للاختبار بكل ثقة' },
                ].map((feature, index) => {
                  const glowOpacity = featureGlow[2][index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  });
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleFeaturePress(2, index)}
                      activeOpacity={0.9}
                    >
                      <Animated.View
                        style={[
                          styles.featureItem,
                          {
                            flexDirection,
                            transform: [{ scale: featureScale[2][index] }],
                            shadowColor: BRAND_COLORS.primary,
                            shadowOffset: { width: 0, height: 0 },
                            shadowRadius: 15,
                            shadowOpacity: glowOpacity,
                          },
                        ]}
                      >
                        <Animated.Text 
                          style={[
                            styles.featureBullet,
                            {
                              transform: [{ scale: featureBulletPulse[2][index] }],
                            },
                          ]}
                        >
                          {feature.bullet}
                        </Animated.Text>
                        <Text style={[styles.featureText, { textAlign }]}>
                          {feature.text}
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* نقاط متطايرة في الخلفية */}
          <ParticlesBackground color={BRAND_COLORS.primary} particleCount={18} opacity={0.45} />
          <View style={styles.animationWrapper}>
            <Animated.View
              style={[
                styles.pageContainer,
                {
                  transform: [{ translateX: pageX }],
                },
              ]}
            >
              {renderStep(currentStep, true)}
            </Animated.View>
          </View>

          {/* Step Indicators - مع animation */}
          <View style={styles.indicatorsContainer}>
            {[0, 1, 2].map((index) => {
              const rotateInterpolate = indicatorRotate.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              });
              
              const shadowOpacity = activeIndicator === index ? 0.8 : 0;
              
              return (
                <View key={index} style={styles.indicatorWrapper}>
                  {/* Rotating Border */}
                  <Animated.View
                    style={[
                      styles.indicatorBorder,
                      {
                        transform: [{ rotate: rotateInterpolate }],
                        opacity: indicatorBorderOpacity[index],
                      },
                    ]}
                  />
                  
                  {/* Indicator Dot */}
                  <Animated.View
                    style={[
                      styles.indicator,
                      {
                        opacity: indicatorOpacity[index],
                        shadowOpacity: shadowOpacity,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>

          {/* الأزرار - مع animation */}
          <View style={[
            styles.buttonsContainer,
            currentStep === 0 ? styles.buttonsContainerCenter : styles.buttonsContainerSpaceBetween
          ]}>
            {/* زر السابق - مع animation - always in DOM to prevent layout shift */}
            <Animated.View
              style={[
                styles.previousButtonWrapper,
                {
                  width: prevButtonWidth,
                  opacity: prevButtonOpacity,
                },
              ]}
              pointerEvents={currentStep === 0 ? 'none' : 'auto'}
            >
              <TouchableOpacity 
                style={styles.previousButton}
                onPress={handlePrevious}
                activeOpacity={0.8}
                disabled={currentStep === 0}
              >
                <Text 
                  style={styles.previousButtonText}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  allowFontScaling={false}
                >
                  السابق
                </Text>
                <MaterialIcons name="arrow-back" size={20} color={BRAND_COLORS.primary} />
              </TouchableOpacity>
            </Animated.View>

            {/* زر التالي/ابدأ - مع animation */}
            <Animated.View
              style={[
                styles.nextButtonWrapper,
                {
                  width: nextButtonWidth,
                },
              ]}
            >
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                {currentStep < 2 && (
                  <MaterialIcons name="arrow-forward" size={20} color="#0B1E33" />
                )}
                <Text style={styles.nextButtonText}>
                  {currentStep === 2 ? 'ابدأ' : 'التالي'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
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
    overflow: 'hidden',
  },
  animationWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  pageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  stepContainer: {
    width: screenWidth,
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  illustrationContainer: {
    width: '100%',
    height: screenHeight * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: 0,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'Cairo-Bold',
    color: BRAND_COLORS.white,
    marginBottom: SPACING.xs,
    lineHeight: 30,
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
    color: BRAND_COLORS.primary,
    marginBottom: SPACING.md,
    marginTop: 0,
  },
  featuresContainer: {
    width: '100%',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
    overflow: 'hidden',
  },
  featureBullet: {
    fontSize: 20,
    marginRight: SPACING.sm,
    width: 28,
    textAlign: 'center',
    lineHeight: 28,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Cairo-SemiBold',
    color: BRAND_COLORS.white,
    flex: 1,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: BRAND_COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  illustration: {
    width: screenWidth * 0.75,
    height: screenHeight * 0.4,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    direction: 'ltr', // Force LTR layout for buttons (Prev left, Next right)
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    alignItems: 'center',
    width: '100%',
  },
  buttonsContainerCenter: {
    justifyContent: 'center',
  },
  buttonsContainerSpaceBetween: {
    justifyContent: 'space-between',
  },
  nextButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52, // Fixed height to prevent vertical shift (14px padding * 2 + 24px text/icon height)
  },
  nextButton: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    height: 52, // Fixed height to match wrapper (removed paddingVertical to prevent overflow)
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: 'Cairo-Bold',
    color: '#0B1E33',
    writingDirection: 'ltr', // Force LTR text direction
  },
  previousButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52, // Fixed height to match nextButtonWrapper
  },
  previousButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    height: 52, // Fixed height to match nextButton (removed paddingVertical to prevent overflow)
  },
  previousButtonText: {
    fontSize: 17,
    fontFamily: 'Cairo-SemiBold',
    color: BRAND_COLORS.primary,
    writingDirection: 'ltr', // Force LTR text direction
    flexShrink: 0,
    flexGrow: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  indicatorsContainer: {
    position: 'absolute',
    top: SPACING.xl + 10, // Raised up to avoid overlapping with animation
    left: 0,
    right: 0,
    flexDirection: 'row',
    direction: 'ltr', // Force LTR layout (first indicator on left = Step 0)
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    zIndex: 10,
  },
  indicatorWrapper: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.primary,
    shadowColor: BRAND_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.8,
  },
  indicatorBorder: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: BRAND_COLORS.primary, // Start from top-left
    borderLeftColor: BRAND_COLORS.primary,
    borderBottomColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
