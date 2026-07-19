import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomDrawer } from './CustomDrawer';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { ResidentListScreen } from '../features/residents/ResidentListScreen';
import { ResidentFormScreen } from '../features/residents/ResidentFormScreen';
import { ApartmentListScreen } from '../features/apartments/ApartmentListScreen';
import { ApartmentDetailScreen } from '../features/apartments/ApartmentDetailScreen';
import { ApartmentFormScreen } from '../features/apartments/ApartmentFormScreen';
import { MyApartmentScreen } from '../features/my-apartment/MyApartmentScreen';
import { RewardsScreen } from '../features/rewards/RewardsScreen';
import { ServicesScreen } from '../features/services/ServicesScreen';
import { ServiceRequestFormScreen } from '../features/services/ServiceRequestFormScreen';
import { ServiceProviderFormScreen } from '../features/services/ServiceProviderFormScreen';
import { SocietySettingsScreen } from '../features/society/SocietySettingsScreen';
import { AmenityFormScreen } from '../features/amenities/AmenityFormScreen';
import { VisitorListScreen } from '../features/visitors/VisitorListScreen';
import { VisitorRegisterScreen } from '../features/visitors/VisitorRegisterScreen';
import { VisitorPassScreen } from '../features/visitors/VisitorPassScreen';
import { VisitorScanScreen } from '../features/visitors/VisitorScanScreen';
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
import { PollListScreen } from '../features/polls/PollListScreen';
import { PollFormScreen } from '../features/polls/PollFormScreen';
import { PollDetailScreen } from '../features/polls/PollDetailScreen';
import { AgmSessionListScreen } from '../features/polls/AgmSessionListScreen';
import { AgmSessionFormScreen } from '../features/polls/AgmSessionFormScreen';
import { AgmSessionDetailScreen } from '../features/polls/AgmSessionDetailScreen';
import { HqSocietyListScreen } from '../features/hq/HqSocietyListScreen';
import { HqSocietyFormScreen } from '../features/hq/HqSocietyFormScreen';
import { HqSocietyEditScreen } from '../features/hq/HqSocietyEditScreen';
import { HqSocietyReportScreen } from '../features/hq/HqSocietyReportScreen';
import { HqUserListScreen } from '../features/hq/HqUserListScreen';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator();
const noHeader = { headerShown: false } as const;

// ── Mini-stacks for sections with detail screens ──────────────────────────────

type VisitorsParams = {
  VisitorList: undefined;
  VisitorRegister: undefined;
  VisitorDetail: { id: string };
  VisitorScan: undefined;
};
const VS = createNativeStackNavigator<VisitorsParams>();
function VisitorsStack() {
  return (
    <VS.Navigator screenOptions={noHeader}>
      <VS.Screen name="VisitorList"     component={VisitorListScreen} />
      <VS.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <VS.Screen name="VisitorDetail"   component={VisitorPassScreen} />
      <VS.Screen name="VisitorScan"     component={VisitorScanScreen} />
    </VS.Navigator>
  );
}

type NoticesParams = {
  NoticeList: undefined;
  NoticeDetail: { id: string };
  NoticeCreate: { id?: string } | undefined;
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
  AmenityForm: undefined;
};
const AS = createNativeStackNavigator<AmenitiesParams>();
function AmenitiesStack() {
  return (
    <AS.Navigator screenOptions={noHeader}>
      <AS.Screen name="AmenityList"    component={AmenityListScreen} />
      <AS.Screen name="AmenityBooking" component={AmenityBookingScreen} />
      <AS.Screen name="AmenityForm"    component={AmenityFormScreen} />
    </AS.Navigator>
  );
}

type ApartmentsParams = {
  ApartmentList: undefined;
  ApartmentDetail: { id: string };
  ApartmentForm: { id?: string };
};
const AptNav = createNativeStackNavigator<ApartmentsParams>();
function ApartmentsStack() {
  return (
    <AptNav.Navigator screenOptions={noHeader}>
      <AptNav.Screen name="ApartmentList"   component={ApartmentListScreen} />
      <AptNav.Screen name="ApartmentDetail" component={ApartmentDetailScreen} />
      <AptNav.Screen name="ApartmentForm"   component={ApartmentFormScreen} />
    </AptNav.Navigator>
  );
}

type ResidentsParams = {
  ResidentList: undefined;
  ResidentForm: { id?: string };
};
const ResNav = createNativeStackNavigator<ResidentsParams>();
function ResidentsStack() {
  return (
    <ResNav.Navigator screenOptions={noHeader}>
      <ResNav.Screen name="ResidentList" component={ResidentListScreen} />
      <ResNav.Screen name="ResidentForm" component={ResidentFormScreen} />
    </ResNav.Navigator>
  );
}

type ServicesParams = {
  ServicesHome: undefined;
  ServiceRequestForm: undefined;
  ServiceProviderForm: undefined;
};
const SvcNav = createNativeStackNavigator<ServicesParams>();
function ServicesStack() {
  return (
    <SvcNav.Navigator screenOptions={noHeader}>
      <SvcNav.Screen name="ServicesHome"        component={ServicesScreen} />
      <SvcNav.Screen name="ServiceRequestForm"  component={ServiceRequestFormScreen} />
      <SvcNav.Screen name="ServiceProviderForm" component={ServiceProviderFormScreen} />
    </SvcNav.Navigator>
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

type PollParams = {
  PollList: undefined;
  PollForm: { agmSessionId?: string } | undefined;
  PollDetail: { id: string };
  AgmSessionList: undefined;
  AgmSessionForm: undefined;
  AgmSessionDetail: { id: string };
};
const PollNav = createNativeStackNavigator<PollParams>();
function PollStack() {
  return (
    <PollNav.Navigator screenOptions={noHeader}>
      <PollNav.Screen name="PollList" component={PollListScreen} />
      <PollNav.Screen name="PollForm" component={PollFormScreen} />
      <PollNav.Screen name="PollDetail" component={PollDetailScreen} />
      <PollNav.Screen name="AgmSessionList" component={AgmSessionListScreen} />
      <PollNav.Screen name="AgmSessionForm" component={AgmSessionFormScreen} />
      <PollNav.Screen name="AgmSessionDetail" component={AgmSessionDetailScreen} />
    </PollNav.Navigator>
  );
}

// ── Main Drawer Navigator ───────────────────────────────────────��─────────────

type HqSocietiesParams = {
  HqSocietyList: undefined;
  HqSocietyForm: undefined;
  HqSocietyEdit: { id: string; name?: string };
  HqSocietyReport: { id: string; name?: string };
};
const HqSocietiesNav = createNativeStackNavigator<HqSocietiesParams>();
function HqSocietiesStack() {
  return (
    <HqSocietiesNav.Navigator screenOptions={noHeader}>
      <HqSocietiesNav.Screen name="HqSocietyList" component={HqSocietyListScreen} />
      <HqSocietiesNav.Screen name="HqSocietyForm" component={HqSocietyFormScreen} />
      <HqSocietiesNav.Screen name="HqSocietyEdit" component={HqSocietyEditScreen} />
      <HqSocietiesNav.Screen name="HqSocietyReport" component={HqSocietyReportScreen} />
    </HqSocietiesNav.Navigator>
  );
}

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
      <Drawer.Screen name="Residents"       component={ResidentsStack} />
      <Drawer.Screen name="Apartments"      component={ApartmentsStack} />
      <Drawer.Screen name="MyApartment"     component={MyApartmentScreen} />
      <Drawer.Screen name="Rewards"         component={RewardsScreen} />
      <Drawer.Screen name="Services"        component={ServicesStack} />
      <Drawer.Screen name="SocietySettings" component={SocietySettingsScreen} />
      <Drawer.Screen name="Visitors"        component={VisitorsStack} />
      <Drawer.Screen name="Notices"         component={NoticesStack} />
      <Drawer.Screen name="Complaints"      component={ComplaintsStack} />
      <Drawer.Screen name="Maintenance"     component={MaintenanceScreen} />
      <Drawer.Screen name="FinancialReport" component={FinancialReportScreen} />
      <Drawer.Screen name="VendorPayments"  component={VendorPaymentListScreen} />
      <Drawer.Screen name="Amenities"       component={AmenitiesStack} />
      <Drawer.Screen name="Staff"           component={StaffStack} />
      <Drawer.Screen name="SosAlerts"       component={SosStack} />
      <Drawer.Screen name="Polls"           component={PollStack} />
      <Drawer.Screen name="Committee"       component={CommitteeScreen} />
      <Drawer.Screen name="ContactUs"       component={ContactUsScreen} />
      <Drawer.Screen name="HqSocieties"     component={HqSocietiesStack} />
      <Drawer.Screen name="HqUsers"         component={HqUserListScreen} />
      <Drawer.Screen name="Profile"         component={ProfileScreen} />
    </Drawer.Navigator>
  );
}
