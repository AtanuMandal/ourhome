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
      user: { id: 'u1', societyId: 'soc-1', fullName: 'Resident', email: 'r@a.com', phone: '1', role: 'SUUser', residentType: 'Owner', apartmentId: 'apt-1', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('shows the points balance and earning history', async () => {
    mockGetUserPoints.mockResolvedValue({
      userId: 'u1',
      societyId: 'soc-1',
      totalPoints: 120,
      history: [
        { id: 'p1', action: 'Poll participation', points: 20, earnedAt: '2026-07-01T10:00:00Z' },
        { id: 'p2', action: 'On-time payment', points: 100, description: 'June maintenance', earnedAt: '2026-06-05T10:00:00Z' },
      ],
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('120')).toBeTruthy());
    expect(mockGetUserPoints).toHaveBeenCalledWith('soc-1', 'u1');
    expect(screen.getByText('Poll participation')).toBeTruthy();
    expect(screen.getByText('+100')).toBeTruthy();
    expect(screen.getByText('June maintenance')).toBeTruthy();
  });

  test('shows an empty state when the user has no points yet', async () => {
    mockGetUserPoints.mockResolvedValue({ userId: 'u1', societyId: 'soc-1', totalPoints: 0, history: [] });

    renderScreen();

    await waitFor(() => expect(screen.getByText('No points yet')).toBeTruthy());
  });
});
