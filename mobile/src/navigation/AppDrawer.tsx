import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomDrawer } from './CustomDrawer';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ResidentListScreen } from '../features/residents/ResidentListScreen';
import { ApartmentListScreen } from '../features/apartments/ApartmentListScreen';
import { VisitorListScreen } from '../features/visitors/VisitorListScreen';
import { VisitorRegisterScreen } from '../features/visitors/VisitorRegisterScreen';
import { VisitorPassScreen } from '../features/visitors/VisitorPassScreen';
import { NoticeListScreen } from '../features/notices/NoticeListScreen';
import { NoticeDetailScreen } from '../features/notices/NoticeDetailScreen';
import { ComplaintListScreen } from '../features/complaints/ComplaintListScreen';
import { ComplaintCreateScreen } from '../features/complaints/ComplaintCreateScreen';
import { MaintenanceScreen } from '../features/maintenance/MaintenanceScreen';
import { FinancialReportScreen } from '../features/financial-report/FinancialReportScreen';
import { VendorPaymentListScreen } from '../features/vendor-payments/VendorPaymentListScreen';
import { AmenityListScreen } from '../features/amenities/AmenityListScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator();
const noHeader = { headerShown: false } as const;

// ── Mini-stacks for sections with detail screens ──────────────────────────────

type VisitorsParams = {
  VisitorList: undefined;
  VisitorRegister: undefined;
  VisitorDetail: { id: string };
};
const VS = createNativeStackNavigator<VisitorsParams>();
function VisitorsStack() {
  return (
    <VS.Navigator screenOptions={noHeader}>
      <VS.Screen name="VisitorList"     component={VisitorListScreen} />
      <VS.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <VS.Screen name="VisitorDetail"   component={VisitorPassScreen} />
    </VS.Navigator>
  );
}

type NoticesParams = {
  NoticeList: undefined;
  NoticeDetail: { id: string };
};
const NS = createNativeStackNavigator<NoticesParams>();
function NoticesStack() {
  return (
    <NS.Navigator screenOptions={noHeader}>
      <NS.Screen name="NoticeList"   component={NoticeListScreen} />
      <NS.Screen name="NoticeDetail" component={NoticeDetailScreen} />
    </NS.Navigator>
  );
}

type ComplaintsParams = {
  ComplaintList: undefined;
  ComplaintCreate: undefined;
};
const CS = createNativeStackNavigator<ComplaintsParams>();
function ComplaintsStack() {
  return (
    <CS.Navigator screenOptions={noHeader}>
      <CS.Screen name="ComplaintList"   component={ComplaintListScreen} />
      <CS.Screen name="ComplaintCreate" component={ComplaintCreateScreen} />
    </CS.Navigator>
  );
}

// ── Main Drawer Navigator ─────────────────────────────────────────────────────

function renderDrawer(props: DrawerContentComponentProps) {
  return <CustomDrawer {...props} />;
}

export function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={renderDrawer}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { backgroundColor: colors.surface, width: 280 },
        overlayColor: 'rgba(0,0,0,0.4)',
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name="Dashboard"       component={DashboardScreen} />
      <Drawer.Screen name="Residents"       component={ResidentListScreen} />
      <Drawer.Screen name="Apartments"      component={ApartmentListScreen} />
      <Drawer.Screen name="Visitors"        component={VisitorsStack} />
      <Drawer.Screen name="Notices"         component={NoticesStack} />
      <Drawer.Screen name="Complaints"      component={ComplaintsStack} />
      <Drawer.Screen name="Maintenance"     component={MaintenanceScreen} />
      <Drawer.Screen name="FinancialReport" component={FinancialReportScreen} />
      <Drawer.Screen name="VendorPayments"  component={VendorPaymentListScreen} />
      <Drawer.Screen name="Amenities"       component={AmenityListScreen} />
      <Drawer.Screen name="Profile"         component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
