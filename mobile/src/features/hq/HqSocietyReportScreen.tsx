import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHqSocietyReport } from './hooks/useHq';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { StatusChip } from '../../shared/components/StatusChip';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface HqSocietyReportScreenProps {
  route: { params: { id: string; name?: string } };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function HqSocietyReportScreen({ route }: HqSocietyReportScreenProps) {
  const { id } = route.params;
  const { data: report, isLoading } = useHqSocietyReport(id);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Society Report" showBack />
      <LoadingOverlay visible={isLoading} />
      <ScrollView contentContainerStyle={styles.content}>
        {report && (
          <>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{report.sn}</Text>
                <StatusChip status={report.st} />
              </View>
            </View>

            <View style={styles.grid}>
              <Stat label="Total Apartments" value={report.ta} />
              <Stat label="Occupied" value={report.oa} />
              <Stat label="Vacant" value={report.va} />
              <Stat label="Under Maintenance" value={report.uma} />
              <Stat label="Owners" value={report.oc} />
              <Stat label="Tenants" value={report.tc} />
              <Stat label="Total Residents" value={report.tr} />
            </View>
            <Text style={styles.disclaimer}>This report contains occupancy data only — no financial information.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.text.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  stat: { flexBasis: '31%', backgroundColor: colors.surface, borderRadius: 12, padding: spacing.sm,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 24, fontWeight: typography.fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 4, textAlign: 'center' },
  disclaimer: { fontSize: typography.fontSize.xs, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.md },
});
