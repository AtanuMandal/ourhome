import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PollDetailScreen } from '../../../src/features/polls/PollDetailScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Poll } from '../../../src/api/types';

const mockCastVoteMutate = jest.fn();
const mockCloseMutate = jest.fn();
const mockPublishMutate = jest.fn();
let mockPoll: Poll | undefined;

jest.mock('../../../src/features/polls/hooks/usePolls', () => ({
  usePoll: () => ({ data: mockPoll, isLoading: false }),
  useCastVote: () => ({ mutateAsync: mockCastVoteMutate, isPending: false }),
  useClosePoll: () => ({ mutateAsync: mockCloseMutate, isPending: false }),
  usePublishPollResults: () => ({ mutateAsync: mockPublishMutate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: 'p1', societyId: 'soc-1', title: 'Repaint the gate?', description: 'desc',
    type: 'SingleChoice', options: [{ id: 'o1', text: 'Yes' }, { id: 'o2', text: 'No' }],
    opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z',
    eligibilityUnit: 'PerResident', anonymity: 'Anonymous', visibility: 'Immediately',
    isAgmResolution: false, allowVoteChange: true, status: 'Open',
    resultsPublished: false, createdByUserId: 'admin-1', createdAt: '2026-01-01T00:00:00Z',
    hasVoted: false,
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
        <PollDetailScreen route={{ params: { id: 'p1' } }} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('PollDetailScreen', () => {
  function setUser(role: 'SUAdmin' | 'SUUser' | 'SUSecurity') {
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'v@a.com', phone: '1', role, residentType: 'Owner', apartmentId: 'apt-1', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoll = undefined;
  });

  test('shows the vote options for a resident on an open poll', async () => {
    setUser('SUUser');
    mockPoll = makePoll();

    renderScreen();

    await waitFor(() => expect(screen.getByText('Repaint the gate?')).toBeTruthy());
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('Submit Vote')).toBeTruthy();
  });

  test('casts a vote with the selected option', async () => {
    setUser('SUUser');
    mockPoll = makePoll();

    renderScreen();
    await waitFor(() => expect(screen.getByText('Yes')).toBeTruthy());

    fireEvent.press(screen.getByText('Yes'));
    fireEvent.press(screen.getByText('Submit Vote'));

    expect(mockCastVoteMutate).toHaveBeenCalledWith({ selectedOptionIds: ['o1'] });
  });

  test('shows a read-only vote label when the resident already voted and cannot change it', async () => {
    setUser('SUUser');
    mockPoll = makePoll({ hasVoted: true, allowVoteChange: false, mySelectedOptionIds: ['o1'] });

    renderScreen();

    await waitFor(() => expect(screen.getByText(/You voted for: Yes/)).toBeTruthy());
    expect(screen.queryByText('Submit Vote')).toBeNull();
  });

  test('does not show voting controls once the poll is closed', async () => {
    setUser('SUUser');
    mockPoll = makePoll({ status: 'Closed' });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Repaint the gate?')).toBeTruthy());
    expect(screen.queryByText('Submit Vote')).toBeNull();
  });

  test('SUAdmin sees the close-poll action for an open poll', async () => {
    setUser('SUAdmin');
    mockPoll = makePoll();

    renderScreen();

    await waitFor(() => expect(screen.getByText('Close Poll Early')).toBeTruthy());
    fireEvent.press(screen.getByText('Close Poll Early'));

    expect(mockCloseMutate).toHaveBeenCalledWith('p1');
  });

  test('SUAdmin sees the publish-results action for a closed unpublished poll', async () => {
    setUser('SUAdmin');
    mockPoll = makePoll({ status: 'Closed', resultsPublished: false, tally: [{ id: 'o1', text: 'Yes', voteCount: 3 }] });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Publish Results')).toBeTruthy());
    fireEvent.press(screen.getByText('Publish Results'));

    expect(mockPublishMutate).toHaveBeenCalledWith('p1');
  });

  test('renders the tally when present', async () => {
    setUser('SUAdmin');
    mockPoll = makePoll({ tally: [{ id: 'o1', text: 'Yes', voteCount: 5 }, { id: 'o2', text: 'No', voteCount: 2 }] });

    renderScreen();

    await waitFor(() => expect(screen.getByText('5')).toBeTruthy());
    expect(screen.getByText('2')).toBeTruthy();
  });
});
