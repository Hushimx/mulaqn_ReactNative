import React, { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  cancelAnimation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { GradientBackground } from '@/components/ui/GradientBackground';
import { ParticlesBackground } from '@/components/ui/ParticlesBackground';
import { getTrackColors } from '@/contexts/TrackContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, API_ENDPOINTS } from '@/utils/api';
import { saveSelectedTrackId } from '@/utils/trackSelection';
import { BRAND_COLORS } from '@/constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  icon_emoji?: string;
  primary_color?: string;
  bg_color?: string;
  gradient_colors?: string[];
  subscription_locked?: boolean;
  subscription_lock_reason?: string;
  subscription_locked_until?: string;
  is_visible?: boolean;
}

// Animated components for fill effect (must be outside map to avoid hooks order issues)
interface AnimatedFillOverlayProps {
  isAnimating: boolean;
  cardWidth: number;
  fillProgress: SharedValue<number>;
  darkerColor: string;
  lighterColor: string;
}

const AnimatedFillOverlay = ({ isAnimating, cardWidth, fillProgress, darkerColor, lighterColor }: AnimatedFillOverlayProps) => {
  // Shimmer animation
  const shimmerTranslateX = useSharedValue(-100);
  
  useEffect(() => {
    if (isAnimating && cardWidth > 0) {
      shimmerTranslateX.value = -100;
      shimmerTranslateX.value = withRepeat(
        withTiming(cardWidth + 100, {
          duration: 2000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      shimmerTranslateX.value = -100;
    }
  }, [isAnimating, cardWidth]);
  
  const fillAnimatedStyle = useAnimatedStyle(() => {
    const progress = fillProgress.value;
    // Show overlay if there's any progress (> 0.01 to avoid flicker)
    // This ensures reverse animation is visible even when isAnimating becomes false
    // We check progress directly instead of isAnimating because progress is a SharedValue
    const shouldShow = progress > 0.01;
    
    if (!shouldShow || cardWidth === 0) {
      return {
        transform: [
          { scaleX: 0 },
          { translateX: -cardWidth / 2 },
        ],
      };
    }
    
    return {
      transform: [
        { scaleX: progress },
        { translateX: -cardWidth / 2 + (progress * cardWidth) / 2 },
      ],
    };
  });
  
  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    // Only show shimmer during forward animation (isAnimating)
    if (!isAnimating || cardWidth === 0) {
      return { opacity: 0 };
    }
    return {
      transform: [{ translateX: shimmerTranslateX.value }],
      opacity: 0.3,
    };
  });

  // Always render - let animated style handle visibility
  // This ensures reverse animation is visible even when isAnimating is false
  if (cardWidth === 0) return null;

  return (
    <Animated.View 
      style={[
        styles.fillOverlay, 
        { width: cardWidth },
        fillAnimatedStyle,
      ]}
    >
      <LinearGradient
        colors={[darkerColor, lighterColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.fillGradient}
      />
      {/* Shimmer effect */}
      <Animated.View style={[styles.shimmer, shimmerAnimatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
      {/* Dim layer for better text contrast */}
      <View style={styles.fillDim} />
    </Animated.View>
  );
};

interface AnimatedStartTextProps {
  isAnimating: boolean;
  startTextOpacity: SharedValue<number>;
  onPress: () => void;
}

const AnimatedStartText = ({ isAnimating, startTextOpacity, onPress }: AnimatedStartTextProps) => {
  const startTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = startTextOpacity.value;
    // Show text if opacity > 0 (for smooth fade-out during reverse animation)
    // This allows the text to fade out beautifully even when isAnimating becomes false
    return {
      opacity: opacity,
    };
  });

  // Track if text was ever shown (to allow fade-out even after isAnimating becomes false)
  const [wasVisible, setWasVisible] = React.useState(false);
  
  React.useEffect(() => {
    if (isAnimating) {
      setWasVisible(true);
    }
    // Keep wasVisible true for a bit after isAnimating becomes false
    // This allows the fade-out animation to complete
    if (!isAnimating && wasVisible) {
      const timer = setTimeout(() => {
        setWasVisible(false);
      }, 400); // Wait for fade-out to complete (300ms + buffer)
      return () => clearTimeout(timer);
    }
  }, [isAnimating, wasVisible]);

  // Always render - let animated style handle visibility with smooth fade
  // This ensures smooth fade-out during reverse animation
  // The component will fade out beautifully instead of disappearing instantly
  return (
    <Animated.View 
      style={[
        styles.startTextTouchable,
        startTextAnimatedStyle, // Use animated opacity for smooth fade in/out
      ]}
      pointerEvents={isAnimating || wasVisible ? 'auto' : 'none'} // Enable touches when animating or was visible
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={StyleSheet.absoluteFillObject} // Fill entire parent
        disabled={!isAnimating && !wasVisible} // Disable when not animating and wasn't visible
      >
        {/* Dim layer behind text for better readability */}
        <View style={styles.startTextDim} />
        <View style={styles.startTextContainer}>
          <Animated.Text style={[styles.startText, startTextAnimatedStyle]}>
            سم بالله واضغط عشان نبدأ
          </Animated.Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TrackSelectionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isRTL, textAlign, flexDirection } = useLanguage();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animation states for fill effect
  const [animatingTrackId, setAnimatingTrackId] = useState<number | null>(null);
  const [cardWidths, setCardWidths] = useState<Record<number, number>>({});
  
  // SharedValues per track - initialize for all possible tracks (1, 2, 3)
  const track1FillProgress = useSharedValue(0);
  const track1StartTextOpacity = useSharedValue(0);
  const track2FillProgress = useSharedValue(0);
  const track2StartTextOpacity = useSharedValue(0);
  const track3FillProgress = useSharedValue(0);
  const track3StartTextOpacity = useSharedValue(0);
  
  // Get track animation values (safe access)
  const getTrackAnimation = (trackId: number) => {
    switch (trackId) {
      case 1:
        return { fillProgress: track1FillProgress, startTextOpacity: track1StartTextOpacity };
      case 2:
        return { fillProgress: track2FillProgress, startTextOpacity: track2StartTextOpacity };
      case 3:
        return { fillProgress: track3FillProgress, startTextOpacity: track3StartTextOpacity };
      default:
        return { fillProgress: track1FillProgress, startTextOpacity: track1StartTextOpacity };
    }
  };
  
  // Animation values for entrance (MUST be before any conditional returns)
  const particlesOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);

  // Animated styles (MUST be before any conditional returns)
  const particlesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  useEffect(() => {
    fetchTracks();
  }, []);

  // Entrance animation when tracks are loaded
  useEffect(() => {
    if (!loading && tracks.length > 0) {
      // Animate particles entrance
      particlesOpacity.value = withDelay(
        200,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        })
      );
      
      // Animate content entrance
      contentOpacity.value = withDelay(
        400,
        withTiming(1, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        })
      );
      
      contentTranslateY.value = withDelay(
        400,
        withTiming(0, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [loading, tracks]);

  const fetchTracks = async () => {
    try {
      setLoading(true);
      const tracksResponse = await api.get<{ ok: boolean; data: Track[] }>(API_ENDPOINTS.TRACKS);
      if (tracksResponse && tracksResponse.ok && tracksResponse.data) {
        setTracks(tracksResponse.data);
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSelect = async (trackId: number) => {
    // If clicking the same track, do nothing
    if (animatingTrackId === trackId) return;
    
    // Allow switching to a different track even if submitting
    // This enables smooth reverse animation when switching between tracks
    // isSubmitting will be set to true during animation, but we allow switching
    
    const cardWidth = cardWidths[trackId];
    if (!cardWidth) {
      // If width not measured yet, wait a bit
      setTimeout(() => handleTrackSelect(trackId), 100);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Store previous track ID before updating state
      const previousTrackId = animatingTrackId;
      
      // If there's a previous track animating, reverse it smoothly
      if (previousTrackId !== null && previousTrackId !== trackId) {
        const previousTrackAnim = getTrackAnimation(previousTrackId);
        
        // CRITICAL: Read current progress BEFORE doing anything else
        // This is the actual visual position right now (before any operations)
        const currentProgressValue = previousTrackAnim.fillProgress.value;
        
        // Hide start text with smooth fade-out (longer duration for beautiful fade)
        // This ensures the text fades out gracefully during reverse animation
        previousTrackAnim.startTextOpacity.value = withTiming(0, {
          duration: 300, // Longer duration (300ms) for smooth, beautiful fade-out
          easing: Easing.out(Easing.ease), // Ease out for natural fade
        });
        
        // Only do reverse animation if there's meaningful progress
        if (currentProgressValue > 0.01) {
          // DON'T use cancelAnimation - it might reset the value
          // Instead, start reverse animation directly
          // The new withTiming will interrupt the old one and read the current value
          
          // But we need to ensure the value stays at current progress
          // So we set it explicitly first, then start reverse
          previousTrackAnim.fillProgress.value = currentProgressValue;
          
          // Calculate reverse duration - proportional to progress (500ms - 800ms for smoothness)
          const reverseDuration = Math.max(500, Math.min(800, currentProgressValue * 900));
          
          // Start reverse animation immediately
          // The withTiming will use the current value (currentProgressValue) as starting point
          // and animate smoothly to 0
          previousTrackAnim.fillProgress.value = withTiming(0, {
            duration: reverseDuration,
            easing: Easing.in(Easing.cubic), // Ease in for natural reverse feel
          }, (finished) => {
            // Clean up after reverse completes
            if (finished) {
              previousTrackAnim.fillProgress.value = 0;
              previousTrackAnim.startTextOpacity.value = 0;
            }
          });
        } else {
          // If progress is very small or 0, just reset immediately
          previousTrackAnim.fillProgress.value = 0;
          previousTrackAnim.startTextOpacity.value = 0;
        }
      }
      
      // Update state for new track (after starting reverse of previous)
      setAnimatingTrackId(trackId);
      setSelectedTrackId(trackId);
      
      // Start animation for new track after a brief delay (for smooth transition)
      // Delay only if we had a previous animation (to allow reverse to start)
      const delayBeforeNewAnimation = previousTrackId !== null ? 200 : 0;
      
      // Capture trackId for use in setTimeout (avoid stale closure)
      const newTrackId = trackId;
      
      setTimeout(() => {
        // Double check that this is still the selected track (race condition protection)
        // This check happens after delay, so state should be updated by now
        
        // Get fresh animation values using the captured trackId
        const trackAnim = getTrackAnimation(newTrackId);
        
        // Ensure starting from 0 (reset any previous state)
        trackAnim.fillProgress.value = 0;
        trackAnim.startTextOpacity.value = 0;
        
        // Start fill animation: left to right
        trackAnim.fillProgress.value = withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          // Only show start text if animation completed successfully
          // The component render logic (isAnimating check) will prevent showing on wrong track
          if (finished) {
            trackAnim.startTextOpacity.value = withTiming(1, {
              duration: 400,
              easing: Easing.out(Easing.ease),
            });
          }
        });
        
        // Allow new interactions after animation starts
        setIsSubmitting(false);
      }, delayBeforeNewAnimation);
      
      // Save track ID (don't await, let it run in background)
      saveSelectedTrackId(trackId).catch((error) => {
        console.error('Error saving selected track:', error);
      });
      
      // NO auto navigate - wait for second tap on start text
    } catch (error) {
      console.error('Error in handleTrackSelect:', error);
      setIsSubmitting(false);
      // Only reset if this track was actually being set
      if (animatingTrackId === trackId) {
        setSelectedTrackId(null);
        setAnimatingTrackId(null);
      }
      const trackAnim = getTrackAnimation(trackId);
      trackAnim.fillProgress.value = 0;
      trackAnim.startTextOpacity.value = 0;
    }
  };
  
  // Handle second tap on start text
  const handleStartPress = () => {
    if (animatingTrackId !== null) {
      // Navigate to registration page for new users
      router.replace('/register');
    }
  };
  
  // Handle card layout measurement
  const handleCardLayout = (trackId: number, event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && !cardWidths[trackId]) {
      setCardWidths(prev => ({ ...prev, [trackId]: width }));
    }
  };

  const getTrackColor = (track: Track) => {
    const trackColors = getTrackColors(track);
    return trackColors.primary;
  };

  const getTrackIcon = (track: Track) => {
    return track.icon_emoji || track.icon || (() => {
      switch (track.id) {
        case 1: return '🧠'; // قدرات
        case 2: return '📐'; // تحصيلي
        case 3: return '🌐'; // STEP
        default: return '📚';
      }
    })();
  };

  if (loading) {
    return (
      <GradientBackground>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <Animated.View style={[styles.particlesContainer, particlesAnimatedStyle]}>
          <ParticlesBackground color={BRAND_COLORS.primary} particleCount={25} opacity={0.45} />
        </Animated.View>
        
        <Animated.View style={[styles.contentContainer, contentAnimatedStyle]}>
          <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { textAlign }]}>
              اختر مسارك التعليمي
            </Text>
            <Text style={[styles.subtitle, { textAlign }]}>
              اختر المسار الذي تريد البدء فيه لتصل لهدفك
            </Text>
          </View>

          {/* Tracks List */}
          <View style={styles.tracksContainer}>
            {tracks.map((track) => {
              const trackColor = getTrackColor(track);
              const trackIcon = getTrackIcon(track);
              const isSelected = selectedTrackId === track.id;
              const isComingSoon = track.subscription_locked === true;
              
              const isAnimating = animatingTrackId === track.id;
              const cardWidth = cardWidths[track.id] || 0;
              
              // Create darker color for gradient
              const darkerColor = `${trackColor}CC`; // 80% opacity darker
              const lighterColor = `${trackColor}80`; // 50% opacity lighter
              
              // Get track animation values
              const trackAnim = getTrackAnimation(track.id);
              
              return (
                <View
                  key={track.id}
                  style={[
                    styles.trackCard,
                    { borderColor: isSelected ? trackColor : `${trackColor}40` },
                    isSelected && { borderWidth: 3, backgroundColor: `${trackColor}15` },
                    isComingSoon && styles.trackCardLocked, // Locked card styling
                  ]}
                  onLayout={(e) => handleCardLayout(track.id, e)}
                >
                  <TouchableOpacity
                    style={styles.trackCardContent}
                    onPress={() => !isComingSoon && handleTrackSelect(track.id)}
                    activeOpacity={0.8}
                    disabled={isSubmitting || isComingSoon}
                  >
                    {/* Track Icon */}
                    <View style={[
                      styles.trackIconContainer, 
                      { backgroundColor: `${trackColor}20` },
                      isComingSoon && styles.trackIconContainerLocked,
                    ]}>
                      <Text style={[
                        styles.trackIcon,
                        isComingSoon && styles.trackIconLocked,
                      ]}>{trackIcon}</Text>
                    </View>

                    {/* Track Info */}
                    <View style={styles.trackInfo}>
                      <Text style={[
                        styles.trackName, 
                        { textAlign },
                        isComingSoon && styles.trackNameLocked,
                      ]}>
                        {track.name}
                      </Text>
                      <Text style={[
                        styles.trackDescription, 
                        { textAlign },
                        isComingSoon && styles.trackDescriptionLocked,
                      ]}>
                        {track.id === 1 && 'اختبار القبول الجامعي للطلاب السعوديين'}
                        {track.id === 2 && 'اختبار القبول للكليات العلمية'}
                        {track.id === 3 && 'اختبار كفايات اللغة الإنجليزية'}
                      </Text>
                    </View>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: trackColor }]}>
                        <MaterialIcons name="check" size={24} color="#FFFFFF" />
                      </View>
                    )}

                    {!isSelected && !isComingSoon && (
                      <MaterialIcons name="arrow-forward" size={24} color={trackColor} />
                    )}
                  </TouchableOpacity>

                  {/* Subscription Locked Ribbon - Integrated Vertical Rail on Right Edge */}
                  {isComingSoon && (
                    <View style={styles.comingSoonRibbon}>
                      <View style={styles.ribbonContent}>
                        <Text style={styles.comingSoonText}>غير متاح للاشتراك</Text>
                        {track.subscription_lock_reason && (
                          <Text style={styles.lockReasonText}>{track.subscription_lock_reason}</Text>
                        )}
                        <MaterialIcons name="lock" size={20} color={BRAND_COLORS.primary} style={styles.lockIcon} />
                      </View>
                    </View>
                  )}

                  {/* Fill Overlay - Only for open tracks when animating */}
                  {!isComingSoon && (
                    <AnimatedFillOverlay
                      isAnimating={isAnimating}
                      cardWidth={cardWidth}
                      fillProgress={trackAnim.fillProgress}
                      darkerColor={darkerColor}
                      lighterColor={lighterColor}
                    />
                  )}

                  {/* Start Text - Appears after fill completes, tappable for second tap */}
                  {/* Always render if not coming soon - let AnimatedStartText handle visibility */}
                  {/* This allows smooth fade-out during reverse animation */}
                  {!isComingSoon && (
                    <AnimatedStartText
                      isAnimating={isAnimating}
                      startTextOpacity={trackAnim.startTextOpacity}
                      onPress={handleStartPress}
                    />
                  )}
                </View>
              );
            })}
          </View>

          {/* Login Section */}
          <View style={styles.loginSection}>
            <View style={styles.loginDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="login" size={20} color={BRAND_COLORS.primary} />
              <Text style={styles.loginButtonText}>عندك حساب من اول ؟ اضغط هنا</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Cairo-Medium',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Cairo-Bold',
    marginBottom: 12,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  tracksContainer: {
    gap: 16,
    marginBottom: 24,
  },
  trackCard: {
    backgroundColor: 'rgba(18, 38, 57, 0.5)',
    borderRadius: 20,
    borderWidth: 2,
    minHeight: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  fillOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 5,
    overflow: 'hidden',
    transformOrigin: 'left center', // Scale from left
  },
  fillGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fillDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dim layer for better text contrast
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100, // Shimmer width
    opacity: 0.3,
  },
  shimmerGradient: {
    flex: 1,
    width: '100%',
  },
  startTextTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startTextDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dim layer behind text
    borderRadius: 20,
  },
  startTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: 20,
  },
  startText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontFamily: 'Cairo-Bold',
    textAlign: 'center',
    // Multiple text shadows for beautiful white glow effect around the text
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    // Additional platform-specific shadows for enhanced glow
    ...(Platform.OS === 'android' && {
      elevation: 4,
    }),
    // iOS specific shadow for better glow effect
    ...(Platform.OS === 'ios' && {
      shadowColor: 'rgba(255, 255, 255, 0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
    }),
    includeFontPadding: false,
  },
  trackCardLocked: {
    backgroundColor: `rgba(212, 175, 55, 0.05)`, // Very faint gold background
    borderColor: `rgba(212, 175, 55, 0.3)`, // Light gold border
    borderWidth: 2,
  },
  trackCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  comingSoonRibbon: {
    position: 'absolute',
    right: 0, // Fully attached to right edge
    top: 0,
    bottom: 0,
    width: 44, // Integrated rail width
    backgroundColor: `rgba(212, 175, 55, 0.12)`, // Very faint gold background
    borderLeftWidth: 2,
    borderColor: BRAND_COLORS.primary, // Gold border matching text
    borderTopRightRadius: 20, // Match card border radius
    borderBottomRightRadius: 20,
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ribbonContent: {
    alignItems: 'center',
    gap: 12,
  },
  comingSoonText: {
    color: BRAND_COLORS.primary, // Gold glowing text
    fontSize: 13,
    fontFamily: 'Cairo-Bold',
    transform: [{ rotate: '-90deg' }],
    letterSpacing: 1,
    textShadowColor: BRAND_COLORS.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6, // Subtle glow
  },
  lockReasonText: {
    color: BRAND_COLORS.primary,
    fontSize: 10,
    fontFamily: 'Cairo-Regular',
    transform: [{ rotate: '-90deg' }],
    textAlign: 'center',
    maxWidth: 100,
    opacity: 0.9,
  },
  lockIcon: {
    marginTop: 6,
  },
  trackIconContainerLocked: {
    backgroundColor: `rgba(255, 255, 255, 0.08)`, // Very faint white background
  },
  trackIconLocked: {
    opacity: 0.7, // Keep icons visible but subtle
  },
  trackNameLocked: {
    color: 'rgba(255, 255, 255, 0.85)', // Slightly dimmed but still clear
  },
  trackDescriptionLocked: {
    color: 'rgba(255, 255, 255, 0.65)', // Slightly dimmed but readable
  },
  trackIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackIcon: {
    fontSize: 32,
  },
  trackInfo: {
    flex: 1,
    gap: 4,
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Cairo-Bold',
  },
  trackDescription: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    lineHeight: 20,
  },
  selectedIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontFamily: 'Cairo-Regular',
    marginTop: 8,
  },
  loginSection: {
    marginTop: 32,
    paddingTop: 24,
  },
  loginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontFamily: 'Cairo-Medium',
    marginHorizontal: 16,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `rgba(212, 175, 55, 0.1)`, // Very faint gold background
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primary, // Gold border matching text
  },
  loginButtonText: {
    color: BRAND_COLORS.primary, // Gold text
    fontSize: 16,
    fontFamily: 'Cairo-SemiBold',
  },
});
