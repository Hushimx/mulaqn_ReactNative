import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TrackColors {
  primary: string;
  gradient: readonly [string, string, string];
}

interface TrackContextType {
  currentTrackId: number | null;
  currentTrack: Track | null;
  trackColors: TrackColors;
  setCurrentTrack: (id: number | null, track?: Track | null) => void;
}

const defaultColors: TrackColors = {
  primary: '#D4AF37',
  gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
};

const TrackContext = createContext<TrackContextType | undefined>(undefined);

interface Track {
  id: number;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  icon_emoji?: string;
  primary_color?: string;
  bg_color?: string;
  gradient_colors?: string[];
  hero_title?: string;
  hero_subtitle?: string;
  marketing_stats?: Array<{icon: string, label: string, value: string}>;
  marketing_features?: string[];
  marketing_benefits?: string[];
  status?: string;
  has_subscription?: boolean;
  subscription_status?: string;
}

export const getTrackColors = (trackOrId: Track | number | null): TrackColors => {
  // Handle Track object
  if (trackOrId && typeof trackOrId === 'object' && 'id' in trackOrId) {
    const track = trackOrId as Track;
    if (track.primary_color && track.gradient_colors && track.gradient_colors.length >= 3) {
      return {
        primary: track.primary_color,
        gradient: track.gradient_colors as [string, string, string],
      };
    }
    // Fallback to hardcoded values based on track ID
    switch (track.id) {
      case 1: // قدرات - أخضر
        return {
          primary: '#10B981',
          gradient: ['#0F1419', '#0A2E1F', '#1B365D'] as const,
        };
      case 2: // تحصيلي - أزرق
        return {
          primary: '#3B82F6',
          gradient: ['#0F1419', '#0F1B2E', '#1B365D'] as const,
        };
      case 3: // STEP - بنفسجي
        return {
          primary: '#8B5CF6',
          gradient: ['#0F1419', '#1A1526', '#1B365D'] as const,
        };
      default:
        return defaultColors;
    }
  }
  
  // Handle trackId (number) - fallback only
  if (typeof trackOrId === 'number') {
    switch (trackOrId) {
      case 1: // قدرات - أخضر
        return {
          primary: '#10B981',
          gradient: ['#0F1419', '#0A2E1F', '#1B365D'] as const,
        };
      case 2: // تحصيلي - أزرق
        return {
          primary: '#3B82F6',
          gradient: ['#0F1419', '#0F1B2E', '#1B365D'] as const,
        };
      case 3: // STEP - بنفسجي
        return {
          primary: '#8B5CF6',
          gradient: ['#0F1419', '#1A1526', '#1B365D'] as const,
        };
      default:
        return defaultColors;
    }
  }
  
  return defaultColors;
};

export function TrackProvider({ children }: { children: ReactNode }) {
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [currentTrack, setCurrentTrackData] = useState<Track | null>(null);

  const setCurrentTrack = (id: number | null, track?: Track | null) => {
    setCurrentTrackId(id);
    setCurrentTrackData(track || null);
  };

  // Use track object if available, otherwise fallback to trackId
  const trackColors = getTrackColors(currentTrack || currentTrackId);

  return (
    <TrackContext.Provider value={{ currentTrackId, currentTrack, trackColors, setCurrentTrack }}>
      {children}
    </TrackContext.Provider>
  );
}

export function useTrack() {
  const context = useContext(TrackContext);
  if (context === undefined) {
    throw new Error('useTrack must be used within a TrackProvider');
  }
  return context;
}

