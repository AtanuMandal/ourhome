import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../auth/useAuth';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type MIName = React.ComponentProps<typeof MaterialIcons>['name'];

interface MenuItem {
  name: string;
  icon: MIName;
  label: string;
}

const MENU_SUADMIN: MenuItem[] = [
  { name: 'Dashboard',       icon: 'home',            label: 'Dashboard' },
  { name: 'Residents',       icon: 'people',          label: 'Users' },
  { name: 'Apartments',      icon: 'domain',          label: 'Apartments' },
  { name: 'Amenities',       icon: 'event-available', label: 'Amenities' },
  { name: 'Complaints',      icon: 'report-problem',  label: 'Complaints' },
  { name: 'Notices',         icon: 'notifications',   label: 'Notices' },
  { name: 'Visitors',        icon: 'badge',           label: 'Visitors' },
  { name: 'Staff',           icon: 'work',            label: 'Staff' },
  { name: 'SosAlerts',       icon: 'emergency',       label: 'SOS Alerts' },
  { name: 'Polls',           icon: 'how-to-vote',     label: 'Polls' },
  { name: 'Maintenance',     icon: 'receipt-long',    label: 'Maintenance' },
  { name: 'FinancialReport', icon: 'bar-chart',       label: 'Financial Reports' },
  { name: 'VendorPayments',  icon: 'payments',        label: 'Vendor Payments' },
  { name: 'Committee',       icon: 'groups',          label: 'Society Committee' },
  { name: 'ContactUs',       icon: 'support-agent',   label: 'Contact Us' },
  { name: 'Profile',         icon: 'manage-accounts', label: 'My Profile' },
];

const MENU_SUUSER: MenuItem[] = [
  { name: 'Dashboard',       icon: 'home',            label: 'Dashboard' },
  { name: 'Visitors',        icon: 'badge',           label: 'Visitors' },
  { name: 'Polls',           icon: 'how-to-vote',     label: 'Polls' },
  { name: 'Notices',         icon: 'notifications',   label: 'Notices' },
  { name: 'Complaints',      icon: 'report-problem',  label: 'Complaints' },
  { name: 'Amenities',       icon: 'event-available', label: 'Amenities' },
  { name: 'Maintenance',     icon: 'receipt-long',    label: 'Maintenance' },
  { name: 'FinancialReport', icon: 'bar-chart',       label: 'My Statement' },
  { name: 'ContactUs',       icon: 'support-agent',   label: 'Contact Us' },
  { name: 'Profile',         icon: 'manage-accounts', label: 'My Profile' },
];

const MENU_SECURITY: MenuItem[] = [
  { name: 'Dashboard',  icon: 'home',            label: 'Dashboard' },
  { name: 'Visitors',   icon: 'badge',           label: 'Visitors' },
  { name: 'Residents',  icon: 'people',          label: 'Residents' },
  { name: 'Staff',      icon: 'work',            label: 'Staff' },
  { name: 'SosAlerts',  icon: 'emergency',       label: 'SOS Alerts' },
  { name: 'Polls',      icon: 'how-to-vote',     label: 'Polls' },
  { name: 'Complaints', icon: 'report-problem',  label: 'Complaints' },
  { name: 'Notices',    icon: 'notifications',   label: 'Notices' },
  { name: 'ContactUs',  icon: 'support-agent',   label: 'Contact Us' },
  { name: 'Profile',    icon: 'manage-accounts', label: 'My Profile' },
];

const MENU_HQ: MenuItem[] = [
  { name: 'Dashboard',       icon: 'home',            label: 'Dashboard' },
  { name: 'Residents',       icon: 'people',          label: 'Residents' },
  { name: 'Apartments',      icon: 'domain',          label: 'Apartments' },
  { name: 'Amenities',       icon: 'event-available', label: 'Amenities' },
  { name: 'Complaints',      icon: 'report-problem',  label: 'Complaints' },
  { name: 'Notices',         icon: 'notifications',   label: 'Notices' },
  { name: 'Visitors',        icon: 'badge',           label: 'Visitors' },
  { name: 'Maintenance',     icon: 'receipt-long',    label: 'Maintenance' },
  { name: 'FinancialReport', icon: 'bar-chart',       label: 'Financial Reports' },
  { name: 'VendorPayments',  icon: 'payments',        label: 'Vendor Payments' },
  { name: 'Committee',       icon: 'groups',          label: 'Society Committee' },
  { name: 'ContactUs',       icon: 'support-agent',   label: 'Contact Us' },
  { name: 'Profile',         icon: 'manage-accounts', label: 'My Profile' },
];

function getMenuItems(role?: string): MenuItem[] {
  switch (role) {
    case 'SUAdmin':    return MENU_SUADMIN;
    case 'SUUser':     return MENU_SUUSER;
    case 'SUSecurity': return MENU_SECURITY;
    default:           return MENU_HQ;
  }
}

function getRoleLabel(role?: string): string {
  switch (role) {
    case 'SUAdmin':    return 'Society Admin';
    case 'SUUser':     return 'Resident';
    case 'SUSecurity': return 'Security';
    case 'HQAdmin':    return 'HQ Admin';
    case 'HQUser':     return 'HQ User';
    default:           return role ?? '';
  }
}

export function CustomDrawer({ navigation, state }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();

  const initials =
    (user?.fullName ?? 'U')
      .split(' ')
      .filter(Boolean)
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const menuItems = getMenuItems(user?.role);
  const activeRoute = state.routeNames[state.index];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Brand */}
      <View style={styles.brand}>
        <Text style={styles.brandName}>OurHome</Text>
      </View>

      {/* User info */}
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userMeta}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'User'}
          </Text>
          <Text style={styles.userRole}>{getRoleLabel(user?.role)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Nav items */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => {
          const isActive = activeRoute === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.menuItem, isActive && styles.menuItemActive]}
              onPress={() => navigation.navigate(item.name)}
              accessibilityLabel={item.label}
            >
              <MaterialIcons
                name={item.icon}
                size={22}
                color={isActive ? colors.primaryLight : colors.text.secondary}
                style={styles.menuIcon}
              />
              <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => void logout()}
          accessibilityLabel="Sign out"
        >
          <MaterialIcons name="logout" size={22} color={colors.text.secondary} style={styles.menuIcon} />
          <Text style={styles.logoutLabel}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  brand: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userMeta: { flex: 1 },
  userName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  userRole: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 8 },
  menu: { flex: 1, paddingVertical: 8, paddingHorizontal: 8 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuItemActive: { backgroundColor: colors.activeTabBg },
  menuIcon: { marginRight: 12 },
  menuLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  menuLabelActive: { color: colors.primaryLight, fontWeight: '500' },
  footer: { paddingHorizontal: 8 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '400',
  },
});
