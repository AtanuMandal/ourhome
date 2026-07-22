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
import { useAuthStore } from '../../store/authStore';
import { useActiveApartment } from '../../shared/hooks/useActiveApartment';
import { useFinancialSocietySummary, useSocietyLedger } from './hooks/useFinancialReport';
import { AppHeader } from '../../shared/components/AppHeader';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { ExpenseCategoryDto, LedgerEntryDto } from '../../api/endpoints/financial-report';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Tab = 'summary' | 'ledger';

export function FinancialReportScreen() {
  const societyId = useSocietyId();
  const role = useAuthStore((s) => s.user?.rl);
  const { activeResidentType } = useActiveApartment();
  const isAdmin = role === 'SUAdmin' || role === 'HQAdmin' || role === 'HQUser';
  // Society summary is aggregate/society-wide reporting — tenants keep their own
  // apartment ledger/statement elsewhere but not this view. Follows the apartment
  // selected in the drawer for users linked to multiple apartments.
  const isTenant = role === 'SUUser' && activeResidentType === 'Tenant';

  const [tab, setTab] = useState<Tab>('summary');
  const { data: summary, isLoading, refetch } = useFinancialSocietySummary(societyId, !isTenant);
  const {
    data: ledger,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
  } = useSocietyLedger(societyId, isAdmin && tab === 'ledger');

  const periodLabel = summary
    ? `${MONTHS[(summary.currentMonth ?? 1) - 1]} ${summary.currentYear}`
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Financial Report" showMenu />

      {isAdmin && (
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'summary' && styles.tabBtnActive]}
            onPress={() => setTab('summary')}
          >
            <Text style={[styles.tabBtnText, tab === 'summary' && styles.tabBtnTextActive]}>Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'ledger' && styles.tabBtnActive]}
            onPress={() => setTab('ledger')}
          >
            <Text style={[styles.tabBtnText, tab === 'ledger' && styles.tabBtnTextActive]}>Society Ledger</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'ledger' && isAdmin ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={ledgerLoading}
              onRefresh={() => void refetchLedger()}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.summarySection}>
            <View style={styles.ledgerHeaderRow}>
              <Text style={styles.sectionTitle}>Overall Society Ledger</Text>
              {ledger != null && (
                <CurrencyText amount={ledger.currentBalance} style={styles.ledgerBalance} />
              )}
            </View>

            {ledger != null && ledger.entries.length === 0 && (
              <Text style={styles.emptyText}>No transactions found for this society.</Text>
            )}

            {ledger?.entries.map((entry: LedgerEntryDto, idx: number) => (
              <View key={`${entry.date}-${idx}`} style={styles.ledgerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerDescription}>{entry.description}</Text>
                  <Text style={styles.ledgerDate}>{new Date(entry.date).toLocaleDateString()}</Text>
                </View>
                <View style={styles.ledgerAmounts}>
                  {entry.debit != null && (
                    <CurrencyText amount={entry.debit} style={styles.ledgerDebit} />
                  )}
                  {entry.credit != null && (
                    <CurrencyText amount={entry.credit} style={styles.ledgerCredit} />
                  )}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {isTenant && (
          <Text style={styles.emptyText}>Society financial summary is not available for tenants.</Text>
        )}

        {!isTenant && summary != null && (
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontSize: typography.fontSize.sm, color: colors.text.secondary, fontWeight: typography.fontWeight.medium },
  tabBtnTextActive: { color: '#fff' },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ledgerBalance: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  emptyText: { fontSize: typography.fontSize.sm, color: colors.text.disabled, textAlign: 'center', marginTop: spacing.lg },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  ledgerDescription: { fontSize: typography.fontSize.sm, color: colors.text.primary },
  ledgerDate: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  ledgerAmounts: { alignItems: 'flex-end' },
  ledgerDebit: { fontSize: typography.fontSize.sm, color: colors.error, fontWeight: typography.fontWeight.medium },
  ledgerCredit: { fontSize: typography.fontSize.sm, color: colors.success, fontWeight: typography.fontWeight.medium },
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
