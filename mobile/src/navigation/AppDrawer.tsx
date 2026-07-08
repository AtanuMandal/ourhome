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
import { NoticeCreateScreen } from '../features/notices/NoticeCreateScreen';
import { ComplaintListScreen } from '../features/complaints/ComplaintListScreen';
import { ComplaintCreateScreen } from '../features/complaints/ComplaintCreateScreen';
import { ComplaintDetailScreen } from '../features/complaints/ComplaintDetailScreen';
import { MaintenanceScreen } from '../features/maintenance/MaintenanceScreen';
import { FinancialReportScreen } from '../features/financial-report/FinancialReportScreen';
import { VendorPaymentListScreen } from '../features/vendor-payments/VendorPaymentListScreen';
import { AmenityListScreen } from '../features/amenities/AmenityListScreen';
import { AmenityBookingScreen } from '../features/amenities/AmenityBookingScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { CommitteeScreen } from '../features/society/CommitteeScreen';
import { ContactUsScreen } from '../features/society/ContactUsScreen';
import { StaffListScreen } from '../features/staff/StaffListScreen';
import { StaffFormScreen } from '../features/staff/StaffFormScreen';
import { StaffAttendanceReportScreen } from '../features/staff/StaffAttendanceReportScreen';
import { SosAlertListScreen } from '../features/sos/SosAlertListScreen';
import { SosAlertReportScreen } from '../features/sos/SosAlertReportScreen';
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
  NoticeCreate: undefined;
};
const NS = createNativeStackNavigator<NoticesParams>();
function NoticesStack() {
  return (
    <NS.Navigator screenOptions={noHeader}>
      <NS.Screen name="NoticeList"   component={NoticeListScreen} />
      <NS.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <NS.Screen name="NoticeCreate" component={NoticeCreateScreen} />
    </NS.Navigator>
  );
}

type ComplaintsParams = {
  ComplaintList: undefined;
  ComplaintCreate: undefined;
  ComplaintDetail: { id: string };
};
const CS = createNativeStackNavigator<ComplaintsParams>();
function ComplaintsStack() {
  return (
    <CS.Navigator screenOptions={noHeader}>
      <CS.Screen name="ComplaintList"   component={ComplaintListScreen} />
      <CS.Screen name="ComplaintCreate" component={ComplaintCreateScreen} />
      <CS.Screen name="ComplaintDetail" component={ComplaintDetailScreen} />
    </CS.Navigator>
  );
}

type AmenitiesParams = {
  AmenityList: undefined;
  AmenityBooking: { amenityId: string; amenityName: string };
};
const AS = createNativeStackNavigator<AmenitiesParams>();
function AmenitiesStack() {
  return (
    <AS.Navigator screenOptions={noHeader}>
      <AS.Screen name="AmenityList"    component={AmenityListScreen} />
      <AS.Screen name="AmenityBooking" component={AmenityBookingScreen} />
    </AS.Navigator>
  );
}

type StaffParams = {
  StaffList: undefined;
  StaffForm: { id?: string };
  StaffAttendanceReport: undefined;
};
const StaffNav = createNativeStackNavigator<StaffParams>();
function StaffStack() {
  return (
    <StaffNav.Navigator screenOptions={noHeader}>
      <StaffNav.Screen name="StaffList" component={StaffListScreen} />
      <StaffNav.Screen name="StaffForm" component={StaffFormScreen} />
      <StaffNav.Screen name="StaffAttendanceReport" component={StaffAttendanceReportScreen} />
    </StaffNav.Navigator>
  );
}

type SosParams = {
  SosAlertList: undefined;
  SosAlertReport: undefined;
};
const SosNav = createNativeStackNavigator<SosParams>();
function SosStack() {
  return (
    <SosNav.Navigator screenOptions={noHeader}>
      <SosNav.Screen name="SosAlertList" component={SosAlertListScreen} />
      <SosNav.Screen name="SosAlertReport" component={SosAlertReportScreen} />
    </SosNav.Navigator>
  );
}

// ── Main Drawer Navigator ───────────────────────────────────────��─────────────

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
      <Drawer.Screen name="Amenities"       component={AmenitiesStack} />
      <Drawer.Screen name="Staff"           component={StaffStack} />
      <Drawer.Screen name="SosAlerts"       component={SosStack} />
      <Drawer.Screen name="Committee"       component={CommitteeScreen} />
      <Drawer.Screen name="ContactUs"       component={ContactUsScreen} />
      <Drawer.Screen name="Profile"         component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
