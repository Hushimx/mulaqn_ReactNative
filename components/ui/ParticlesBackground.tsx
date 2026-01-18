import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
}

interface ParticlesBackgroundProps {
  color?: string;
  particleCount?: number;
  opacity?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function ParticlesBackground({
  color = '#D4AF37',
  particleCount = 12,
  opacity = 0.3,
}: ParticlesBackgroundProps) {
  // Generate particles with random positions and delays
  const particles: Particle[] = React.useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 4, // 6-10 seconds
    }));
  }, [particleCount]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          delay={particle.delay}
          duration={particle.duration}
          color={color}
          opacity={opacity}
        />
      ))}
    </View>
  );
}

interface ParticleProps {
  x: number;
  y: number;
  delay: number;
  duration: number;
  color: string;
  opacity: number;
}

function Particle({ x, y, delay, duration, color, opacity }: ParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacityValue = useSharedValue(0.2);

  useEffect(() => {
    // Start animation after delay
    const timeout = setTimeout(() => {
      // Y movement (up and down)
      translateY.value = withRepeat(
        withSequence(
          withTiming(-20, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );

      // X movement (subtle horizontal drift)
      translateX.value = withRepeat(
        withSequence(
          withTiming(10, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(-10, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );

      // Rotation
      rotate.value = withRepeat(
        withTiming(180, {
          duration: duration * 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // Opacity pulse
      opacityValue.value = withRepeat(
        withSequence(
          withTiming(opacity, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.2, {
            duration: duration * 500,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1,
        false
      );
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [delay, duration, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacityValue.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: x,
          top: y,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
  },
});

