import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, ScrollView, Alert, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

interface Tag {
  id: number;
  name: string;
  color: string;
  order?: number;
}

interface QuestionPreviewSheetProps {
  visible: boolean;
  questionStem: string;
  lessonName: string;
  hasNote: boolean;
  tags?: Tag[];
  allTags?: Tag[]; // All available tags for adding
  savedQuestionId?: number;
  hasImage?: boolean;
  imageUrl?: string;
  onClose: () => void;
  onViewPress: () => void;
  onPracticePress: () => void;
  onTagsUpdate?: (tagIds: number[]) => void; // Callback when tags are updated
}

// Helper to extract colors from gradient
const getTagChipColors = (gradientString: string): string[] => {
  const rgbaMatches = gradientString.match(/rgba\([^)]+\)/g);
  if (rgbaMatches && rgbaMatches.length >= 2) {
    // زيادة opacity لتكون أوضح وأكثر وضوحاً
    const color1 = rgbaMatches[0].replace(/0\.2\)/, '0.6)').replace(/0\.05\)/, '0.3)');
    const color2 = rgbaMatches[1].replace(/0\.2\)/, '0.4)').replace(/0\.05\)/, '0.2)');
    return [color1, color2];
  }
  if (rgbaMatches && rgbaMatches.length === 1) {
    const color = rgbaMatches[0].replace(/0\.2\)/, '0.6)').replace(/0\.05\)/, '0.3)');
    return [color, color.replace('0.6', '0.4').replace('0.3', '0.2')];
  }
  return ['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.4)'];
};

// Helper to get first color for chip background
const getTagChipColor = (gradientString: string): string => {
  const colors = getTagChipColors(gradientString);
  return colors[0];
};

export const QuestionPreviewSheet: React.FC<QuestionPreviewSheetProps> = ({
  visible,
  questionStem,
  lessonName,
  hasNote,
  tags = [],
  allTags = [],
  savedQuestionId,
  hasImage = false,
  imageUrl,
  onClose,
  onViewPress,
  onPracticePress,
  onTagsUpdate,
}) => {
  const [currentTags, setCurrentTags] = useState<Tag[]>(tags || []);
  const [showTagSelector, setShowTagSelector] = useState(false);

  React.useEffect(() => {
    if (visible) {
      console.log('QuestionPreviewSheet - Tags received:', tags);
      console.log('QuestionPreviewSheet - Tags count:', tags?.length || 0);
      const tagsArray = tags || [];
      console.log('QuestionPreviewSheet - Setting currentTags:', tagsArray.length);
      setCurrentTags(tagsArray);
      setShowTagSelector(false);
    }
  }, [tags, visible]);

  const handleRemoveTag = (tagId: number) => {
    const newTags = currentTags.filter(t => t.id !== tagId);
    setCurrentTags(newTags);
    
    if (onTagsUpdate && savedQuestionId) {
      onTagsUpdate(newTags.map(t => t.id));
    }
  };

  const handleAddTag = (tag: Tag) => {
    if (currentTags.some(t => t.id === tag.id)) {
      return; // Tag already added
    }
    
    const newTags = [...currentTags, tag];
    setCurrentTags(newTags);
    setShowTagSelector(false);
    
    if (onTagsUpdate && savedQuestionId) {
      onTagsUpdate(newTags.map(t => t.id));
    }
  };

  const availableTags = (allTags || []).filter(tag => !currentTags.some(t => t.id === tag.id));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        
        <Animated.View entering={SlideInDown.duration(300).springify()} style={styles.sheetContainer}>
          <BlurView intensity={80} tint="dark" style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>معاينة السؤال</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#8FA4C0" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContent} 
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Question Content */}
              <View style={styles.content}>
                {/* Question Text */}
                <View style={styles.questionContainer}>
                  <MaterialIcons name="help-outline" size={24} color="#D4AF37" />
                  <Text style={styles.questionText}>{questionStem}</Text>
                </View>

                {/* Question Image */}
                {hasImage && imageUrl && (
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: imageUrl }} 
                      style={styles.questionImage}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Lesson Badge */}
                <View style={styles.lessonBadge}>
                  <MaterialIcons name="school" size={16} color="#10B981" />
                  <Text style={styles.lessonText}>{lessonName}</Text>
                </View>

                {/* Tags Section */}
                <View style={styles.tagsSection}>
                  <Text style={styles.sectionTitle}>التصنيفات</Text>
                  <View style={styles.tagsContainer}>
                    {currentTags && currentTags.length > 0 ? (
                      currentTags.map((tag) => {
                        const tagColors = getTagChipColors(tag.color);
                        console.log('Rendering tag:', tag.name, 'with colors:', tagColors);
                        return (
                          <View key={tag.id} style={styles.tagChip}>
                            <LinearGradient
                              colors={tagColors}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.tagGradient}
                            >
                              <Text style={styles.tagText}>{tag.name}</Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveTag(tag.id)}
                                style={styles.removeTagButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <MaterialIcons name="close" size={16} color="#FFFFFF" />
                              </TouchableOpacity>
                            </LinearGradient>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noTagsHint}>لا توجد تصنيفات</Text>
                    )}
                    
                    {/* Add Tag Button - Always visible */}
                    <TouchableOpacity
                      style={styles.addTagButton}
                      onPress={() => {
                        console.log('Add tag button pressed, availableTags:', availableTags.length);
                        setShowTagSelector(!showTagSelector);
                      }}
                    >
                      <MaterialIcons name="add" size={22} color="#D4AF37" />
                    </TouchableOpacity>
                  </View>

                  {/* Tag Selector Dropdown */}
                  {showTagSelector && availableTags.length > 0 && (
                    <View style={styles.tagSelector}>
                      <ScrollView style={styles.tagSelectorList} nestedScrollEnabled>
                        {availableTags.map((tag) => {
                          const tagColor = getTagChipColor(tag.color);
                          return (
                            <TouchableOpacity
                              key={tag.id}
                              style={styles.tagOption}
                              onPress={() => handleAddTag(tag)}
                            >
                              <View style={[styles.tagColorIndicator, { backgroundColor: tagColor }]} />
                              <Text style={styles.tagOptionText}>{tag.name}</Text>
                              <MaterialIcons name="add" size={18} color="#D4AF37" />
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {showTagSelector && availableTags.length === 0 && (
                    <View style={styles.noTagsMessage}>
                      <Text style={styles.noTagsText}>جميع التصنيفات مضافة</Text>
                    </View>
                  )}
                </View>

                {/* Note Indicator */}
                {hasNote && (
                  <View style={styles.noteIndicator}>
                    <MaterialIcons name="note" size={20} color="#D4AF37" />
                    <Text style={styles.noteText}>يوجد ملاحظة مسجلة</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewButton]}
                onPress={onViewPress}
                activeOpacity={0.8}
              >
                <MaterialIcons name="visibility" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>عرض</Text>
                <Text style={styles.actionButtonSubtext}>الإجابة والشرح</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.practiceButton]}
                onPress={onPracticePress}
                activeOpacity={0.8}
              >
                <MaterialIcons name="psychology" size={22} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>جرب</Text>
                <Text style={styles.actionButtonSubtext}>اختبر نفسك</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: height * 0.85,
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    height: height * 0.75,
    flexDirection: 'column',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#8FA4C0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  questionContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
  },
  imageContainer: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  lessonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  lessonText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  tagsSection: {
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    minHeight: 50,
  },
  tagChip: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tagGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    minHeight: 44,
    minWidth: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noTagsHint: {
    fontSize: 13,
    color: '#8FA4C0',
    fontStyle: 'italic',
  },
  removeTagButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagSelector: {
    marginTop: 8,
    backgroundColor: 'rgba(18, 38, 57, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    maxHeight: 200,
  },
  tagSelectorList: {
    padding: 8,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 6,
  },
  tagColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  tagOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  noTagsMessage: {
    padding: 16,
    alignItems: 'center',
  },
  noTagsText: {
    fontSize: 14,
    color: '#8FA4C0',
  },
  noteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  noteText: {
    fontSize: 14,
    color: '#D4AF37',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.2)',
    backgroundColor: 'transparent',
  },
  actionButton: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  viewButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  practiceButton: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
