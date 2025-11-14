import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ActiveAttempt {
  id: number;
  assessment_name: string;
  started_at: string;
}

interface ActiveAssessmentModalProps {
  visible: boolean;
  activeAttempt: ActiveAttempt | null;
  onResume: () => void;
  onCancel: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function ActiveAssessmentModal({
  visible,
  activeAttempt,
  onResume,
  onCancel,
  onClose,
  loading = false,
}: ActiveAssessmentModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <View style={styles.warningIcon}>
              <MaterialIcons name="warning" size={48} color="#F59E0B" />
            </View>
          </View>

          <Text style={styles.title}>لديك اختبار نشط</Text>
          
          {activeAttempt && (
            <Text style={styles.message}>
              لديك محاولة نشطة في "{activeAttempt.assessment_name}".{'\n'}
              يجب إكمالها أو إلغاؤها قبل بدء اختبار جديد.
            </Text>
          )}

          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              لا يمكن إجراء أكثر من اختبار واحد في نفس الوقت
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <Text style={styles.loadingText}>جاري المعالجة...</Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.resumeButton]}
                onPress={onResume}
                activeOpacity={0.8}
              >
                <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>استئناف الاختبار</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <MaterialIcons name="cancel" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>إلغاء المحاولة</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>رجوع</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1B365D',
    borderRadius: 24,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#3B82F620',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  infoText: {
    flex: 1,
    color: '#3B82F6',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resumeButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 12,
  },
});

