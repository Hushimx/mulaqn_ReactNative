import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { AvatarDisplay } from './AvatarDisplay';
import { AvatarShape, AVATAR_SHAPES, AVATAR_COLOR_LIST, AVATAR_COLORS } from '@/utils/avatar';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvatarSelectorProps {
  selectedShape?: AvatarShape | string | null;
  selectedColor?: string | null;
  onSelect: (shape: AvatarShape, color: string) => void;
  size?: number;
  style?: ViewStyle;
}

/**
 * AvatarSelector Component
 * Displays 6 geometric shapes in a grid for user selection
 */
export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
  selectedShape,
  selectedColor,
  onSelect,
  size = 80,
  style,
}) => {
  const { textAlign, flexDirection } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const avatars = AVATAR_SHAPES.map((shape, index) => ({
    shape,
    color: AVATAR_COLOR_LIST[index],
    label: getShapeLabel(shape),
  }));

  function getShapeLabel(shape: AvatarShape): string {
    const labels: Record<AvatarShape, string> = {
      circle: 'دائرة',
      square: 'مربع',
      triangle: 'مثلث',
      star: 'نجمة',
      hexagon: 'سداسي',
      diamond: 'معين',
    };
    return labels[shape];
  }

  const isSelected = (shape: AvatarShape, color: string) => {
    return selectedShape === shape && selectedColor === color;
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { textAlign }]}>اختر شكلك المفضل</Text>
      <View style={styles.grid}>
        {avatars.map((avatar, index) => {
          const selected = isSelected(avatar.shape, avatar.color);
          return (
            <Animated.View
              key={`${avatar.shape}-${avatar.color}`}
              entering={FadeInUp.duration(400).delay(index * 50).springify()}
              style={styles.avatarItem}
            >
              <TouchableOpacity
                style={[
                  styles.avatarButton,
                  selected && styles.avatarButtonSelected,
                  hoveredIndex === index && styles.avatarButtonHovered,
                ]}
                onPress={() => onSelect(avatar.shape, avatar.color)}
                onPressIn={() => setHoveredIndex(index)}
                onPressOut={() => setHoveredIndex(null)}
                activeOpacity={0.8}
              >
                <AvatarDisplay shape={avatar.shape} color={avatar.color} size={size} />
                {selected && (
                  <Animated.View
                    entering={ZoomIn.duration(200).springify()}
                    style={styles.selectedIndicator}
                  >
                    <View style={styles.selectedCheckmark} />
                  </Animated.View>
                )}
              </TouchableOpacity>
              <Text style={[styles.avatarLabel, { textAlign }]}>{avatar.label}</Text>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  avatarItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  avatarButtonSelected: {
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarButtonHovered: {
    transform: [{ scale: 1.05 }],
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1B365D',
  },
  selectedCheckmark: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1B365D',
  },
  avatarLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    fontWeight: '500',
  },
});

