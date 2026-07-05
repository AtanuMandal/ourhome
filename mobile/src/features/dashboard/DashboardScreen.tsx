import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuthStore } from '../../store/authStore';
import { useDashboard } from './useDashboard';
import { AppHeader } from '../../shared/components/AppHeader';
import { CurrencyText } from '../../shared/components/CurrencyText';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface SummaryCardProps {
  title: string;
  value: number;
  accent: string;
}

function SummaryCard({ title, value, accent }: SummaryCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

interface QuickAction {
  icon: string;
  label: string;
  screen: string;
}

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  SUAdmin: [
    { icon: '👥', label: 'Residents', screen: 'Residents' },
    { icon: '🏢', label: 'Apartments', screen: 'Apartments' },
    { icon: '📝', label: 'Complaints', screen: 'Complaints' },
    { icon: '🚪', label: 'Visitors', screen: 'Visitors' },
    { icon: '📢', label: 'Notices', screen: 'Notices' },
    { icon: '💰', label: 'Payments', screen: 'VendorPayments' },
  ],
  SUSecurity: [
    { icon: '🚪', label: 'Visitors', screen: 'Visitors' },
    { icon: '👥', label: 'Residents', screen: 'Residents' },
    { icon: '📝', label: 'Complaint', screen: 'Complaints' },
    { icon: '📢', label: 'Notices', screen: 'Notices' },
    { icon: '🏊', label: 'Amenities', screen: 'Amenities' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
  ],
  SUUser: [
    { icon: '🏢', label: 'My Apt', screen: 'Apartments' },
    { icon: '📝', label: 'Complaint', screen: 'Complaints' },
    { icon: '📢', label: 'Notices', screen: 'Notices' },
    { icon: '🏊', label: 'Amenities', screen: 'Amenities' },
    { icon: '🚪', label: 'Visitors', screen: 'Visitors' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
  ],
  HQAdmin: [
    { icon: '👥', label: 'Residents', screen: 'Residents' },
    { icon: '🏢', label: 'Apartments', screen: 'Apartments' },
    { icon: '📝', label: 'Complaints', screen: 'Complaints' },
    { icon: '🚪', label: 'Visitors', screen: 'Visitors' },
    { icon: '💰', label: 'Payments', screen: 'VendorPayments' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
  ],
  HQUser: [
    { icon: '📝', label: 'Complaints', screen: 'Complaints' },
    { icon: '🏊', label: 'Book', screen: 'Amenities' },
    { icon: '🚪', label: 'Visitors', screen: 'Visitors' },
    { icon: '📢', label: 'Notices', screen: 'Notices' },
    { icon: '🏢', label: 'Apartments', screen: 'Apartments' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
  ],
};

function QuickActionGrid({ role }: { role: string }) {
  const navigation = useNavigation<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
  const actions = QUICK_ACTIONS[role] ?? QUICK_ACTIONS['SUUser'];

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.screen}
          style={styles.tile}
          onPress={() => navigation.navigate(action.screen)}
        >
          <Text style={styles.tileIcon}>{action.icon}</Text>
          <Text style={styles.tileLabel}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, refetch } = useDashboard();

  const greeting = getGreeting();
  const isAdmin = user?.role === 'SUAdmin' || user?.role === 'HQAdmin';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Dashboard" showMenu />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{user?.fullName ?? 'User'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.cards}>
          <SummaryCard
            title="Visitors Today"
            value={data?.visitorsToday ?? 0}
            accent={colors.primary}
          />
          <SummaryCard
            title="Unread Notices"
            value={data?.unreadNotices ?? 0}
            accent={colors.warning}
          />
          <SummaryCard
            title="Pending Complaints"
            value={data?.pendingComplaints ?? 0}
            accent={colors.error}
          />
        </View>

        {isAdmin && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Financial Outlook</Text>
            <View style={styles.financeCards}>
              <View style={[styles.financeCard, { borderLeftColor: colors.success }]}>
                <Text style={styles.financeCardLabel}>Upcoming Cash Inflow (7d)</Text>
                <CurrencyText amount={data?.upcomingCashInflow ?? 0} style={styles.financeCardValue} />
                <Text style={styles.financeCardMeta}>{data?.upcomingCharges.length ?? 0} charge(s) due</Text>
              </View>
              <View style={[styles.financeCard, { borderLeftColor: colors.error }]}>
                <Text style={styles.financeCardLabel}>Upcoming Cash Outflow (7d)</Text>
                <CurrencyText amount={data?.upcomingCashOutflow ?? 0} style={styles.financeCardValue} />
              </View>
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>Quick Actions</Text>
        <QuickActionGrid role={user?.role ?? 'SUUser'} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  header: { marginBottom: spacing.lg },
  greeting: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  name: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  cards: { gap: spacing.sm },
  financeCards: { flexDirection: 'row', gap: spacing.sm },
  financeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  financeCardLabel: { fontSize: typography.fontSize.xs, color: colors.text.secondary },
  financeCardValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginTop: 4,
  },
  financeCardMeta: { fontSize: typography.fontSize.xs, color: colors.text.disabled, marginTop: 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tileIcon: { fontSize: 28, marginBottom: spacing.xs },
  tileLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
