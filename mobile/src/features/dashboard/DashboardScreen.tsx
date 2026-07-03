import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useDashboard } from './useDashboard';
import { AppHeader } from '../../shared/components/AppHeader';
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

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, refetch } = useDashboard();

  const greeting = getGreeting();

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
});
