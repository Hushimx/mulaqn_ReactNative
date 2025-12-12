import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface Tag {
  id?: number;
  name: string;
  color: string;
  order?: number;
}

interface TagManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tag: { name: string; color: string }) => void;
  editingTag?: Tag | null;
}

// 9 predefined gradient colors
const TAG_COLORS = [
  {
    name: 'أزرق',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(59,130,246,0.05))',
    colors: ['rgba(59,130,246,0.2)', 'rgba(59,130,246,0.05)'],
  },
  {
    name: 'وردي',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(236,72,153,0.05))',
    colors: ['rgba(236,72,153,0.2)', 'rgba(236,72,153,0.05)'],
  },
  {
    name: 'أخضر',
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
    colors: ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.05)'],
  },
  {
    name: 'بنفسجي',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))',
    colors: ['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.05)'],
  },
  {
    name: 'برتقالي',
    gradient: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(251,146,60,0.05))',
    colors: ['rgba(251,146,60,0.2)', 'rgba(251,146,60,0.05)'],
  },
  {
    name: 'سماوي',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))',
    colors: ['rgba(6,182,212,0.2)', 'rgba(6,182,212,0.05)'],
  },
  {
    name: 'أصفر',
    gradient: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(234,179,8,0.05))',
    colors: ['rgba(234,179,8,0.2)', 'rgba(234,179,8,0.05)'],
  },
  {
    name: 'أحمر',
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
    colors: ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.05)'],
  },
  {
    name: 'رمادي',
    gradient: 'linear-gradient(135deg, rgba(156,163,175,0.2), rgba(156,163,175,0.05))',
    colors: ['rgba(156,163,175,0.2)', 'rgba(156,163,175,0.05)'],
  },
];

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  visible,
  onClose,
  onSave,
  editingTag,
}) => {
  const [tagName, setTagName] = useState(editingTag?.name || '');
  const [selectedColor, setSelectedColor] = useState(
    editingTag?.color || TAG_COLORS[0].gradient
  );

  React.useEffect(() => {
    if (editingTag) {
      setTagName(editingTag.name);
      setSelectedColor(editingTag.color);
    } else {
      setTagName('');
      setSelectedColor(TAG_COLORS[0].gradient);
    }
  }, [editingTag, visible]);

  const handleSave = () => {
    if (!tagName.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال اسم التصنيف');
      return;
    }

    onSave({
      name: tagName.trim(),
      color: selectedColor,
    });
  };

  const colorOption = TAG_COLORS.find(c => c.gradient === selectedColor);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editingTag ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#8FA4C0" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Tag Name Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>اسم التصنيف</Text>
              <TextInput
                style={styles.input}
                value={tagName}
                onChangeText={setTagName}
                placeholder="مثال: مهم، يراجع، حلو"
                placeholderTextColor="#64748B"
                maxLength={60}
              />
            </View>

            {/* Color Selection */}
            <View style={styles.colorSection}>
              <Text style={styles.label}>اختر اللون</Text>
              <View style={styles.colorGrid}>
                {TAG_COLORS.map((color, index) => {
                  const isSelected = color.gradient === selectedColor;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.colorOption}
                      onPress={() => setSelectedColor(color.gradient)}
                    >
                      <LinearGradient
                        colors={color.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.colorGradient,
                          isSelected && styles.colorGradientSelected,
                        ]}
                      >
                        {isSelected && (
                          <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        )}
                      </LinearGradient>
                      <Text style={styles.colorName}>{color.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Preview */}
            <View style={styles.previewSection}>
              <Text style={styles.label}>معاينة</Text>
              <View style={styles.previewCard}>
                <LinearGradient
                  colors={colorOption?.colors || TAG_COLORS[0].colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.previewGradient}
                >
                  <Text style={styles.previewText}>
                    {tagName || 'اسم التصنيف'}
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
            >
              <LinearGradient
                colors={['#D4AF37', '#F4E185']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                <Text style={styles.saveButtonText}>حفظ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(18, 38, 57, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Cairo',
  },
  colorSection: {
    marginBottom: 24,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    alignItems: 'center',
    width: '30%',
  },
  colorGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorGradientSelected: {
    borderColor: '#D4AF37',
    borderWidth: 3,
  },
  colorName: {
    fontSize: 12,
    color: '#8FA4C0',
    marginTop: 8,
  },
  previewSection: {
    marginBottom: 24,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewGradient: {
    padding: 20,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(143, 164, 192, 0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8FA4C0',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B365D',
  },
});

