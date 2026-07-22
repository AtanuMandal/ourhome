import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { useStaffAttendanceReport } from './hooks/useStaff';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { StaffAttendanceReportEntry } from '../../api/types';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function StaffAttendanceReportScreen() {
  const societyId = useSocietyId();
  const [fromDate] = useState(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [toDate] = useState(isoDate(new Date()));

  const { data: report, isLoading } = useStaffAttendanceReport(societyId, fromDate, toDate);
  const entries = report?.e ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Attendance Report" showBack />
      <LoadingOverlay visible={isLoading} />
      <Text style={styles.rangeText}>{fromDate} to {toDate}</Text>
      {!isLoading && entries.length === 0 ? (
        <EmptyState icon="📊" title="No attendance records" />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {entries.map((entry: StaffAttendanceReportEntry) => (
            <View key={entry.sid} style={styles.card}>
              <Text style={styles.name}>{entry.sn}</Text>
              <Text style={styles.category}>{entry.cat}</Text>
              <View style={styles.row}>
                <Text style={styles.stat}>Present: {entry.pd}</Text>
                <Text style={styles.stat}>Late: {entry.ld}</Text>
                <Text style={styles.stat}>Absent: {entry.ad}</Text>
                <Text style={styles.stat}>On Leave: {entry.od}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rangeText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, padding: spacing.md, paddingBottom: 0 },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  category: { fontSize: typography.fontSize.sm, color: colors.text.secondary, marginTop: 2, marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { fontSize: typography.fontSize.sm, color: colors.text.primary },
});
