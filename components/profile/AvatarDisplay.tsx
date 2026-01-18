import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Circle, Polygon } from 'react-native-svg';
import { AvatarShape, getAvatarConfig, AVATAR_COLORS } from '@/utils/avatar';

interface AvatarDisplayProps {
  shape?: AvatarShape | string | null;
  color?: string | null;
  size?: number;
  user?: { avatar_shape?: string | null; avatar_color?: string | null; id?: number };
  style?: ViewStyle;
}

/**
 * AvatarDisplay Component
 * Displays a geometric shape as user avatar
 */
export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  shape,
  color,
  size = 50,
  user,
  style,
}) => {
  // Get avatar config from user object or props
  const config = user ? getAvatarConfig(user) : { shape: (shape as AvatarShape) || 'circle', color: color || AVATAR_COLORS.gold };
  const avatarShape = config.shape;
  const avatarColor = config.color;

  const renderShape = () => {
    const center = size / 2;
    const radius = size * 0.4;
    const viewBox = `0 0 ${size} ${size}`;

    switch (avatarShape) {
      case 'circle':
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Circle cx={center} cy={center} r={radius} fill={avatarColor} />
          </Svg>
        );

      case 'square':
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Path
              d={`M ${size * 0.2} ${size * 0.2} L ${size * 0.8} ${size * 0.2} L ${size * 0.8} ${size * 0.8} L ${size * 0.2} ${size * 0.8} Z`}
              fill={avatarColor}
            />
          </Svg>
        );

      case 'triangle':
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Polygon
              points={`${center},${size * 0.15} ${size * 0.15},${size * 0.85} ${size * 0.85},${size * 0.85}`}
              fill={avatarColor}
            />
          </Svg>
        );

      case 'star':
        // 5-pointed star
        const starPoints = [];
        const outerRadius = radius;
        const innerRadius = radius * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outerRadius : innerRadius;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          starPoints.push(`${x},${y}`);
        }
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Polygon points={starPoints.join(' ')} fill={avatarColor} />
          </Svg>
        );

      case 'hexagon':
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          hexPoints.push(`${x},${y}`);
        }
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Polygon points={hexPoints.join(' ')} fill={avatarColor} />
          </Svg>
        );

      case 'diamond':
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Polygon
              points={`${center},${size * 0.15} ${size * 0.85},${center} ${center},${size * 0.85} ${size * 0.15},${center}`}
              fill={avatarColor}
            />
          </Svg>
        );

      default:
        return (
          <Svg width={size} height={size} viewBox={viewBox}>
            <Circle cx={center} cy={center} r={radius} fill={avatarColor} />
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {renderShape()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});


