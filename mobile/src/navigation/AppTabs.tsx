import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Admin / HQ stacks
import {
  AdminHomeStack,
  AdminUsersStack,
  AdminApartmentsStack,
  AdminReportsStack,
  AdminMaintenanceStack,
  HQComplaintsStack,
  HQNoticesStack,
  HQBookingsStack,
} from './AdminStack';

// Resident stacks
import {
  ResidentHomeStack,
  ResidentVisitorsStack,
  ResidentNoticesStack,
  ResidentReportsStack,
  ResidentMaintenanceStack,
} from './ResidentStack';

// Security stacks
import {
  SecurityHomeStack,
  SecurityVisitorsStack,
  SecurityResidentsStack,
  SecurityNoticesStack,
  SecurityComplaintsStack,
} from './SecurityStack';

const Tab = createBottomTabNavigator();

type MIName = React.ComponentProps<typeof MaterialIcons>['name'];

const screenOpts = {
  headerShown: false,
  tabBarActiveTintColor: colors.primaryLight,
  tabBarInactiveTintColor: colors.text.secondary,
  tabBarLabelStyle: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500' as const,
  },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 4,
  },
};

function icon(name: MIName) {
  return ({ color, size }: { color: string; size: number }) => (
    <MaterialIcons name={name} size={size} color={color} />
  );
}

// ─── SUAdmin: Home | Users | Apartments | Reports | Maintenance ───────────────
function SUAdminTabs() {
  return (
    <Tab.Navigator screenOptions={screenOpts}>
      <Tab.Screen
        name="HomeTab"
        component={AdminHomeStack}
        options={{ title: 'Home', tabBarIcon: icon('home') }}
      />
      <Tab.Screen
        name="UsersTab"
        component={AdminUsersStack}
        options={{ title: 'Users', tabBarIcon: icon('people') }}
      />
      <Tab.Screen
        name="ApartmentsTab"
        component={AdminApartmentsStack}
        options={{ title: 'Apartments', tabBarIcon: icon('domain') }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={AdminReportsStack}
        options={{ title: 'Reports', tabBarIcon: icon('bar-chart') }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={AdminMaintenanceStack}
        options={{ title: 'Maintenance', tabBarIcon: icon('receipt-long') }}
      />
    </Tab.Navigator>
  );
}

// ─── SUUser: Home | Visitors | Notices | Reports | Maintenance ────────────────
function SUUserTabs() {
  return (
    <Tab.Navigator screenOptions={screenOpts}>
      <Tab.Screen
        name="HomeTab"
        component={ResidentHomeStack}
        options={{ title: 'Home', tabBarIcon: icon('home') }}
      />
      <Tab.Screen
        name="VisitorsTab"
        component={ResidentVisitorsStack}
        options={{ title: 'Visitors', tabBarIcon: icon('badge') }}
      />
      <Tab.Screen
        name="NoticesTab"
        component={ResidentNoticesStack}
        options={{ title: 'Notices', tabBarIcon: icon('notifications') }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ResidentReportsStack}
        options={{ title: 'Reports', tabBarIcon: icon('bar-chart') }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={ResidentMaintenanceStack}
        options={{ title: 'Maintenance', tabBarIcon: icon('receipt-long') }}
      />
    </Tab.Navigator>
  );
}

// ─── SUSecurity: Home | Visitors | Residents | Notices | Complaints ───────────
function SUSecurityTabs() {
  return (
    <Tab.Navigator screenOptions={screenOpts}>
      <Tab.Screen
        name="HomeTab"
        component={SecurityHomeStack}
        options={{ title: 'Home', tabBarIcon: icon('home') }}
      />
      <Tab.Screen
        name="VisitorsTab"
        component={SecurityVisitorsStack}
        options={{ title: 'Visitors', tabBarIcon: icon('badge') }}
      />
      <Tab.Screen
        name="ResidentsTab"
        component={SecurityResidentsStack}
        options={{ title: 'Residents', tabBarIcon: icon('people') }}
      />
      <Tab.Screen
        name="NoticesTab"
        component={SecurityNoticesStack}
        options={{ title: 'Notices', tabBarIcon: icon('notifications') }}
      />
      <Tab.Screen
        name="ComplaintsTab"
        component={SecurityComplaintsStack}
        options={{ title: 'Complaints', tabBarIcon: icon('report-problem') }}
      />
    </Tab.Navigator>
  );
}

// ─── HQAdmin / HQUser: Home | Complaints | Notices | Bookings | Maintenance ──
function HQTabs() {
  return (
    <Tab.Navigator screenOptions={screenOpts}>
      <Tab.Screen
        name="HomeTab"
        component={AdminHomeStack}
        options={{ title: 'Home', tabBarIcon: icon('home') }}
      />
      <Tab.Screen
        name="ComplaintsTab"
        component={HQComplaintsStack}
        options={{ title: 'Complaints', tabBarIcon: icon('report-problem') }}
      />
      <Tab.Screen
        name="NoticesTab"
        component={HQNoticesStack}
        options={{ title: 'Notices', tabBarIcon: icon('notifications') }}
      />
      <Tab.Screen
        name="BookingsTab"
        component={HQBookingsStack}
        options={{ title: 'Bookings', tabBarIcon: icon('event-available') }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={AdminMaintenanceStack}
        options={{ title: 'Maintenance', tabBarIcon: icon('receipt-long') }}
      />
    </Tab.Navigator>
  );
}

export function AppTabs() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'SUAdmin') return <SUAdminTabs />;
  if (role === 'SUUser') return <SUUserTabs />;
  if (role === 'SUSecurity') return <SUSecurityTabs />;
  return <HQTabs />;  // HQAdmin, HQUser, and any unrecognised role
}
