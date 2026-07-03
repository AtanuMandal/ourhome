import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { AdminStack } from './AdminStack';
import { ResidentStack } from './ResidentStack';
import { SecurityStack } from './SecurityStack';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const Tab = createBottomTabNavigator();

function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  );
}

function SUAdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: typography.fontSize.xs },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={AdminStack}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="ResidentsTab"
        component={AdminStack}
        options={{ title: 'Residents', tabBarIcon: tabIcon('👥') }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={AdminStack}
        options={{ title: 'Maintenance', tabBarIcon: tabIcon('💰') }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={AdminStack}
        options={{ title: 'Reports', tabBarIcon: tabIcon('📊') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'More', tabBarIcon: tabIcon('☰') }}
      />
    </Tab.Navigator>
  );
}

function SUUserTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: typography.fontSize.xs },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={ResidentStack}
        options={{ title: 'Home', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="VisitorsTab"
        component={ResidentStack}
        options={{ title: 'Visitors', tabBarIcon: tabIcon('🚪') }}
      />
      <Tab.Screen
        name="MaintenanceTab"
        component={ResidentStack}
        options={{ title: 'Maintenance', tabBarIcon: tabIcon('💰') }}
      />
      <Tab.Screen
        name="StatementTab"
        component={ResidentStack}
        options={{ title: 'Statement', tabBarIcon: tabIcon('📋') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'More', tabBarIcon: tabIcon('☰') }}
      />
    </Tab.Navigator>
  );
}

function SUSecurityTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarLabelStyle: { fontSize: typography.fontSize.xs },
      }}
    >
      <Tab.Screen
        name="GateTab"
        component={SecurityStack}
        options={{ title: 'Gate', tabBarIcon: tabIcon('🔒') }}
      />
      <Tab.Screen
        name="VisitorsTab"
        component={SecurityStack}
        options={{ title: 'Visitors', tabBarIcon: tabIcon('🚪') }}
      />
      <Tab.Screen
        name="ResidentsTab"
        component={SecurityStack}
        options={{ title: 'Residents', tabBarIcon: tabIcon('👥') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'More', tabBarIcon: tabIcon('☰') }}
      />
    </Tab.Navigator>
  );
}

function DefaultTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={AdminStack}
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'More', tabBarIcon: tabIcon('☰') }}
      />
    </Tab.Navigator>
  );
}

export function AppTabs() {
  const role = useAuthStore((s) => s.user?.role);

  if (role === 'SUAdmin' || role === 'HQAdmin' || role === 'HQUser') {
    return <SUAdminTabs />;
  }
  if (role === 'SUUser') {
    return <SUUserTabs />;
  }
  if (role === 'SUSecurity') {
    return <SUSecurityTabs />;
  }
  return <DefaultTabs />;
}
