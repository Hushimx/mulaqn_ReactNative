import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Tag {
  id: number;
  name: string;
  color: string; // gradient string
  order?: number;
}

interface SavedQuestionCardProps {
  id: number;
  stem: string;
  lessonName: string;
  categoryName?: string;
  trackName?: string;
  trackColor: string;
  hasNote: boolean;
  tags: Tag[];
  createdAt: string;
  hasImage?: boolean;
  imageUrl?: string;
  onPress: () => void;
  index: number;
}

// Helper function to extract colors from gradient string
const extractColorsFromGradient = (gradientString: string): string[] => {
  // Extract rgba colors from gradient string
  const rgbaMatches = gradientString.match(/rgba\([^)]+\)/g);
  if (rgbaMatches && rgbaMatches.length >= 2) {
    return [rgbaMatches[0], rgbaMatches[1]];
  }
  // Fallback colors
  return ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'];
};

// Get gradient colors for card background (max 4 tags)
const getCardGradientColors = (tags: Tag[]): string[] => {
  if (tags.length === 0) {
    return ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'];
  }

  // Sort tags by order if available
  const sortedTags = [...tags].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Take first 4 tags
  const selectedTags = sortedTags.slice(0, 4);
  
  // Extract colors from each tag's gradient
  const allColors: string[] = [];
  selectedTags.forEach(tag => {
    const colors = extractColorsFromGradient(tag.color);
    allColors.push(...colors);
  });

  // If we have more than 4 colors, take first and last 2
  if (allColors.length > 4) {
    return [allColors[0], allColors[1], allColors[allColors.length - 2], allColors[allColors.length - 1]];
  }

  // If we have less than 2 colors, duplicate
  if (allColors.length < 2) {
    return allColors.length === 1 ? [allColors[0], allColors[0]] : ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'];
  }

  return allColors;
};

// Get tag chip color (first color from gradient)
const getTagChipColor = (gradientString: string): string => {
  const rgbaMatches = gradientString.match(/rgba\([^)]+\)/g);
  if (rgbaMatches && rgbaMatches.length > 0) {
    return rgbaMatches[0];
  }
  return 'rgba(255, 255, 255, 0.2)';
};

export const SavedQuestionCard: React.FC<SavedQuestionCardProps> = ({
  stem,
  lessonName,
  categoryName,
  trackName,
  trackColor,
  hasNote,
  tags,
  createdAt,
  hasImage = false,
  imageUrl,
  onPress,
  index,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Reset time to start of day for accurate day comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const questionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Calculate difference in days
    const diffTime = today.getTime() - questionDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `قبل ${diffDays} يوم`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return weeks === 1 ? 'قبل أسبوع' : `قبل ${weeks} أسابيع`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return months === 1 ? 'قبل شهر' : `قبل ${months} أشهر`;
    }
    const years = Math.floor(diffDays / 365);
    return years === 1 ? 'قبل سنة' : `قبل ${years} سنوات`;
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const gradientColors = getCardGradientColors(tags);
  const sortedTags = [...tags].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 50)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.card, { borderColor: `${trackColor}40` }]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <BlurView intensity={20} tint="dark" style={styles.blurOverlay}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerRight}>
                  {/* Image indicator */}
                  {hasImage && (
                    <View style={styles.imageIndicator}>
                      <MaterialIcons name="image" size={14} color="#8B5CF6" />
                    </View>
                  )}
                  {/* Tags count indicator */}
                  {tags.length > 0 && (
                    <View style={styles.tagsCountBadge}>
                      <MaterialIcons name="label" size={12} color="#D4AF37" />
                      <Text style={styles.tagsCountText}>{tags.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.date}>{formatDate(createdAt)}</Text>
              </View>

              {/* Question Stem */}
              <Text style={styles.questionText}>{truncateText(stem)}</Text>

              {/* Lesson Info */}
              <View style={styles.lessonInfo}>
                <View style={[styles.badge, { backgroundColor: `${trackColor}20`, borderColor: trackColor }]}>
                  <MaterialIcons name="school" size={14} color={trackColor} />
                  <Text style={[styles.badgeText, { color: trackColor }]}>
                    {lessonName}
                  </Text>
                </View>
                {categoryName && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{categoryName}</Text>
                  </View>
                )}
              </View>

              {/* Tags */}
              {sortedTags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {sortedTags.map((tag) => {
                    const tagColor = getTagChipColor(tag.color);
                    return (
                      <View
                        key={tag.id}
                        style={[styles.tag, { backgroundColor: `${tagColor}40`, borderColor: tagColor }]}
                      >
                        <Text style={[styles.tagText, { color: tagColor }]}>{tag.name}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Footer */}
              <View style={styles.footer}>
                {/* Note Indicator */}
                {hasNote && (
                  <View style={styles.noteIndicator}>
                    <MaterialIcons name="note" size={16} color="#D4AF37" />
                  </View>
                )}
              </View>
            </BlurView>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    overflow: 'hidden',
  },
  gradientBackground: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  blurOverlay: {
    padding: 20,
    backgroundColor: 'rgba(18, 38, 57, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  tagsCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4AF37',
  },
  date: {
    fontSize: 12,
    color: '#8FA4C0',
  },
  questionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  lessonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
  },
  categoryText: {
    fontSize: 12,
    color: '#8FA4C0',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  noteIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
