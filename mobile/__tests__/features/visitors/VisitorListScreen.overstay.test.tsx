import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisitorListScreen } from '../../../src/features/visitors/VisitorListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Visitor } from '../../../src/api/types';

// Visitors are no longer auto-checked-out on an overstay timer — the list instead surfaces a
// red warning banner at the top when any visitor has crossed the society's overstay threshold.
const overstayingVisitor: Partial<Visitor> = {
  id: 'v1',
  vn: 'Overstaying Guest',
  hrn: 'Host Resident',
  hbn: 'A',
  hfn: 1,
  hft: '101',
  aid: 'apt-999',
  pu: 'Delivery',
  st: 'CheckedIn',
  ov: true,
};

const normalVisitor: Partial<Visitor> = {
  id: 'v2',
  vn: 'On-Time Guest',
  hrn: 'Host Resident',
  hbn: 'A',
  hfn: 1,
  hft: '102',
  aid: 'apt-999',
  pu: 'Delivery',
  st: 'CheckedIn',
  ov: false,
};

let mockDefaultViewData: Partial<Visitor>[] = [];

jest.mock('../../../src/features/visitors/hooks/useVisitors', () => ({
  useVisitorList: () => ({
    data: [],
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useVisitorDefaultView: () => ({
    get data() {
      return mockDefaultViewData;
    },
    isLoading: false,
    refetch: jest.fn(),
  }),
  useApproveVisitor: () => ({ mutate: jest.fn() }),
  useDenyVisitor: () => ({ mutate: jest.fn() }),
  useCheckOutVisitor: () => ({ mutate: jest.fn() }),
  useCheckInVisitorByPass: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

jest.mock('../../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => {
    const { useAuthStore: store } = require('../../../src/store/authStore');
    const user = store.getState().user;
    return {
      apartments: user?.apartments ?? [],
      activeApartmentId: user?.apartmentId ?? null,
      activeResidentType: user?.residentType,
      setSelectedApartment: jest.fn(),
    };
  },
}));

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

describe('VisitorListScreen — overstay warning banner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'sec1', societyId: 'soc-1', fullName: 'Guard', email: 'g@a.com', phone: '1', role: 'SUSecurity', residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('shows a red banner naming the overstaying visitor count, not an auto-checkout label', async () => {
    mockDefaultViewData = [overstayingVisitor, normalVisitor];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Overstaying Guest')).toBeTruthy());
    expect(screen.getByText(/1 visitor overstaying the allowed time/)).toBeTruthy();
    expect(screen.getByText('Overstaying past the society threshold')).toBeTruthy();
    expect(screen.queryByText(/\(auto\)/)).toBeNull();
  });

  test('shows no banner when no visitor is overstaying', async () => {
    mockDefaultViewData = [normalVisitor];

    renderScreen();

    await waitFor(() => expect(screen.getByText('On-Time Guest')).toBeTruthy());
    expect(screen.queryByText(/overstaying the allowed time/)).toBeNull();
  });
});
