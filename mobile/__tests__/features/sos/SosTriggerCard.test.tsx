import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { SosTriggerCard } from '../../../src/features/sos/SosTriggerCard';
import { useAuthStore } from '../../../src/store/authStore';
import type { SosAlert } from '../../../src/api/types';

const mockTriggerMutate = jest.fn();
const mockFalseAlarmMutate = jest.fn();
let mockActiveAlert: SosAlert | undefined;

jest.mock('../../../src/features/sos/hooks/useSos', () => ({
  useTriggerSosAlert: () => ({ mutate: mockTriggerMutate, isPending: false }),
  useMarkSosAlertFalseAlarm: () => ({ mutate: mockFalseAlarmMutate, isPending: false }),
  useSosAlert: () => ({ data: mockActiveAlert }),
}));

function makeAlert(overrides: Partial<SosAlert> = {}): SosAlert {
  return {
    id: 'alert-1',
    al: 'A-101',
    un: 'Jane Resident',
    cat: 'Fire',
    st: 'Triggered',
    ta: '2026-01-01T00:00:00Z',
    ec: 0,
    ...overrides,
  };
}

describe('SosTriggerCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveAlert = undefined;
    useAuthStore.setState({
      user: { id: 'user-1', societyId: 'soc-1', fullName: 'Jane Resident', email: 'j@a.com', phone: '1', role: 'SUUser', residentType: 'Owner', apartmentId: 'apt-1', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('shows the SOS button when there is no active alert', () => {
    render(<SosTriggerCard />);
    expect(screen.getByText('SOS')).toBeTruthy();
  });

  test('opens the confirmation dialog on tap', () => {
    render(<SosTriggerCard />);

    fireEvent.press(screen.getByText('SOS'));

    expect(screen.getByText('Raise an SOS Alert')).toBeTruthy();
    expect(screen.getByText('Trigger SOS')).toBeTruthy();
  });

  test('triggers an alert with the selected category and note', async () => {
    mockTriggerMutate.mockImplementation((_data, { onSuccess }) => onSuccess(makeAlert()));

    render(<SosTriggerCard />);
    fireEvent.press(screen.getByText('SOS'));
    fireEvent.press(screen.getByText('Medical'));
    fireEvent.changeText(screen.getByPlaceholderText('Anything responders should know right away'), 'Chest pain');
    fireEvent.press(screen.getByText('Trigger SOS'));

    expect(mockTriggerMutate).toHaveBeenCalledWith(
      { category: 'Medical', note: 'Chest pain' },
      expect.anything()
    );
  });

  test('shows the active alert status once triggered', async () => {
    mockActiveAlert = makeAlert({ st: 'Acknowledged', aun: 'Guard' });

    render(<SosTriggerCard />);
    fireEvent.press(screen.getByText('SOS'));
    mockTriggerMutate.mockImplementation((_data, { onSuccess }) => onSuccess(makeAlert()));
    fireEvent.press(screen.getByText('Trigger SOS'));

    await waitFor(() => expect(screen.getByText(/Acknowledged by Guard/)).toBeTruthy());
  });

  test('marking a false alarm calls the mutation', async () => {
    mockActiveAlert = makeAlert({ st: 'Triggered' });
    mockTriggerMutate.mockImplementation((_data, { onSuccess }) => onSuccess(makeAlert()));

    render(<SosTriggerCard />);
    fireEvent.press(screen.getByText('SOS'));
    fireEvent.press(screen.getByText('Trigger SOS'));

    await waitFor(() => expect(screen.getByText('False Alarm')).toBeTruthy());
    fireEvent.press(screen.getByText('False Alarm'));

    expect(mockFalseAlarmMutate).toHaveBeenCalledWith('alert-1', expect.anything());
  });
});
