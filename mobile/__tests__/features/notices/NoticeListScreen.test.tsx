import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoticeListScreen } from '../../../src/features/notices/NoticeListScreen';
import type { Notice } from '../../../src/api/types';

const mockMarkRead = jest.fn();
let mockNotices: Notice[] = [];

jest.mock('../../../src/features/notices/hooks/useNotices', () => ({
  useNoticeList: () => ({
    data: mockNotices,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useMarkNoticeRead: () => ({ mutate: mockMarkRead }),
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
    rd: false,
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
        <NoticeListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('NoticeListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotices = [];
  });

  test('shows a green read tick and no mark-read button for a read notice', () => {
    mockNotices = [makeNotice({ rd: true })];
    renderScreen();

    expect(screen.getByLabelText('Read')).toBeTruthy();
    expect(screen.queryByLabelText('Mark as read')).toBeNull();
  });

  test('shows a mark-read button (no unmark option) for an unread notice', () => {
    mockNotices = [makeNotice({ rd: false })];
    renderScreen();

    expect(screen.getByLabelText('Mark as read')).toBeTruthy();
    expect(screen.queryByLabelText('Read')).toBeNull();
  });

  test('tapping mark-read calls the one-way mark-read mutation', () => {
    mockNotices = [makeNotice({ rd: false })];
    renderScreen();

    fireEvent.press(screen.getByLabelText('Mark as read'), { stopPropagation: jest.fn() });

    expect(mockMarkRead).toHaveBeenCalledWith('n1');
  });
});
