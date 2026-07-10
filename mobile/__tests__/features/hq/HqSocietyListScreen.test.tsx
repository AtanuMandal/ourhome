import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HqSocietyListScreen } from '../../../src/features/hq/HqSocietyListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Society } from '../../../src/api/endpoints/society';

const mockActivate = jest.fn();
const mockDeactivate = jest.fn();
let mockSocieties: Society[] = [];

jest.mock('../../../src/features/hq/hooks/useHq', () => ({
  useHqSocieties: () => ({ data: { items: mockSocieties, total: mockSocieties.length, page: 1, pageSize: 100 }, isLoading: false, refetch: jest.fn(), isRefetching: false }),
  useActivateSociety: () => ({ mutate: mockActivate, isPending: false }),
  useDeactivateSociety: () => ({ mutate: mockDeactivate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeSociety(overrides: Partial<Society> = {}): Society {
  return {
    id: 's1', name: 'Green Valley',
    address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
    contactEmail: 'admin@gv.com', contactPhone: '9876543210',
    totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7, status: 'Active',
    societyUsers: [], committees: [], themeId: 'ocean',
    ...overrides,
  };
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <HqSocietyListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function setUser(role: 'HQAdmin' | 'HQUser') {
  useAuthStore.setState({
    user: { id: 'u1', societyId: 'hq', fullName: 'Platform Admin', email: 'admin@platform.com', phone: '9000000000',
      role, residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
    token: 'token',
    isAuthenticated: true,
  });
}

describe('HqSocietyListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocieties = [];
  });

  test('renders societies regardless of status', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ status: 'Active' }), makeSociety({ id: 's2', name: 'Blue Ridge', status: 'Inactive' })];

    renderScreen();

    expect(screen.getByText('Green Valley')).toBeTruthy();
    expect(screen.getByText('Blue Ridge')).toBeTruthy();
  });

  test('HQAdmin sees Disable action for an active society', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ status: 'Active' })];

    renderScreen();
    fireEvent.press(screen.getByText('Disable'));

    expect(mockDeactivate).toHaveBeenCalledWith('s1', expect.anything());
  });

  test('HQAdmin sees Enable action for an inactive society', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ status: 'Inactive' })];

    renderScreen();
    fireEvent.press(screen.getByText('Enable'));

    expect(mockActivate).toHaveBeenCalledWith('s1', expect.anything());
  });

  test('HQUser does not see enable/disable actions', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety({ status: 'Active' })];

    renderScreen();

    expect(screen.queryByText('Disable')).toBeNull();
    expect(screen.queryByText('Enable')).toBeNull();
  });

  test('HQAdmin sees the Add Society FAB', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.getByLabelText('Add society')).toBeTruthy();
  });

  test('HQUser does not see the Add Society FAB', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.queryByLabelText('Add society')).toBeNull();
  });

  test('HQAdmin sees the Edit action', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.getByText('Edit')).toBeTruthy();
  });

  test('HQUser does not see the Edit action', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.queryByText('Edit')).toBeNull();
  });
});
