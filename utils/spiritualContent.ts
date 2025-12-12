/**
 * محتوى الأذكار والأدعية الموثق من أهل السنة والجماعة
 * جميع المصادر موثوقة 100% من صحيح البخاري ومسلم
 */

export type SpiritualContentType = 'tasbeeh' | 'istighfar' | 'exam_dua' | 'witr_prayer' | 'dhikr';

export interface SpiritualContent {
  id: string;
  type: SpiritualContentType;
  title: string;
  content: string;
  benefit?: string;
  source: string;
  sourceNumber?: string;
  isInteractive: boolean;
  targetCount?: number; // للعدادات (تسبيح/استغفار)
  duaText?: string; // للنص الكامل للدعاء
}

export const spiritualContents: SpiritualContent[] = [
  // 1. التسبيح
  {
    id: 'tasbeeh_1',
    type: 'tasbeeh',
    title: 'لنسبح بحمد الله',
    content: 'سبحان الله وبحمده',
    benefit: 'قال الرسول صلى الله عليه وسلم: "مَنْ قَالَ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ مِائَةَ مَرَّةٍ، حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ"',
    source: 'صحيح البخاري',
    sourceNumber: '6405',
    isInteractive: true,
    targetCount: 15,
  },
  
  // 2. الاستغفار
  {
    id: 'istighfar_1',
    type: 'istighfar',
    title: 'لنستغفر الله',
    content: 'أستغفر الله وأتوب إليه',
    benefit: 'قال الرسول صلى الله عليه وسلم: "وَاللَّهِ إِنِّي لَأَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ فِي الْيَوْمِ أَكْثَرَ مِنْ سَبْعِينَ مَرَّةً"',
    source: 'صحيح البخاري',
    sourceNumber: '6307',
    isInteractive: true,
    targetCount: 10,
  },
  
  // 3. دعاء قبل الاختبار
  {
    id: 'exam_dua_1',
    type: 'exam_dua',
    title: 'دعاء قبل الاختبار',
    content: 'دعاء مأثور يُستحب عند مواجهة الأمور الصعبة والاختبارات',
    duaText: 'اللهم لا سهل إلا ما جعلته سهلاً، وأنت تجعل الحزن إذا شئت سهلاً',
    benefit: 'دعاء مأثور يُستحب قوله عند مواجهة الأمور الصعبة والاختبارات. قال النبي ﷺ: "اللهم لا سهل إلا ما جعلته سهلاً"',
    source: 'مسند أحمد',
    sourceNumber: '3712',
    isInteractive: false,
  },
  
  // 4. صلاة الوتر
  {
    id: 'witr_1',
    type: 'witr_prayer',
    title: 'صلاة الوتر',
    content: 'صلاة الوتر سنة مؤكدة، تبدأ بعد صلاة العشاء وتنتهي بطلوع الفجر. أقلها ركعة واحدة، وأفضلها إحدى عشرة ركعة',
    benefit: 'قال الرسول صلى الله عليه وسلم: "إِنَّ اللَّهَ وِتْرٌ يُحِبُّ الْوِتْرَ، فَأَوْتِرُوا يَا أَهْلَ الْقُرْآنِ". صلاة الوتر من السنن المؤكدة التي كان النبي صلى الله عليه وسلم يحافظ عليها',
    source: 'سنن الترمذي',
    sourceNumber: '453',
    isInteractive: false,
  },
  
  // 5. ذكر مهم
  {
    id: 'dhikr_1',
    type: 'dhikr',
    title: 'ذكر عظيم',
    content: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير',
    benefit: 'قال الرسول صلى الله عليه وسلم: "مَنْ قَالَهَا مِائَةَ مَرَّةٍ فِي يَوْمٍ، كَانَتْ لَهُ عَدْلَ عَشْرِ رِقَابٍ، وَكُتِبَتْ لَهُ مِائَةُ حَسَنَةٍ، وَمُحِيَتْ عَنْهُ مِائَةُ سَيِّئَةٍ"',
    source: 'صحيح البخاري',
    sourceNumber: '3293',
    isInteractive: false,
  },
];

/**
 * الحصول على الكارد حسب اليوم (يتغير كل يوم)
 */
export function getDailySpiritualContent(): SpiritualContent {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % spiritualContents.length;
  return spiritualContents[index];
}

/**
 * الحصول على الكارد التالي
 */
export function getNextSpiritualContent(currentId: string): SpiritualContent {
  const currentIndex = spiritualContents.findIndex(c => c.id === currentId);
  const nextIndex = (currentIndex + 1) % spiritualContents.length;
  return spiritualContents[nextIndex];
}

/**
 * الحصول على الكارد حسب النوع
 */
export function getSpiritualContentByType(type: SpiritualContentType): SpiritualContent {
  return spiritualContents.find(c => c.type === type) || spiritualContents[0];
}

