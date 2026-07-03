import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ApartmentListScreen } from '../features/apartments/ApartmentListScreen';
import { ResidentListScreen } from '../features/residents/ResidentListScreen';
import { MaintenanceScreen } from '../features/maintenance/MaintenanceScreen';
import { FinancialReportScreen } from '../features/financial-report/FinancialReportScreen';
import { VendorPaymentListScreen } from '../features/vendor-payments/VendorPaymentListScreen';
import { NoticeListScreen } from '../features/notices/NoticeListScreen';
import { NoticeDetailScreen } from '../features/notices/NoticeDetailScreen';
import { ComplaintListScreen } from '../features/complaints/ComplaintListScreen';
import { AmenityListScreen } from '../features/amenities/AmenityListScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';

const opts = { headerShown: false };

// ── Tab 1: Home ───────────────────────────────────────────────────────────────
type HomeParams = {
  Dashboard: undefined;
  Notices: undefined;
  NoticeDetail: { id: string };
  Complaints: undefined;
  Profile: undefined;
};
const SHome = createNativeStackNavigator<HomeParams>();
export function AdminHomeStack() {
  return (
    <SHome.Navigator screenOptions={opts}>
      <SHome.Screen name="Dashboard" component={DashboardScreen} />
      <SHome.Screen name="Notices" component={NoticeListScreen} />
      <SHome.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <SHome.Screen name="Complaints" component={ComplaintListScreen} />
      <SHome.Screen name="Profile" component={ProfileScreen} />
    </SHome.Navigator>
  );
}

// ── Tab 2: Users ──────────────────────────────────────────────────────────────
type UsersParams = { Residents: undefined; Profile: undefined };
const SUsers = createNativeStackNavigator<UsersParams>();
export function AdminUsersStack() {
  return (
    <SUsers.Navigator screenOptions={opts}>
      <SUsers.Screen name="Residents" component={ResidentListScreen} />
      <SUsers.Screen name="Profile" component={ProfileScreen} />
    </SUsers.Navigator>
  );
}

// ── Tab 3: Apartments ─────────────────────────────────────────────────────────
type AptsParams = { Apartments: undefined; Profile: undefined };
const SApts = createNativeStackNavigator<AptsParams>();
export function AdminApartmentsStack() {
  return (
    <SApts.Navigator screenOptions={opts}>
      <SApts.Screen name="Apartments" component={ApartmentListScreen} />
      <SApts.Screen name="Profile" component={ProfileScreen} />
    </SApts.Navigator>
  );
}

// ── Tab 4: Reports ────────────────────────────────────────────────────────────
type RptParams = { FinancialReport: undefined; VendorPayments: undefined; Profile: undefined };
const SRpt = createNativeStackNavigator<RptParams>();
export function AdminReportsStack() {
  return (
    <SRpt.Navigator screenOptions={opts}>
      <SRpt.Screen name="FinancialReport" component={FinancialReportScreen} />
      <SRpt.Screen name="VendorPayments" component={VendorPaymentListScreen} />
      <SRpt.Screen name="Profile" component={ProfileScreen} />
    </SRpt.Navigator>
  );
}

// ── Tab 5: Maintenance ────────────────────────────────────────────────────────
type MaintParams = { Maintenance: undefined; Profile: undefined };
const SMaint = createNativeStackNavigator<MaintParams>();
export function AdminMaintenanceStack() {
  return (
    <SMaint.Navigator screenOptions={opts}>
      <SMaint.Screen name="Maintenance" component={MaintenanceScreen} />
      <SMaint.Screen name="Profile" component={ProfileScreen} />
    </SMaint.Navigator>
  );
}

// ── HQ Complaints ─────────────────────────────────────────────────────────────
type HQCmpParams = { Complaints: undefined; Profile: undefined };
const SHQCmp = createNativeStackNavigator<HQCmpParams>();
export function HQComplaintsStack() {
  return (
    <SHQCmp.Navigator screenOptions={opts}>
      <SHQCmp.Screen name="Complaints" component={ComplaintListScreen} />
      <SHQCmp.Screen name="Profile" component={ProfileScreen} />
    </SHQCmp.Navigator>
  );
}

// ── HQ Notices ────────────────────────────────────────────────────────────────
type HQNtcParams = { Notices: undefined; NoticeDetail: { id: string }; Profile: undefined };
const SHQNtc = createNativeStackNavigator<HQNtcParams>();
export function HQNoticesStack() {
  return (
    <SHQNtc.Navigator screenOptions={opts}>
      <SHQNtc.Screen name="Notices" component={NoticeListScreen} />
      <SHQNtc.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <SHQNtc.Screen name="Profile" component={ProfileScreen} />
    </SHQNtc.Navigator>
  );
}

// ── HQ Bookings/Amenities ─────────────────────────────────────────────────────
type HQBkgParams = { Amenities: undefined; Profile: undefined };
const SHQBkg = createNativeStackNavigator<HQBkgParams>();
export function HQBookingsStack() {
  return (
    <SHQBkg.Navigator screenOptions={opts}>
      <SHQBkg.Screen name="Amenities" component={AmenityListScreen} />
      <SHQBkg.Screen name="Profile" component={ProfileScreen} />
    </SHQBkg.Navigator>
  );
}
