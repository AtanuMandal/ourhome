import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useFinancialSocietySummary } from './hooks/useFinancialReport';
import { AppHeader } from '../../shared/components/AppHeader';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { ExpenseCategoryDto } from '../../api/endpoints/financial-report';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function FinancialReportScreen() {
  const societyId = useSocietyId();
  const { data: summary, isLoading, refetch } = useFinancialSocietySummary(societyId);

  const periodLabel = summary
    ? `${MONTHS[(summary.currentMonth ?? 1) - 1]} ${summary.currentYear}`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Financial Report" showMenu />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {summary != null && (
          <>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Current Month — {periodLabel}</Text>
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
                  <Text style={styles.summaryLabel}>Maintenance Collected</Text>
                  <CurrencyText amount={summary.totalCollectedCurrentMonth} style={styles.summaryValue} />
                  <Text style={styles.summaryMeta}>
                    {summary.collectionPercentageCurrentMonth}% of dues
                  </Text>
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: colors.error }]}>
                  <Text style={styles.summaryLabel}>Vendor Expenses</Text>
                  <CurrencyText amount={summary.vendorExpensesCurrentMonth} style={styles.summaryValue} />
                </View>
                <View
                  style={[
                    styles.summaryCard,
                    {
                      borderLeftColor:
                        summary.netCurrentMonth >= 0 ? colors.success : colors.error,
                    },
                  ]}
                >
                  <Text style={styles.summaryLabel}>Net Position</Text>
                  <CurrencyText amount={summary.netCurrentMonth} style={styles.summaryValue} />
                </View>
              </View>
            </View>

            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>Year-to-Date</Text>
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { borderLeftColor: colors.success }]}>
                  <Text style={styles.summaryLabel}>Total Collected</Text>
                  <CurrencyText amount={summary.totalCollectedYtd} style={styles.summaryValue} />
                </View>
                <View style={[styles.summaryCard, { borderLeftColor: colors.error }]}>
                  <Text style={styles.summaryLabel}>Total Expenses</Text>
                  <CurrencyText amount={summary.totalVendorExpensesYtd} style={styles.summaryValue} />
                </View>
                <View
                  style={[
                    styles.summaryCard,
                    { borderLeftColor: summary.netYtd >= 0 ? colors.success : colors.error },
                  ]}
                >
                  <Text style={styles.summaryLabel}>Net YTD</Text>
                  <CurrencyText amount={summary.netYtd} style={styles.summaryValue} />
                </View>
              </View>
            </View>

            {summary.expenseBreakdownYtd.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Expense Breakdown (YTD)</Text>
                {(summary.expenseBreakdownYtd as ExpenseCategoryDto[]).map((item) => (
                  <View key={item.category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownCategory}>{item.category}</Text>
                    <View style={styles.breakdownRight}>
                      <CurrencyText amount={item.amount} style={styles.breakdownAmount} />
                      <Text style={styles.breakdownPct}>{item.percentageOfTotal}%</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  summaryMeta: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  breakdownSection: { padding: spacing.md },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownCategory: { fontSize: typography.fontSize.base, color: colors.text.primary, flex: 1 },
  breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  breakdownAmount: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.medium },
  breakdownPct: { fontSize: typography.fontSize.sm, color: colors.text.disabled, minWidth: 45, textAlign: 'right' },
});
