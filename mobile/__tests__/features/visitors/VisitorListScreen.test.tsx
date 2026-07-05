import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisitorListScreen } from '../../../src/features/visitors/VisitorListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Visitor } from '../../../src/api/types';

const mockApprove = jest.fn();
const mockDeny = jest.fn();
const mockCheckOut = jest.fn();

const pendingVisitor: Partial<Visitor> = {
  id: 'v1',
  visitorName: 'Jane Visitor',
  hostResidentName: 'Host Resident',
  hostBlockName: 'A',
  hostFloorNumber: 1,
  hostFlatNumber: '101',
  hostApartmentId: 'apt-999',
  purpose: 'Delivery',
  status: 'Pending',
};

jest.mock('../../../src/features/visitors/hooks/useVisitors', () => ({
  useVisitorList: () => ({
    data: [pendingVisitor],
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useVisitorDefaultView: () => ({
    data: [pendingVisitor],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useApproveVisitor: () => ({ mutate: mockApprove }),
  useDenyVisitor: () => ({ mutate: mockDeny }),
  useCheckOutVisitor: () => ({ mutate: mockCheckOut }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <VisitorListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('VisitorListScreen — approve/deny visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('SUAdmin sees Deny but not Approve for a pending visitor not hosted by them', async () => {
    useAuthStore.setState({
      user: { id: 'admin1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', phone: '1', role: 'SUAdmin', residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Deny')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  test('SUSecurity sees Deny but not Approve for a pending visitor not hosted by them', async () => {
    useAuthStore.setState({
      user: { id: 'sec1', societyId: 'soc-1', fullName: 'Guard', email: 'g@a.com', phone: '1', role: 'SUSecurity', residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Deny')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  test('the host resident sees Approve for their own visitor', async () => {
    useAuthStore.setState({
      user: { id: 'res1', societyId: 'soc-1', fullName: 'Resident', email: 'r@a.com', phone: '1', role: 'SUUser', residentType: 'Owner', apartmentId: 'apt-999', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Approve')).toBeTruthy();
  });
});
