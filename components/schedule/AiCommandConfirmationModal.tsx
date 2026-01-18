import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/contexts/LanguageContext';

interface AiCommandConfirmationModalProps {
  visible: boolean;
  commandId: number;
  commandType: string;
  commandDescription: string;
  onConfirm: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function AiCommandConfirmationModal({
  visible,
  commandId,
  commandType,
  commandDescription,
  onConfirm,
  onReject,
  loading = false,
}: AiCommandConfirmationModalProps) {
  const { isRTL, flexDirection, textAlign } = useLanguage();

  const getCommandTitle = (type: string) => {
    switch (type) {
      case 'CHANGE_EXAM_DATE':
        return 'تغيير موعد الاختبار';
      case 'REGENERATE_SCHEDULE':
        return 'إعادة توليد الجدول';
      case 'RESCHEDULE_MULTIPLE_ITEMS':
        return 'إعادة جدولة عدة دروس';
      default:
        return 'تعديل على الجدول';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { flexDirection }]}>
          <View style={[styles.header, { flexDirection }]}>
            <MaterialIcons name="info-outline" size={24} color="#D4AF37" />
            <Text style={[styles.headerTitle, { textAlign }]}>
              {getCommandTitle(commandType)}
            </Text>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.description, { textAlign }]}>
              {commandDescription}
            </Text>
            <Text style={[styles.warning, { textAlign }]}>
              ⚠️ هذا التعديل يتطلب موافقتك
            </Text>
          </ScrollView>

          <View style={[styles.actions, { flexDirection }]}>
            <TouchableOpacity
              onPress={onReject}
              disabled={loading}
              style={[styles.rejectButton, { flex: 1 }]}
            >
              <Text style={styles.rejectText}>رفض</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              disabled={loading}
              style={[styles.confirmButton, { flex: 1 }]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmText}>موافق</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1B365D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  content: {
    maxHeight: 200,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 12,
  },
  warning: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rejectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

