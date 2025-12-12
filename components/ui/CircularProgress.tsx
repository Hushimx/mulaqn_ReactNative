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

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  showGlow?: boolean;
  animationDuration?: number;
}

export function CircularProgress({
  percentage,
  size = 200,
  strokeWidth = 16,
  color = '#D4AF37',
  showGlow = true,
  animationDuration = 1500,
}: CircularProgressProps) {
  const progress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  useEffect(() => {
    progress.value = withTiming(percentage, {
      duration: animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(
      progress.value,
      [0, 100],
      [circumference, 0]
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
              shadowColor: color,
              shadowOpacity: 0.5,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 0 },
              elevation: 10,
            },
          ]}
        />
      )}
      
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <RadialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Glow Circle (behind progress) */}
        {showGlow && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="url(#glowGradient)"
          />
        )}
        
        {/* Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          fill="none"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      {/* Percentage Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.percentageText, { color }]}>
          {Math.round(percentage)}%
        </Text>
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
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});

