import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { VisitorListScreen } from '../features/visitors/VisitorListScreen';
import { VisitorRegisterScreen } from '../features/visitors/VisitorRegisterScreen';
import { VisitorPassScreen } from '../features/visitors/VisitorPassScreen';
import { MaintenanceScreen } from '../features/maintenance/MaintenanceScreen';
import { NoticeListScreen } from '../features/notices/NoticeListScreen';
import { NoticeDetailScreen } from '../features/notices/NoticeDetailScreen';
import { ComplaintListScreen } from '../features/complaints/ComplaintListScreen';
import { ComplaintCreateScreen } from '../features/complaints/ComplaintCreateScreen';
import { AmenityListScreen } from '../features/amenities/AmenityListScreen';
import { FinancialReportScreen } from '../features/financial-report/FinancialReportScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';

const opts = { headerShown: false };

// ── Tab 1: Home ───────────────────────────────────────────────────────────────
type HomeParams = {
  Home: undefined;
  Amenities: undefined;
  Complaints: undefined;
  ComplaintCreate: undefined;
  Profile: undefined;
};
const SHome = createNativeStackNavigator<HomeParams>();
export function ResidentHomeStack() {
  return (
    <SHome.Navigator screenOptions={opts}>
      <SHome.Screen name="Home" component={DashboardScreen} />
      <SHome.Screen name="Amenities" component={AmenityListScreen} />
      <SHome.Screen name="Complaints" component={ComplaintListScreen} />
      <SHome.Screen name="ComplaintCreate" component={ComplaintCreateScreen} />
      <SHome.Screen name="Profile" component={ProfileScreen} />
    </SHome.Navigator>
  );
}

// ── Tab 2: Visitors ───────────────────────────────────────────────────────────
type VisitorsParams = {
  Visitors: undefined;
  VisitorRegister: undefined;
  VisitorPass: { id: string };
  Profile: undefined;
};
const SVisitors = createNativeStackNavigator<VisitorsParams>();
export function ResidentVisitorsStack() {
  return (
    <SVisitors.Navigator screenOptions={opts}>
      <SVisitors.Screen name="Visitors" component={VisitorListScreen} />
      <SVisitors.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <SVisitors.Screen name="VisitorPass" component={VisitorPassScreen} />
      <SVisitors.Screen name="Profile" component={ProfileScreen} />
    </SVisitors.Navigator>
  );
}

// ── Tab 3: Notices ────────────────────────────────────────────────────────────
type NoticesParams = { Notices: undefined; NoticeDetail: { id: string }; Profile: undefined };
const SNotices = createNativeStackNavigator<NoticesParams>();
export function ResidentNoticesStack() {
  return (
    <SNotices.Navigator screenOptions={opts}>
      <SNotices.Screen name="Notices" component={NoticeListScreen} />
      <SNotices.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <SNotices.Screen name="Profile" component={ProfileScreen} />
    </SNotices.Navigator>
  );
}

// ── Tab 4: Reports (personal statement) ──────────────────────────────────────
type ReportsParams = { MyStatement: undefined; Profile: undefined };
const SReports = createNativeStackNavigator<ReportsParams>();
export function ResidentReportsStack() {
  return (
    <SReports.Navigator screenOptions={opts}>
      <SReports.Screen name="MyStatement" component={FinancialReportScreen} />
      <SReports.Screen name="Profile" component={ProfileScreen} />
    </SReports.Navigator>
  );
}

// ── Tab 5: Maintenance ────────────────────────────────────────────────────────
type MaintParams = { Maintenance: undefined; Profile: undefined };
const SMaint = createNativeStackNavigator<MaintParams>();
export function ResidentMaintenanceStack() {
  return (
    <SMaint.Navigator screenOptions={opts}>
      <SMaint.Screen name="Maintenance" component={MaintenanceScreen} />
      <SMaint.Screen name="Profile" component={ProfileScreen} />
    </SMaint.Navigator>
  );
}
