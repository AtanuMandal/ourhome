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
import { ProfileScreen } from '../features/profile/ProfileScreen';

export type ResidentStackParamList = {
  Home: undefined;
  Visitors: undefined;
  VisitorRegister: undefined;
  VisitorPass: { id: string };
  Maintenance: undefined;
  ChargeDetail: { id: string };
  Notices: undefined;
  NoticeDetail: { id: string };
  Complaints: undefined;
  ComplaintCreate: undefined;
  Amenities: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<ResidentStackParamList>();

export function ResidentStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={DashboardScreen} />
      <Stack.Screen name="Visitors" component={VisitorListScreen} />
      <Stack.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <Stack.Screen name="VisitorPass" component={VisitorPassScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
      <Stack.Screen name="Notices" component={NoticeListScreen} />
      <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <Stack.Screen name="Complaints" component={ComplaintListScreen} />
      <Stack.Screen name="ComplaintCreate" component={ComplaintCreateScreen} />
      <Stack.Screen name="Amenities" component={AmenityListScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
