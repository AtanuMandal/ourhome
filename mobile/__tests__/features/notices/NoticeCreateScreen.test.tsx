import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NoticeCreateScreen } from '../../../src/features/notices/NoticeCreateScreen';
import type { Notice } from '../../../src/api/types';

const mockCreateNotice = jest.fn().mockResolvedValue(undefined);
const mockUpdateNotice = jest.fn().mockResolvedValue(undefined);
let mockNotice: Notice | undefined;

jest.mock('../../../src/features/notices/hooks/useNotices', () => ({
  useCreateNotice: () => ({ mutateAsync: mockCreateNotice, isPending: false }),
  useUpdateNotice: () => ({ mutateAsync: mockUpdateNotice, isPending: false }),
  useNotice: () => ({ data: mockNotice, isLoading: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeNotice(overrides: Partial<Notice> = {}): Notice {
  return {
    id: 'n1', societyId: 'soc-1', title: 'Old Title', content: 'Old Content',
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

function renderScreen(id?: string) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <NoticeCreateScreen route={id ? { params: { id } } : undefined} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('NoticeCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotice = undefined;
  });

  test('create mode: posts a new notice with category and publish date fields visible', async () => {
    renderScreen();

    const postNoticeLabels = screen.getAllByText('Post Notice');
    expect(postNoticeLabels.length).toBeGreaterThan(0);
    expect(screen.getByText('Category *')).toBeTruthy();
    expect(screen.getByText('Publish Date (optional)')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Notice title'), 'New Title');
    fireEvent.changeText(screen.getByPlaceholderText('Notice details...'), 'New Content');
    fireEvent.press(postNoticeLabels[postNoticeLabels.length - 1]);

    await waitFor(() => expect(mockCreateNotice).toHaveBeenCalled());
    expect(mockUpdateNotice).not.toHaveBeenCalled();
  });

  test('edit mode: pre-fills the form and hides category/publish-date fields', async () => {
    mockNotice = makeNotice();
    renderScreen('n1');

    await waitFor(() => expect(screen.getByDisplayValue('Old Title')).toBeTruthy());
    expect(screen.getByDisplayValue('Old Content')).toBeTruthy();
    expect(screen.queryByText('Category *')).toBeNull();
    expect(screen.queryByText('Publish Date (optional)')).toBeNull();
  });

  test('edit mode: calls updateNotice (not createNotice) on save', async () => {
    mockNotice = makeNotice();
    renderScreen('n1');

    await waitFor(() => expect(screen.getByDisplayValue('Old Title')).toBeTruthy());
    fireEvent.changeText(screen.getByDisplayValue('Old Title'), 'Updated Title');
    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateNotice).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated Title' })
    ));
    expect(mockCreateNotice).not.toHaveBeenCalled();
  });
});
