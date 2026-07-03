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
import { ProfileScreen } from '../features/profile/ProfileScreen';

export type AdminStackParamList = {
  Dashboard: undefined;
  Apartments: undefined;
  Residents: undefined;
  Maintenance: undefined;
  FinancialReport: undefined;
  VendorPayments: undefined;
  Notices: undefined;
  NoticeDetail: { id: string };
  Complaints: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Apartments" component={ApartmentListScreen} />
      <Stack.Screen name="Residents" component={ResidentListScreen} />
      <Stack.Screen name="Maintenance" component={MaintenanceScreen} />
      <Stack.Screen name="FinancialReport" component={FinancialReportScreen} />
      <Stack.Screen name="VendorPayments" component={VendorPaymentListScreen} />
      <Stack.Screen name="Notices" component={NoticeListScreen} />
      <Stack.Screen name="NoticeDetail" component={NoticeDetailScreen} />
      <Stack.Screen name="Complaints" component={ComplaintListScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
