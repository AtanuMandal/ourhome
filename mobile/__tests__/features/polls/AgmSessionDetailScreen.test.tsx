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
    id: overrides.id ?? 'r1', tt: overrides.tt ?? 'Resolution 1', ds: 'desc',
    ty: 'SingleChoice', op: [{ id: 'o1', tx: 'Yes' }, { id: 'o2', tx: 'No' }],
    oa: '2026-01-01T00:00:00Z', ca: '2026-01-10T00:00:00Z',
    ta: 'FullSociety', tbn: [],
    agm: true, avc: true, st: overrides.st ?? 'Open',
    rp: overrides.rp ?? false,
    hv: false,
    ...overrides,
  };
}

function makeSession(resolutions: Poll[]): AgmSessionDetail {
  return {
    id: 's1', tt: 'AGM 2026', ds: 'Yearly resolutions',
    sd: '2026-04-15T10:00:00Z',
    r: resolutions,
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
      user: { id: 'viewer1', sid: 'soc-1', fn: 'Viewer', em: 'v@a.com', ph: '1', rl: role, rt: 'Owner', aid: 'apt-1', vf: true, ac: true },
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
    mockSession = makeSession([makeResolution({ id: 'r1', tt: 'Resolution 1' })]);

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
    mockSession = makeSession([makeResolution({ id: 'r1', st: 'Closed', rp: false })]);

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
    mockSession = makeSession([makeResolution({ id: 'r1', ta: 'PerBlock', tbn: ['BLOCK A'] })]);

    renderScreen();

    await waitFor(() => expect(screen.getByText(/Target: Block: BLOCK A/)).toBeTruthy());
  });
});
