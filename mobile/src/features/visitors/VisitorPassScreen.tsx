import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useVisitor, useCheckOutVisitor } from './hooks/useVisitors';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';

interface VisitorPassScreenProps {
  route: { params: { id: string } };
}

export function VisitorPassScreen({ route }: VisitorPassScreenProps) {
  const societyId = useSocietyId();
  const { id } = route.params;
  const { data: visitor, isLoading } = useVisitor(societyId, id);
  const role = useAuthStore((s) => s.user?.role ?? '');
  const canManageVisitors = role === 'SUAdmin' || role === 'SUSecurity';
  const { mutateAsync: checkOut, isPending: isCheckingOut } = useCheckOutVisitor(societyId);

  async function handleCheckOut(): Promise<void> {
    try {
      await checkOut(id);
    } catch (e) {
      Alert.alert('Could not check out the visitor', normalizeError(e));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Visitor Pass" showBack />
      <LoadingOverlay visible={isLoading || isCheckingOut} />
      {visitor != null && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.passCard}>
            <Text style={styles.passLabel}>VISITOR PASS</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrText}>QR</Text>
              <Text style={styles.qrId}>{visitor.id.slice(0, 8)}</Text>
            </View>
            <Text style={styles.visitorName}>{visitor.visitorName}</Text>
            <Text style={styles.meta}>Phone: {visitor.visitorPhone}</Text>
            <Text style={styles.meta}>Purpose: {visitor.purpose}</Text>
            <Text style={styles.meta}>
              Host: {visitor.hostResidentName} · {visitor.hostBlockName} {visitor.hostFloorNumber}-{visitor.hostFlatNumber}
            </Text>

            <View style={styles.statusRow}>
              <StatusChip status={visitor.status} />
            </View>

            {visitor.checkInTime != null && (
              <Text style={styles.time}>
                Check-in: {formatDateTime(visitor.checkInTime)}
              </Text>
            )}
            {visitor.checkOutTime != null && (
              <Text style={styles.time}>
                Check-out: {formatDateTime(visitor.checkOutTime)}
              </Text>
            )}

            {canManageVisitors && visitor.status === 'CheckedIn' && (
              <TouchableOpacity
                style={styles.checkOutBtn}
                onPress={() => void handleCheckOut()}
                disabled={isCheckingOut}
                accessibilityLabel="Check out visitor"
              >
                <Text style={styles.checkOutBtnText}>Check Out Visitor</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  passCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  passLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrText: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.disabled,
  },
  qrId: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  visitorName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statusRow: { marginVertical: spacing.sm },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    marginTop: 4,
  },
  checkOutBtn: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  checkOutBtnText: {
    color: '#FFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
