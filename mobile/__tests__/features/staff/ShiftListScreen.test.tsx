import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ShiftListScreen } from '../../../src/features/staff/ShiftListScreen';
import type { Shift } from '../../../src/api/types';

const mockDelete = jest.fn();
let mockShiftData: Shift[] = [];

jest.mock('../../../src/features/staff/hooks/useStaff', () => ({
  useShifts: () => ({ data: mockShiftData, isLoading: false }),
  useDeleteShift: () => ({ mutate: mockDelete, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeShift(overrides: Partial<Shift>): Shift {
  return {
    id: overrides.id ?? 'sh1',
    societyId: 'soc-1',
    name: overrides.name ?? 'Morning Security',
    startTime: overrides.startTime ?? '08:00:00',
    endTime: overrides.endTime ?? '16:00:00',
    graceMinutes: overrides.graceMinutes ?? 30,
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
        <ShiftListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('ShiftListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShiftData = [];
  });

  test('shows shift name and formatted time range', async () => {
    mockShiftData = [makeShift({ name: 'Morning Security', startTime: '08:00:00', endTime: '16:00:00', graceMinutes: 15 })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('Morning Security')).toBeTruthy());
    expect(screen.getByText('08:00 – 16:00 · 15 min grace')).toBeTruthy();
  });

  test('shows an empty state when no shifts are defined', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByText('No shifts defined yet')).toBeTruthy());
  });

  test('deletes a shift when confirmed', async () => {
    mockShiftData = [makeShift({ id: '1', name: 'Morning Security' })];
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Delete')?.onPress?.();
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Morning Security')).toBeTruthy());
    fireEvent.press(screen.getByText('🗑'));

    expect(mockDelete).toHaveBeenCalledWith('1', expect.anything());
  });

  test('does nothing when the deletion confirmation is cancelled', async () => {
    mockShiftData = [makeShift({ id: '1', name: 'Morning Security' })];
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Morning Security')).toBeTruthy());
    fireEvent.press(screen.getByText('🗑'));

    expect(mockDelete).not.toHaveBeenCalled();
  });
});
