import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

interface DraggableLessonProps {
  lesson: {
    id: number;
    title: string;
    difficulty?: string;
  };
  usageCount: number;
  trackColor: string;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
}

export function DraggableLesson({
  lesson,
  usageCount,
  trackColor,
  onDragStart,
  onDragEnd,
  isRTL,
  textAlign,
}: DraggableLessonProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.1);
      onDragStart?.();
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      onDragEnd?.();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          {
            borderColor: trackColor,
            backgroundColor: `${trackColor}15`,
          },
          animatedStyle,
        ]}
      >
        <View style={styles.content}>
          <Text
            style={[styles.title, { textAlign, color: trackColor }]}
            numberOfLines={2}
          >
            {lesson.title}
          </Text>
          <View style={[styles.footer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.countBadge, { backgroundColor: trackColor }]}>
              <Text style={styles.countText}>{usageCount}</Text>
            </View>
            <MaterialIcons name="drag-handle" size={20} color={trackColor} />
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 80,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});



