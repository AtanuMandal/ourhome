import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { VisitorListScreen } from '../features/visitors/VisitorListScreen';
import { VisitorRegisterScreen } from '../features/visitors/VisitorRegisterScreen';
import { VisitorPassScreen } from '../features/visitors/VisitorPassScreen';
import { ResidentListScreen } from '../features/residents/ResidentListScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';

export type SecurityStackParamList = {
  Gate: undefined;
  VisitorRegister: undefined;
  VisitorPass: { id: string };
  Residents: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<SecurityStackParamList>();

export function SecurityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Gate" component={VisitorListScreen} />
      <Stack.Screen name="VisitorRegister" component={VisitorRegisterScreen} />
      <Stack.Screen name="VisitorPass" component={VisitorPassScreen} />
      <Stack.Screen name="Residents" component={ResidentListScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
