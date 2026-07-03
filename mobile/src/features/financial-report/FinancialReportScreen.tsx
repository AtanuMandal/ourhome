import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useFinancialSummary, useIncomeBreakdown } from './hooks/useFinancialReport';
import type { IncomeBreakdown } from '../../api/endpoints/financial-report';
import { AppHeader } from '../../shared/components/AppHeader';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

export function FinancialReportScreen() {
  const societyId = useSocietyId();
  const [year, setYear] = useState(CURRENT_YEAR);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } =
    useFinancialSummary(societyId, year);
  const { data: breakdown, isLoading: breakdownLoading, refetch: refetchBreakdown } =
    useIncomeBreakdown(societyId, year);

  const isLoading = summaryLoading || breakdownLoading;

  function handleRefresh(): void {
    void refetchSummary();
    void refetchBreakdown();
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Financial Report" showMenu />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.yearSelector}>
          {YEAR_OPTIONS.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.yearChip, year === y && styles.yearChipActive]}
              onPress={() => setYear(y)}
            >
              <Text
                style={[styles.yearText, year === y && styles.yearTextActive]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {summary != null && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Summary — {year}</Text>
            <View style={styles.summaryCards}>
              <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
                <Text style={styles.summaryLabel}>Total Income</Text>
                <CurrencyText amount={summary.totalIncome} style={styles.summaryValue} />
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: colors.error }]}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <CurrencyText amount={summary.totalExpenses} style={styles.summaryValue} />
              </View>
              <View
                style={[
                  styles.summaryCard,
                  {
                    borderLeftColor:
                      summary.netBalance >= 0 ? colors.success : colors.error,
                  },
                ]}
              >
                <Text style={styles.summaryLabel}>Net Balance</Text>
                <CurrencyText amount={summary.netBalance} style={styles.summaryValue} />
              </View>
            </View>
          </View>
        )}

        {breakdown != null && breakdown.length > 0 && (
          <View style={styles.breakdownSection}>
            <Text style={styles.sectionTitle}>Income Breakdown</Text>
            {(breakdown as IncomeBreakdown[]).map((item) => (
              <View key={item.category} style={styles.breakdownRow}>
                <Text style={styles.breakdownCategory}>{item.category}</Text>
                <View style={styles.breakdownRight}>
                  <CurrencyText amount={item.amount} style={styles.breakdownAmount} />
                  <Text style={styles.breakdownPct}>{item.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  yearSelector: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  yearChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  yearChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  yearText: { color: colors.text.secondary, fontSize: typography.fontSize.sm },
  yearTextActive: { color: '#FFF', fontWeight: typography.fontWeight.medium },
  summarySection: { padding: spacing.md },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  summaryCards: { gap: spacing.sm },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  summaryLabel: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  summaryValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginTop: 4,
  },
  breakdownSection: { padding: spacing.md },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownCategory: { fontSize: typography.fontSize.base, color: colors.text.primary },
  breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  breakdownAmount: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
  breakdownPct: { fontSize: typography.fontSize.sm, color: colors.text.disabled, minWidth: 50, textAlign: 'right' },
});
