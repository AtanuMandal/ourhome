import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AgmSessionDetailScreen } from '../../../src/features/polls/AgmSessionDetailScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { AgmSessionDetail, Poll } from '../../../src/api/types';

const mockCastVoteMutate = jest.fn();
const mockCloseMutate = jest.fn();
const mockPublishMutate = jest.fn();
let mockSession: AgmSessionDetail | undefined;

jest.mock('../../../src/features/polls/hooks/useAgmSessions', () => ({
  useAgmSession: () => ({ data: mockSession, isLoading: false }),
}));

jest.mock('../../../src/features/polls/hooks/usePolls', () => ({
  useCastVote: () => ({ mutateAsync: mockCastVoteMutate, isPending: false }),
  useClosePoll: () => ({ mutateAsync: mockCloseMutate, isPending: false }),
  usePublishPollResults: () => ({ mutateAsync: mockPublishMutate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeResolution(overrides: Partial<Poll>): Poll {
  return {
    id: overrides.id ?? 'r1', societyId: 'soc-1', title: overrides.title ?? 'Resolution 1', description: 'desc',
    type: 'SingleChoice', options: [{ id: 'o1', text: 'Yes' }, { id: 'o2', text: 'No' }],
    opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z',
    targetAudience: 'FullSociety', targetBlockNames: [],
    eligibilityUnit: 'PerResident', anonymity: 'Anonymous', visibility: 'Immediately',
    isAgmResolution: true, allowVoteChange: true, status: overrides.status ?? 'Open',
    resultsPublished: overrides.resultsPublished ?? false, createdByUserId: 'admin-1', createdAt: '2026-01-01T00:00:00Z',
    hasVoted: false, agmSessionId: 's1',
    ...overrides,
  };
}

function makeSession(resolutions: Poll[]): AgmSessionDetail {
  return {
    id: 's1', societyId: 'soc-1', title: 'AGM 2026', description: 'Yearly resolutions',
    sessionDate: '2026-04-15T10:00:00Z', createdByUserId: 'admin-1', createdAt: '2026-01-01T00:00:00Z',
    resolutions,
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
        <AgmSessionDetailScreen route={{ params: { id: 's1' } }} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('AgmSessionDetailScreen', () => {
  function setUser(role: 'SUAdmin' | 'SUUser') {
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'v@a.com', phone: '1', role, residentType: 'Owner', apartmentId: 'apt-1', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = undefined;
  });

  test('renders the session title and its resolutions', async () => {
    setUser('SUUser');
    mockSession = makeSession([makeResolution({ id: 'r1', title: 'Resolution 1' })]);

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM 2026')).toBeTruthy());
    expect(screen.getByText('Resolution 1')).toBeTruthy();
  });

  test('allows a resident to vote on an open resolution', async () => {
    setUser('SUUser');
    mockSession = makeSession([makeResolution({ id: 'r1' })]);

    renderScreen();
    await waitFor(() => expect(screen.getByText('Yes')).toBeTruthy());

    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('Submit Vote'));

    expect(mockCastVoteMutate).toHaveBeenCalledWith({ selectedOptionIds: ['o1'] });
  });

  test('SUAdmin sees the close-early action for an open resolution', async () => {
    setUser('SUAdmin');
    mockSession = makeSession([makeResolution({ id: 'r1' })]);

    renderScreen();

    await waitFor(() => expect(screen.getByText('Close Early')).toBeTruthy());
    fireEvent.press(screen.getByText('Close Early'));

    expect(mockCloseMutate).toHaveBeenCalledWith('r1');
  });

  test('SUAdmin sees the publish-results action for a closed unpublished resolution', async () => {
    setUser('SUAdmin');
    mockSession = makeSession([makeResolution({ id: 'r1', status: 'Closed', resultsPublished: false })]);

    renderScreen();

    await waitFor(() => expect(screen.getByText('Publish Results')).toBeTruthy());
    fireEvent.press(screen.getByText('Publish Results'));

    expect(mockPublishMutate).toHaveBeenCalledWith('r1');
  });

  test('SUAdmin sees the Add Resolution link', async () => {
    setUser('SUAdmin');
    mockSession = makeSession([]);

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM 2026')).toBeTruthy());
    expect(screen.getByText('+ Add Resolution')).toBeTruthy();
  });

  test('shows the target audience for a block-scoped resolution', async () => {
    setUser('SUUser');
    mockSession = makeSession([makeResolution({ id: 'r1', targetAudience: 'PerBlock', targetBlockNames: ['BLOCK A'] })]);

    renderScreen();

    await waitFor(() => expect(screen.getByText(/Target: Block: BLOCK A/)).toBeTruthy());
  });
});
