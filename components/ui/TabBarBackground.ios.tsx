import React, { useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTrack } from '@/contexts/TrackContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const defaultOpacities = [0, 0.5, 1];

interface TabBarBackgroundProps {
  opacities?: number[];
}

export default function TabBarBackground({ 
  opacities = defaultOpacities 
}: TabBarBackgroundProps = {}) {
  // استخدام ألوان الـ Track الحالي من Context
  const { trackColors, currentTrackId } = useTrack();
  const svgHeight = 107; // نفس الارتفاع من Union.svg
  const originalWidth = 375; // العرض الأصلي من Union.svg
  
  // Helper function to darken a hex color
  function darkenColor(hex: string, factor: number = 0.3): string {
    const hexWithoutHash = hex.replace('#', '');
    const r = parseInt(hexWithoutHash.substring(0, 2), 16);
    const g = parseInt(hexWithoutHash.substring(2, 4), 16);
    const b = parseInt(hexWithoutHash.substring(4, 6), 16);
    
    const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
    const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
    const newB = Math.max(0, Math.min(255, Math.round(b * factor)));
    
    return `rgba(${newR}, ${newG}, ${newB}, 0.90)`;
  }

  // استخدام gradient colors من الـ track أو ألوان افتراضية للداشبورد الأساسي
  // استخدام ألوان أغمق من لون المسار للـ tab bar
  const colors = useMemo(() => {
    if (currentTrackId && trackColors.primary) {
      // داخل track - استخدم ألوان أغمق من لون المسار
      const primaryColor = trackColors.primary;
      const darkColor = darkenColor(primaryColor, 0.25); // أغمق بنسبة 75%
      const darkerColor = darkenColor(primaryColor, 0.15); // أغمق بنسبة 85%
      
      return [
        '#0F1419',    // أسود داكن (ثابت)
        darkerColor,  // لون المسار أغمق جداً
        darkColor,    // لون المسار أغمق
      ] as const;
    } else {
      // الداشبورد الأساسي - ألوان متناسقة من نفس العائلة
      return [
        '#0F1419',    // أسود داكن
        '#1B365D',    // أزرق داكن
        '#234B6E',    // أزرق أقل سطوعاً - أقرب للوسط
      ] as const;
    }
  }, [trackColors.primary, trackColors.gradient, currentTrackId]);
  
  // Path من Union.svg - سنستخدم viewBox للتحويل التلقائي
  const path = "M188 0C202.146 0 214.385 8.15921 220.27 20.0282C223.44 26.4221 229.179 32 236.316 32H369C372.314 32 375 34.6863 375 38V87C375 98.0457 366.046 107 355 107H20C8.95431 107 0 98.0457 0 87V38C0 34.6863 2.68629 32 6 32H139.684C146.821 32 152.56 26.4221 155.73 20.0282C161.615 8.15921 173.854 0 188 0Z";

  return (
    <Svg
      width={SCREEN_WIDTH}
      height={svgHeight}
      viewBox={`0 0 ${originalWidth} ${svgHeight}`}
      preserveAspectRatio="none"
      style={styles.container}
    >
      <Defs>
        <LinearGradient
          id="tabBarGradient"
          x1="0%"
          y1="0%"
          x2="5.5%"
          y2="110%"
          gradientUnits="objectBoundingBox"
        >
          <Stop offset="0%" stopColor={colors[2]} stopOpacity={opacities[0]} />
          <Stop offset="50%" stopColor={colors[1]} stopOpacity={opacities[1]} />
          <Stop offset="100%" stopColor={colors[2]} stopOpacity={opacities[2]} />
        </LinearGradient>
      </Defs>
      <Path
        d={path}
        fill="url(#tabBarGradient)"
        stroke="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export function useBottomTabOverflow() {
  return 32; // ارتفاع الـ notch من Union.svg
}
