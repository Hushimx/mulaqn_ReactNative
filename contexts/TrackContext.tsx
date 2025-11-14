import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TrackColors {
  primary: string;
  gradient: readonly [string, string, string];
}

interface TrackContextType {
  currentTrackId: number | null;
  trackColors: TrackColors;
  setCurrentTrack: (id: number) => void;
}

const defaultColors: TrackColors = {
  primary: '#D4AF37',
  gradient: ['#0F1419', '#1B365D', '#2E5984'] as const,
};

const TrackContext = createContext<TrackContextType | undefined>(undefined);

export const getTrackColors = (trackId: number | null): TrackColors => {
  switch (trackId) {
    case 1: // قدرات - أخضر
      return {
        primary: '#118066',
        gradient: ['#118D66', '#10372F', '#10372F'] as const,
      };
    case 2: // تحصيلي - أزرق
      return {
        primary: '#3B82F6',
        gradient: ['#2C5CA8', '#172944', '#172944'] as const,
      };
    case 3: // STEP - بنفسجي
      return {
        primary: '#8B5CF6',
        gradient: ['#0F1419', '#8B5CF6', '#1B365D'] as const,
      };
    default:
      return defaultColors;
  }
};

export function TrackProvider({ children }: { children: ReactNode }) {
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);

  const setCurrentTrack = (id: number) => {
    setCurrentTrackId(id);
  };

  const trackColors = getTrackColors(currentTrackId);

  return (
    <TrackContext.Provider value={{ currentTrackId, trackColors, setCurrentTrack }}>
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

