/**
 * Avatar Helper Utilities
 * Helper functions for rendering geometric shapes as avatars
 */

export type AvatarShape = 'circle' | 'square' | 'triangle' | 'star' | 'hexagon' | 'diamond';
export type AvatarColor = string;

export const AVATAR_COLORS = {
  gold: '#F4D03F',
  blue: '#5DADE2',
  green: '#58D68D',
  purple: '#BB8FCE',
  orange: '#F8B739',
  pink: '#F1948A',
} as const;

export const AVATAR_SHAPES: AvatarShape[] = ['circle', 'square', 'triangle', 'star', 'hexagon', 'diamond'];

export const AVATAR_COLOR_LIST = [
  AVATAR_COLORS.gold,
  AVATAR_COLORS.blue,
  AVATAR_COLORS.green,
  AVATAR_COLORS.purple,
  AVATAR_COLORS.orange,
  AVATAR_COLORS.pink,
];

/**
 * Get default avatar shape and color for a user
 */
export function getDefaultAvatar(userId?: number): { shape: AvatarShape; color: string } {
  const index = userId ? userId % AVATAR_SHAPES.length : 0;
  return {
    shape: AVATAR_SHAPES[index],
    color: AVATAR_COLOR_LIST[index],
  };
}

/**
 * Get avatar configuration from user object
 */
export function getAvatarConfig(user: { avatar_shape?: string | null; avatar_color?: string | null; id?: number }): {
  shape: AvatarShape;
  color: string;
} {
  if (user.avatar_shape && user.avatar_color) {
    return {
      shape: user.avatar_shape as AvatarShape,
      color: user.avatar_color,
    };
  }
  return getDefaultAvatar(user.id);
}


