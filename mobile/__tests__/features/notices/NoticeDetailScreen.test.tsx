import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoticeDetailScreen } from '../../../src/features/notices/NoticeDetailScreen';
import type { Notice, PaginatedResponse, PollSummary } from '../../../src/api/types';

const mockMarkRead = jest.fn();
let mockNotice: Notice | undefined;
let mockLinkedPolls: PaginatedResponse<PollSummary> | undefined;

jest.mock('../../../src/features/notices/hooks/useNotices', () => ({
  useNotice: () => ({ data: mockNotice, isLoading: false }),
  useMarkNoticeRead: () => ({ mutate: mockMarkRead }),
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
    id: 'n1', societyId: 'soc-1', title: 'AGM Announcement', content: 'Please review the resolutions.',
    category: 'General', postedByUserId: 'admin-1', isArchived: false, isActive: true,
    publishAt: '2026-01-01T00:00:00Z', targetApartmentIds: [], createdAt: '2026-01-01T00:00:00Z',
    isReadByCurrentUser: true,
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
  });

  test('shows a linked-poll banner when a poll references this notice', async () => {
    mockNotice = makeNotice();
    mockLinkedPolls = {
      items: [{ id: 'poll-1', title: 'AGM Resolution Vote', type: 'SingleChoice', opensAt: '2026-01-01T00:00:00Z', closesAt: '2026-01-10T00:00:00Z', status: 'Open', isAgmResolution: true, resultsPublished: false }],
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
});
