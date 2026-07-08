import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PollListScreen } from '../../../src/features/polls/PollListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { PollSummary } from '../../../src/api/types';

let mockPollData: PollSummary[] = [];

jest.mock('../../../src/features/polls/hooks/usePolls', () => ({
  usePollList: () => ({
    data: mockPollData,
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

function makeSummary(overrides: Partial<PollSummary>): PollSummary {
  return {
    id: overrides.id ?? 'p1',
    title: overrides.title ?? 'Repaint the gate?',
    type: overrides.type ?? 'SingleChoice',
    opensAt: '2026-01-01T00:00:00Z',
    closesAt: '2026-01-10T00:00:00Z',
    status: overrides.status ?? 'Open',
    isAgmResolution: overrides.isAgmResolution ?? false,
    resultsPublished: overrides.resultsPublished ?? false,
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
        <PollListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('PollListScreen', () => {
  function setUser(role: 'SUAdmin' | 'SUUser' | 'SUSecurity') {
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'v@a.com', phone: '1', role, residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  beforeEach(() => {
    mockPollData = [];
  });

  test('renders poll titles from the list', async () => {
    setUser('SUUser');
    mockPollData = [makeSummary({ id: '1', title: 'Repaint the gate?' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Repaint the gate?')).toBeTruthy());
  });

  test('shows the add-poll FAB for SUAdmin', async () => {
    setUser('SUAdmin');
    mockPollData = [makeSummary({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Repaint the gate?')).toBeTruthy());
    expect(screen.getByText('+')).toBeTruthy();
  });

  test('does not show the add-poll FAB for SUUser', async () => {
    setUser('SUUser');
    mockPollData = [makeSummary({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Repaint the gate?')).toBeTruthy());
    expect(screen.queryByText('+')).toBeNull();
  });
});
