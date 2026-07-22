import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RewardsScreen } from '../../../src/features/rewards/RewardsScreen';
import { useAuthStore } from '../../../src/store/authStore';

const mockGetUserPoints = jest.fn();

jest.mock('../../../src/api/endpoints/gamification', () => ({
  gamificationApi: {
    getUserPoints: (...args: [string, string]) => mockGetUserPoints(...args),
  },
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <RewardsScreen />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

describe('RewardsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', sid: 'soc-1', fn: 'Resident', em: 'r@a.com', ph: '1', rl: 'SUUser', rt: 'Owner', aid: 'apt-1', vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('shows the points balance and earning history', async () => {
    mockGetUserPoints.mockResolvedValue({
      tp: 120,
      h: [
        { pts: 20, rsn: 'Poll participation', ca: '2026-07-01T10:00:00Z' },
        { pts: 100, rsn: 'On-time payment', ca: '2026-06-05T10:00:00Z' },
      ],
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(mockGetUserPoints).toHaveBeenCalledWith('soc-1', 'u1');
    expect(screen.getByText('Poll participation')).toBeTruthy();
    expect(screen.getByText('+100')).toBeTruthy();
  });

  test('shows an empty state when the user has no points yet', async () => {
    mockGetUserPoints.mockResolvedValue({ tp: 0, h: [] });

    renderScreen();

    await waitFor(() => expect(screen.getByText('No points yet')).toBeTruthy());
  });
});
