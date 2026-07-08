import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { PollFormScreen } from '../../../src/features/polls/PollFormScreen';

const mockCreateMutate = jest.fn();

jest.mock('../../../src/features/polls/hooks/usePolls', () => ({
  useCreatePoll: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen(agmSessionId?: string) {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <PollFormScreen route={agmSessionId ? { params: { agmSessionId } } : undefined} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('PollFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('validates that a title is required before creating', async () => {
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('2026-07-10T09:00'), '2026-07-10T09:00');
    fireEvent.changeText(screen.getByPlaceholderText('2026-07-17T09:00'), '2026-07-17T09:00');
    fireEvent.press(screen.getAllByText('Create Poll').at(-1)!);

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Title is required.'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  test('creates a poll with parsed options and default Yes/No', async () => {
    mockCreateMutate.mockResolvedValue(undefined);
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('Repaint the gate?'), 'Repaint the gate?');
    fireEvent.changeText(screen.getByPlaceholderText('2026-07-10T09:00'), '2026-07-10T09:00');
    fireEvent.changeText(screen.getByPlaceholderText('2026-07-17T09:00'), '2026-07-17T09:00');
    fireEvent.press(screen.getAllByText('Create Poll').at(-1)!);

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled());
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Repaint the gate?',
      options: ['Yes', 'No'],
    }));
  });

  test('includes the agmSessionId from the route param when creating a resolution', async () => {
    mockCreateMutate.mockResolvedValue(undefined);
    renderScreen('agm-1');

    fireEvent.changeText(screen.getByPlaceholderText('Repaint the gate?'), 'Resolution 1');
    fireEvent.changeText(screen.getByPlaceholderText('2026-07-10T09:00'), '2026-07-10T09:00');
    fireEvent.changeText(screen.getByPlaceholderText('2026-07-17T09:00'), '2026-07-17T09:00');
    fireEvent.press(screen.getAllByText('Create Poll').at(-1)!);

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled());
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({ agmSessionId: 'agm-1' }));
  });
});
