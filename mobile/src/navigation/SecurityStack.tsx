import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { VisitorListScreen } from '../features/visitors/VisitorListScreen';
import { VisitorRegisterScreen } from '../features/visitors/VisitorRegisterScreen';
import { VisitorPassScreen } from '../features/visitors/VisitorPassScreen';
import { ResidentListScreen } from '../features/residents/ResidentListScreen';
import { NoticeListScreen } from '../features/notices/NoticeListScreen';
import { NoticeDetailScreen } from '../features/notices/NoticeDetailScreen';
import { ComplaintListScreen } from '../features/complaints/ComplaintListScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';

const opts = { headerShown: false };

// ── Tab 1: Home ───────────────────────────────────────────────────────────────
type HomeParams = { Home: undefined; Profile: undefined };
const SHome = createNativeStackNavigator<HomeParams>();
export function SecurityHomeStack() {
  return (
    <SHome.Navigator screenOptions={opts}>
      <SHome.Screen name="Home" component={DashboardScreen} />
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
export function SecurityVisitorsStack() {
  return (
    <SVisitors.Navigator screenOptions={opts}>
      <SVisitors.Screen name="Visitors" component={VisitorListScreen} />
      <SVisitors.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <SVisitors.Screen name="VisitorPass" component={VisitorPassScreen} />
      <SVisitors.Screen name="Profile" component={ProfileScreen} />
    </SVisitors.Navigator>
  );
}

// ── Tab 3: Residents ──────────────────────────────────────────────────────────
type ResidentsParams = { Residents: undefined; Profile: undefined };
const SResidents = createNativeStackNavigator<ResidentsParams>();
export function SecurityResidentsStack() {
  return (
    <SResidents.Navigator screenOptions={opts}>
      <SResidents.Screen name="Residents" component={ResidentListScreen} />
      <SResidents.Screen name="Profile" component={ProfileScreen} />
    </SResidents.Navigator>
  );
}

// ── Tab 4: Notices ────────────────────────────────────────────────────────────
type NoticesParams = { Notices: undefined; NoticeDetail: { id: string }; Profile: undefined };
const SNotices = createNativeStackNavigator<NoticesParams>();
export function SecurityNoticesStack() {
  return (
    <SNotices.Navigator screenOptions={opts}>
      <SNotices.Screen name="Notices" component={NoticeListScreen} />
      <SNotices.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <SNotices.Screen name="Profile" component={ProfileScreen} />
    </SNotices.Navigator>
  );
}

// ── Tab 5: Complaints ─────────────────────────────────────────────────────────
type ComplaintsParams = { Complaints: undefined; Profile: undefined };
const SComplaints = createNativeStackNavigator<ComplaintsParams>();
export function SecurityComplaintsStack() {
  return (
    <SComplaints.Navigator screenOptions={opts}>
      <SComplaints.Screen name="Complaints" component={ComplaintListScreen} />
      <SComplaints.Screen name="Profile" component={ProfileScreen} />
    </SComplaints.Navigator>
  );
}
