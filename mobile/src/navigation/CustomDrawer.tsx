import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAuth } from '../auth/useAuth';
import { useThemeColors } from '../shared/hooks/useThemeColors';
import { useActiveApartment } from '../shared/hooks/useActiveApartment';
import { UserAvatar } from '../shared/components/UserAvatar';
import type { ColorTokens } from '../theme/themes';
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
  // Any resident can view active SOS alerts — only SUAdmin/SUSecurity can act on them
  // (enforced in SosAlertListScreen), so this is a read-only entry for residents.
  { name: 'SosAlerts',       icon: 'emergency',       label: 'SOS Alerts' },
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

// HQAdmin/HQUser are platform-level roles with no access to individual society-level
// features (residents, billing, visitors, etc.) — their menu is limited to platform management.
const MENU_HQ: MenuItem[] = [
  { name: 'Dashboard',    icon: 'home',                  label: 'Dashboard' },
  { name: 'HqSocieties',  icon: 'location-city',         label: 'Societies' },
  { name: 'HqUsers',      icon: 'admin-panel-settings',  label: 'HQ Users' },
  { name: 'Profile',      icon: 'manage-accounts',       label: 'My Profile' },
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

// Rendered for the whole post-login session (via AppDrawer), so it reacts to the theme
// immediately via useThemeColors() rather than freezing at cold-start's default.
export function CustomDrawer({ navigation, state }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { apartments, activeApartmentId, setSelectedApartment } = useActiveApartment();

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
        <UserAvatar name={user?.fullName ?? 'User'} pictureUrl={user && 'profilePictureUrl' in user ? user.profilePictureUrl : undefined} size={44} zoom={false} />
        <View style={styles.userMeta}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.fullName ?? 'User'}
          </Text>
          <Text style={styles.userRole}>{getRoleLabel(user?.role)}</Text>
        </View>
      </View>

      {/* Apartment selector — users linked to several apartments pick the active one here;
          menus and apartment-scoped features follow the role held on that apartment. */}
      {apartments.length > 1 && (
        <View style={styles.apartmentSelector}>
          <Text style={styles.apartmentSelectorLabel}>Apartment</Text>
          {apartments.map((apt) => {
            const isSelected = apt.apartmentId === activeApartmentId;
            return (
              <TouchableOpacity
                key={apt.apartmentId}
                style={[styles.apartmentOption, isSelected && styles.apartmentOptionSelected]}
                onPress={() => setSelectedApartment(apt.apartmentId)}
                accessibilityLabel={`Select apartment ${apt.name}`}
              >
                <MaterialIcons
                  name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={16}
                  color={isSelected ? colors.primaryLight : colors.text.secondary}
                />
                <Text style={[styles.apartmentOptionText, isSelected && styles.apartmentOptionTextSelected]} numberOfLines={1}>
                  {apt.name} ({apt.residentType})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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

function getStyles(colors: ColorTokens) {
  return StyleSheet.create({
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
    userMeta: { flex: 1 },
    apartmentSelector: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    apartmentSelectorLabel: {
      fontSize: typography.fontSize.xs,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    apartmentOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    apartmentOptionSelected: { backgroundColor: colors.activeTabBg },
    apartmentOptionText: {
      flex: 1,
      fontSize: typography.fontSize.sm,
      color: colors.text.secondary,
    },
    apartmentOptionTextSelected: { color: colors.primaryLight, fontWeight: '500' },
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
}
