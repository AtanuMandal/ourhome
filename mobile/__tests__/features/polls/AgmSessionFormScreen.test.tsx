import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { AgmSessionFormScreen } from '../../../src/features/polls/AgmSessionFormScreen';

const mockCreateMutate = jest.fn();

jest.mock('../../../src/features/polls/hooks/useAgmSessions', () => ({
  useCreateAgmSession: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
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
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <AgmSessionFormScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('AgmSessionFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('validates that a title is required before creating', async () => {
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('2026-04-15T10:00'), '2026-04-15T10:00');
    fireEvent.press(screen.getByText('Create Session'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Title is required.'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  test('creates a session with the entered details', async () => {
    mockCreateMutate.mockResolvedValue({ id: 'new-session' });
    renderScreen();

    fireEvent.changeText(screen.getByPlaceholderText('AGM 2026'), 'AGM 2026');
    fireEvent.changeText(screen.getByPlaceholderText('2026-04-15T10:00'), '2026-04-15T10:00');
    fireEvent.press(screen.getByText('Create Session'));

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled());
    expect(mockCreateMutate).toHaveBeenCalledWith(expect.objectContaining({ title: 'AGM 2026' }));
  });
});
