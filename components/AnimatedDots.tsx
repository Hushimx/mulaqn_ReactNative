import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface AnimatedDotsProps {
  count: number;
  activeIndex: number;
  dotColor?: string;
  activeDotColor?: string;
  dotSize?: number;
  activeDotSize?: number;
  duration?: number;
  gap?: number;
  style?: ViewStyle;
}

export default function AnimatedDots({
  count,
  activeIndex,
  dotColor = '#BDBDBD',
  activeDotColor = '#D4AF37',
  dotSize = 8,
  activeDotSize = 24,
  duration = 300,
  gap = 8,
  style,
}: AnimatedDotsProps) {
  const animatedValues = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    animatedValues.forEach((animValue, index) => {
      Animated.timing(animValue, {
        toValue: index === activeIndex ? 1 : 0,
        duration,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex, duration]);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => {
        const width = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [dotSize, activeDotSize],
        });

        const backgroundColor = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [dotColor, activeDotColor],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width,
                height: dotSize,
                backgroundColor,
                marginHorizontal: gap / 2,
                borderRadius: dotSize / 2,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 4,
  },
});


