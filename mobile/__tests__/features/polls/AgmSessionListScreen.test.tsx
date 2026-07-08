import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AgmSessionListScreen } from '../../../src/features/polls/AgmSessionListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { AgmSessionSummary } from '../../../src/api/types';

let mockSessionData: AgmSessionSummary[] = [];

jest.mock('../../../src/features/polls/hooks/useAgmSessions', () => ({
  useAgmSessionList: () => ({
    data: mockSessionData,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
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
        <AgmSessionListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('AgmSessionListScreen', () => {
  function setUser(role: 'SUAdmin' | 'SUUser') {
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'v@a.com', phone: '1', role, residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  beforeEach(() => {
    mockSessionData = [];
  });

  test('renders session titles from the list', async () => {
    setUser('SUUser');
    mockSessionData = [{ id: '1', title: 'AGM 2026', sessionDate: '2026-04-01T00:00:00Z', resolutionCount: 3 }];

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM 2026')).toBeTruthy());
  });

  test('shows the add-session FAB for SUAdmin', async () => {
    setUser('SUAdmin');
    mockSessionData = [{ id: '1', title: 'AGM 2026', sessionDate: '2026-04-01T00:00:00Z', resolutionCount: 3 }];

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM 2026')).toBeTruthy());
    expect(screen.getByText('+')).toBeTruthy();
  });

  test('does not show the add-session FAB for SUUser', async () => {
    setUser('SUUser');
    mockSessionData = [{ id: '1', title: 'AGM 2026', sessionDate: '2026-04-01T00:00:00Z', resolutionCount: 3 }];

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM 2026')).toBeTruthy());
    expect(screen.queryByText('+')).toBeNull();
  });
});
