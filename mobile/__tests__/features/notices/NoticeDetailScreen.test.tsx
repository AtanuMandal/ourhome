import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoticeDetailScreen } from '../../../src/features/notices/NoticeDetailScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Notice, PaginatedResponse, PollSummary } from '../../../src/api/types';
import type { NoticeReadReceipts } from '../../../src/api/endpoints/notices';

function setUser(role: 'SUAdmin' | 'SUUser') {
  useAuthStore.setState({
    user: { id: 'u1', sid: 'soc-1', fn: 'Test User', em: 'user@test.com', ph: '9000000000',
      rl: role, rt: 'Owner', aid: 'apt-1', vf: true, ac: true },
    token: 'token',
    isAuthenticated: true,
  });
}

const mockMarkRead = jest.fn();
const mockUseNoticeReadReceipts = jest.fn();
let mockNotice: Notice | undefined;
let mockLinkedPolls: PaginatedResponse<PollSummary> | undefined;
let mockReadReceipts: NoticeReadReceipts | undefined;

jest.mock('../../../src/features/notices/hooks/useNotices', () => ({
  useNotice: () => ({ data: mockNotice, isLoading: false }),
  useMarkNoticeRead: () => ({ mutate: mockMarkRead }),
  useNoticeReadReceipts: (...args: unknown[]) => {
    mockUseNoticeReadReceipts(...args);
    return { data: mockReadReceipts, isLoading: false };
  },
}));

jest.mock('../../../src/features/polls/hooks/usePolls', () => ({
  usePollsByLinkedNotice: () => ({ data: mockLinkedPolls }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeNotice(overrides: Partial<Notice> = {}): Notice {
  return {
    id: 'n1', tt: 'AGM Announcement', ct: 'Please review the resolutions.',
    cat: 'General', pid: 'admin-1',
    pa: '2026-01-01T00:00:00Z',
    rd: true,
    ...overrides,
  } as Notice;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <NoticeDetailScreen route={{ params: { id: 'n1' } }} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('NoticeDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotice = undefined;
    mockLinkedPolls = undefined;
    mockReadReceipts = undefined;
  });

  test('shows a linked-poll banner when a poll references this notice', async () => {
    mockNotice = makeNotice();
    mockLinkedPolls = {
      items: [{ id: 'poll-1', tt: 'AGM Resolution Vote', ty: 'SingleChoice', ca: '2026-01-10T00:00:00Z', st: 'Open', agm: true }],
      total: 1, page: 1, pageSize: 1,
    };

    renderScreen();

    await waitFor(() => expect(screen.getByText(/AGM Resolution Vote/)).toBeTruthy());
  });

  test('shows no banner when no poll is linked to this notice', async () => {
    mockNotice = makeNotice();
    mockLinkedPolls = { items: [], total: 0, page: 1, pageSize: 1 };

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM Announcement')).toBeTruthy());
    expect(screen.queryByText(/associated poll/)).toBeNull();
  });

  test('shows an Edit action for SUAdmin', async () => {
    setUser('SUAdmin');
    mockNotice = makeNotice();
    mockLinkedPolls = { items: [], total: 0, page: 1, pageSize: 1 };

    renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Edit notice')).toBeTruthy());
  });

  test('hides the Edit action for a resident', async () => {
    setUser('SUUser');
    mockNotice = makeNotice();
    mockLinkedPolls = { items: [], total: 0, page: 1, pageSize: 1 };

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM Announcement')).toBeTruthy());
    expect(screen.queryByLabelText('Edit notice')).toBeNull();
  });

  test('hides the Read report action for a resident', async () => {
    setUser('SUUser');
    mockNotice = makeNotice();
    mockLinkedPolls = { items: [], total: 0, page: 1, pageSize: 1 };

    renderScreen();

    await waitFor(() => expect(screen.getByText('AGM Announcement')).toBeTruthy());
    expect(screen.queryByLabelText('Read report')).toBeNull();
  });

  test('shows the read/unread report for SUAdmin when toggled', async () => {
    setUser('SUAdmin');
    mockNotice = makeNotice();
    mockLinkedPolls = { items: [], total: 0, page: 1, pageSize: 1 };
    mockReadReceipts = {
      read: [{ userId: 'u1', fullName: 'Alice Resident' }],
      unread: [{ userId: 'u2', fullName: 'Bob Resident' }],
    };

    renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Read report')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Read report'));

    await waitFor(() => expect(screen.getByText(/Alice Resident/)).toBeTruthy());
    expect(screen.getByText(/Bob Resident/)).toBeTruthy();
  });
});
