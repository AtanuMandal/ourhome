import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { useSosAlertReport } from './hooks/useSos';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { SosCategoryBreakdown } from '../../api/types';

const CATEGORY_LABELS: Record<string, string> = {
  Fire: 'Fire',
  Medical: 'Medical',
  SecurityIntrusion: 'Security / Intrusion',
  Other: 'Other',
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function SosAlertReportScreen() {
  const societyId = useSocietyId();
  const [fromDate] = useState(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [toDate] = useState(isoDate(new Date()));

  const { data: report, isLoading } = useSosAlertReport(societyId, fromDate, toDate);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="SOS Alert Report" showBack />
      <LoadingOverlay visible={isLoading} />
      <Text style={styles.rangeText}>{fromDate} to {toDate}</Text>
      {!isLoading && !report ? (
        <EmptyState icon="📊" title="No SOS alerts for this range" />
      ) : (
        report && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.summaryGrid}>
              <SummaryCard label="Total Alerts" value={String(report.ta)} />
              <SummaryCard label="False Alarm Rate" value={`${report.fr}%`} />
              <SummaryCard
                label="Avg. Time to Acknowledge"
                value={report.aa != null ? `${Math.round(report.aa)}s` : '—'}
              />
              <SummaryCard
                label="Avg. Time to Resolve"
                value={report.ar != null ? `${Math.round(report.ar)}s` : '—'}
              />
            </View>

            <Text style={styles.sectionTitle}>By Category</Text>
            {report.bc.map((c: SosCategoryBreakdown) => (
              <View key={c.cat} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{CATEGORY_LABELS[c.cat] ?? c.cat}</Text>
                <Text style={styles.categoryCount}>{c.ct}</Text>
              </View>
            ))}
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  rangeText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, padding: spacing.md, paddingBottom: 0 },
  content: { padding: spacing.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: { flexBasis: '47%', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md },
  summaryValue: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  summaryLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryName: { fontSize: typography.fontSize.sm, color: colors.text.primary },
  categoryCount: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
});
