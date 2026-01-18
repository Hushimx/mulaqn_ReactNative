export const PERFORMANCE_LEVELS = {
  EXPERT: {
    threshold: 86,
    label: 'خبير',
    color: '#8B5CF6',
  },
  ADVANCED: {
    threshold: 71,
    label: 'متقدم',
    color: '#10B981',
  },
  PROFICIENT: {
    threshold: 51,
    label: 'متمكن',
    color: '#FCD34D',
  },
  DEVELOPING: {
    threshold: 26,
    label: 'نامٍ',
    color: '#F59E0B',
  },
  BEGINNER: {
    threshold: 0,
    label: 'مبتدئ',
    color: '#EF4444',
  },
  NOT_STARTED: {
    threshold: null,
    label: 'لم يبدأ',
    color: '#6B7280',
  },
};

export const PERFORMANCE_RELIABILITY = {
  INSUFFICIENT: {
    threshold: 0,
    label: 'غير كافٍ',
    message: 'حل المزيد من الأسئلة للحصول على تقييم دقيق',
  },
  PRELIMINARY: {
    threshold: 3,
    label: 'تقدير مبدئي',
    message: 'هذا تقدير مبدئي بناءً على عدد قليل من الأسئلة',
  },
  RELIABLE: {
    threshold: 10,
    label: 'موثوق',
    message: 'هذا تقييم موثوق بناءً على عدد كافٍ من الأسئلة',
  },
  HIGH_CONFIDENCE: {
    threshold: 20,
    label: 'ثقة عالية',
    message: 'هذا تقييم دقيق بناءً على عدد كبير من الأسئلة',
  },
};

export function getPerformanceLevel(percentage: number | null) {
  if (percentage === null || percentage === 0) {
    return PERFORMANCE_LEVELS.NOT_STARTED;
  }
  
  if (percentage >= PERFORMANCE_LEVELS.EXPERT.threshold) {
    return PERFORMANCE_LEVELS.EXPERT;
  }
  
  if (percentage >= PERFORMANCE_LEVELS.ADVANCED.threshold) {
    return PERFORMANCE_LEVELS.ADVANCED;
  }
  
  if (percentage >= PERFORMANCE_LEVELS.PROFICIENT.threshold) {
    return PERFORMANCE_LEVELS.PROFICIENT;
  }
  
  if (percentage >= PERFORMANCE_LEVELS.DEVELOPING.threshold) {
    return PERFORMANCE_LEVELS.DEVELOPING;
  }
  
  return PERFORMANCE_LEVELS.BEGINNER;
}

export function getReliabilityLevel(nQuestions: number): string {
  if (nQuestions >= PERFORMANCE_RELIABILITY.HIGH_CONFIDENCE.threshold) {
    return 'high_confidence';
  }
  
  if (nQuestions >= PERFORMANCE_RELIABILITY.RELIABLE.threshold) {
    return 'reliable';
  }
  
  if (nQuestions >= PERFORMANCE_RELIABILITY.PRELIMINARY.threshold) {
    return 'preliminary';
  }
  
  return 'insufficient';
}

export function isEstimate(reliability: string): boolean {
  return reliability === 'insufficient' || reliability === 'preliminary';
}

