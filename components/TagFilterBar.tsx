import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface Tag {
  id: number;
  name: string;
  color: string;
  order: number;
  saved_questions_count?: number;
}

interface TagFilterBarProps {
  tags: Tag[];
  activeTagId: number | null;
  onTagPress: (tagId: number | null) => void;
  onAddPress: () => void;
  onTagLongPress?: (tag: Tag) => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  tags,
  activeTagId,
  onTagPress,
  onAddPress,
  onTagLongPress,
}) => {
  // Sort tags by order
  const sortedTags = [...tags].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Filter */}
        <TouchableOpacity
          style={[
            styles.filterPill,
            activeTagId === null && styles.filterPillActive,
          ]}
          onPress={() => onTagPress(null)}
        >
          <Text
            style={[
              styles.filterText,
              activeTagId === null && styles.filterTextActive,
            ]}
          >
            الكل
          </Text>
        </TouchableOpacity>

        {/* Tags */}
        {sortedTags.map((tag, index) => (
          <Animated.View
            key={tag.id}
            entering={FadeInDown.duration(300).delay(index * 50)}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTagId === tag.id && styles.filterPillActive,
              ]}
              onPress={() => onTagPress(tag.id)}
              onLongPress={() => onTagLongPress?.(tag)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeTagId === tag.id && styles.filterTextActive,
                ]}
              >
                {tag.name}
              </Text>
              {tag.saved_questions_count !== undefined && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {tag.saved_questions_count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
        >
          <MaterialIcons name="add" size={20} color="#D4AF37" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    gap: 6,
    minHeight: 40,
  },
  filterPillActive: {
    backgroundColor: '#D4AF37',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8FA4C0',
  },
  filterTextActive: {
    color: '#1B365D',
  },
  countBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 2,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

