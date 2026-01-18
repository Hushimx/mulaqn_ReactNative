import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface NestedRingsProps {
  performancePercentage: number | null; // Outer ring (Performance)
  coveragePercentage: number; // Inner ring (Coverage)
  size?: number;
  outerStrokeWidth?: number;
  innerStrokeWidth?: number;
  performanceColor?: string;
  coverageColor?: string;
  showGlow?: boolean;
  animationDuration?: number;
  centerLabel?: string;
  coverageLabel?: string;
}

export function NestedRings({
  performancePercentage,
  coveragePercentage,
  size = 280,
  outerStrokeWidth = 18,
  innerStrokeWidth = 14,
  performanceColor = '#D4AF37',
  coverageColor = '#D4AF37',
  showGlow = true,
  animationDuration = 1500,
  centerLabel,
  coverageLabel,
}: NestedRingsProps) {
  const outerProgress = useSharedValue(0);
  const innerProgress = useSharedValue(0);
  
  const outerRadius = (size - outerStrokeWidth) / 2 - 20; // Outer ring radius (أكبر)
  const innerRadius = (size - innerStrokeWidth) / 2 - 65; // Inner ring radius (أصغر)
  
  const outerCircumference = outerRadius * 2 * Math.PI;
  const innerCircumference = innerRadius * 2 * Math.PI;
  
  useEffect(() => {
    outerProgress.value = withTiming(performancePercentage ?? 0, {
      duration: animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    innerProgress.value = withTiming(coveragePercentage, {
      duration: animationDuration + 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [performancePercentage, coveragePercentage]);
  
  const outerAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      outerProgress.value,
      [0, 100],
      [outerCircumference, 0]
    );
    
    return {
      strokeDashoffset,
    };
  });
  
  const innerAnimatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      innerProgress.value,
      [0, 100],
      [innerCircumference, 0]
    );
    
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow Effect Background */}
      {showGlow && (
        <View
          style={[
            styles.glowContainer,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              shadowColor: performanceColor,
              shadowOpacity: 0.4,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            },
          ]}
        />
      )}
      
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <RadialGradient id="outerGlowGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={performanceColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={performanceColor} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="innerGlowGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={coverageColor} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={coverageColor} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        {/* Outer Ring Background (Performance) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={outerRadius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={outerStrokeWidth}
          fill="none"
        />
        
        {/* Outer Ring Glow */}
        {showGlow && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            fill="url(#outerGlowGradient)"
          />
        )}
        
        {/* Outer Ring Progress (Performance) */}
        {performancePercentage !== null && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={outerRadius}
            stroke={performanceColor}
            strokeWidth={outerStrokeWidth}
            strokeDasharray={outerCircumference}
            strokeLinecap="round"
            fill="none"
            animatedProps={outerAnimatedProps}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
        
        {/* Inner Ring Background (Coverage) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={innerStrokeWidth}
          fill="none"
        />
        
        {/* Inner Ring Glow */}
        {showGlow && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={innerRadius}
            fill="url(#innerGlowGradient)"
          />
        )}
        
        {/* Inner Ring Progress (Coverage) */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={innerRadius}
          stroke={`${coverageColor}80`}
          strokeWidth={innerStrokeWidth}
          strokeDasharray={innerCircumference}
          strokeLinecap="round"
          fill="none"
          animatedProps={innerAnimatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          opacity={0.7}
        />
      </Svg>
      
      {/* Center Text Container */}
      <View style={styles.centerContainer}>
        {/* إذا كان readiness (centerLabel موجود و performancePercentage null) */}
        {centerLabel && performancePercentage === null ? (
          <>
            <Text style={[styles.centerLabel, { color: performanceColor }]}>
              {centerLabel}
            </Text>
            {/* Coverage Percentage (Inner) */}
            <View style={styles.coverageContainer}>
              <Text style={[styles.coveragePercentage, { color: `${coverageColor}80` }]}>
                {Math.round(coveragePercentage)}%
              </Text>
              {coverageLabel && (
                <Text style={styles.coverageLabel}>{coverageLabel}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            {/* إذا كان performancePercentage موجود */}
            {performancePercentage !== null && (
              <>
                <Text style={[styles.performancePercentage, { color: performanceColor }]}>
                  {Math.round(performancePercentage)}%
                </Text>
                <Text style={styles.performanceLabel}>أداء عام</Text>
              </>
            )}
            {performancePercentage === null && !centerLabel && (
              <Text style={[styles.performancePercentage, { color: performanceColor }]}>
                -
              </Text>
            )}
            
            {/* Coverage Percentage (Inner) */}
            <View style={styles.coverageContainer}>
              <Text style={[styles.coveragePercentage, { color: `${coverageColor}80` }]}>
                {Math.round(coveragePercentage)}%
              </Text>
              {coverageLabel && (
                <Text style={styles.coverageLabel}>{coverageLabel}</Text>
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowContainer: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  svg: {
    transform: [{ scaleX: -1 }], // Flip for RTL-friendly progress
  },
  centerContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  centerLabel: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  performancePercentage: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
  },
  performanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  coverageContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  coveragePercentage: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  coverageLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
});