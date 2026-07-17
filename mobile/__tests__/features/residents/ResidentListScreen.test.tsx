import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ResidentListScreen } from '../../../src/features/residents/ResidentListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { User } from '../../../src/api/types';

const mockDelete = jest.fn();
let mockData: User[] = [];

jest.mock('../../../src/features/residents/hooks/useResidents', () => ({
  useResidentList: () => ({
    data: mockData,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useDeleteResident: () => ({ mutate: mockDelete, isPending: false }),
  useSetResidentActive: () => ({ mutate: jest.fn(), isPending: false }),
  usePendingJoinRequests: () => ({ data: [] }),
  useRespondToJoinRequest: () => ({ mutate: jest.fn(), isPending: false }),
  useShareInviteLink: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeUser(overrides: Partial<User>): User {
  return {
    id: overrides.id ?? 'u1',
    societyId: 'soc-1',
    fullName: overrides.fullName ?? 'Bob Jones',
    email: overrides.email ?? 'bob@example.com',
    phone: overrides.phone ?? '9876543210',
    role: overrides.role ?? 'SUUser',
    residentType: 'Owner',
    isVerified: true,
    isActive: true,
    ...overrides,
  } as User;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <ResidentListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('ResidentListScreen — contact info display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'viewer@a.com', phone: '1', role: 'SUUser', residentType: 'Owner', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  // Contact masking is enforced server-side (see requirements/UserAndAccess.md): the screen
  // must render whatever phone value the API returns rather than assuming it is always raw,
  // since a SUUser viewer will now receive an already-masked value from the backend.
  test('renders a masked phone value returned by the backend as-is, without further hiding it', async () => {
    mockData = [makeUser({ id: '1', fullName: 'Bob Jones', phone: '+91-98XXXXXX10' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Bob Jones')).toBeTruthy());
    expect(screen.getByText(/\+91-98XXXXXX10/)).toBeTruthy();
  });

  test('renders an unmasked phone value returned by the backend (e.g. for an admin viewer)', async () => {
    mockData = [makeUser({ id: '1', fullName: 'Bob Jones', phone: '9876543210' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Bob Jones')).toBeTruthy());
    expect(screen.getByText(/9876543210/)).toBeTruthy();
  });
});
