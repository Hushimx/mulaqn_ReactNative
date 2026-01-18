import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSharedValue } from 'react-native-reanimated';

interface DayColumnProps {
  date: string;
  dayName: string;
  dayNumber: number;
  items: Array<{
    lesson_id: number;
    lesson_title: string;
  }>;
  trackColor: string;
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
  onDrop?: (date: string, lessonId: number) => void;
}

export function DayColumn({
  date,
  dayName,
  dayNumber,
  items,
  trackColor,
  isRTL,
  textAlign,
  onDrop,
}: DayColumnProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: trackColor,
          backgroundColor: `${trackColor}10`,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.header, { backgroundColor: `${trackColor}33` }]}>
        <Text style={[styles.dayName, { textAlign, color: trackColor }]}>
          {dayName}
        </Text>
        <Text style={[styles.dayNumber, { textAlign, color: trackColor }]}>
          {dayNumber}
        </Text>
      </View>

      <View style={styles.itemsContainer}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="add-circle-outline" size={32} color={`${trackColor}60`} />
            <Text style={[styles.emptyText, { textAlign, color: `${trackColor}80` }]}>
              اسحب درس هنا
            </Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View
              key={`${item.lesson_id}-${index}`}
              style={[
                styles.item,
                {
                  borderColor: trackColor,
                  backgroundColor: `${trackColor}20`,
                },
              ]}
            >
              <Text
                style={[styles.itemTitle, { textAlign, color: trackColor }]}
                numberOfLines={2}
              >
                {item.lesson_title}
              </Text>
            </View>
          ))
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 140,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    marginRight: 12,
  },
  header: {
    padding: 12,
    alignItems: 'center',
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  itemsContainer: {
    padding: 8,
    minHeight: 200,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 8,
  },
  item: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
});



