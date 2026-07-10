import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaintenanceScreen } from '../../../src/features/maintenance/MaintenanceScreen';
import { maintenanceApi } from '../../../src/api/endpoints/maintenance';
import { pickImage } from '../../../src/camera/ImagePicker';
import type { MaintenanceCharge } from '../../../src/api/types';

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
        <MaintenanceScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const mockSubmitProof = jest.fn();
let mockCharges: MaintenanceCharge[] = [];

jest.mock('../../../src/shared/hooks/useSocietyId', () => ({
  useSocietyId: () => 'soc-1',
}));

jest.mock('../../../src/features/maintenance/hooks/useMaintenance', () => ({
  useMaintenanceList: () => ({
    data: mockCharges,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useSubmitPaymentProof: () => ({ mutate: mockSubmitProof, isPending: false }),
}));

jest.mock('../../../src/api/endpoints/maintenance', () => ({
  maintenanceApi: {
    uploadPaymentProof: jest.fn(),
  },
}));

jest.mock('../../../src/camera/ImagePicker', () => ({
  pickImage: jest.fn(),
}));

jest.mock('../../../src/camera/imageUpload', () => ({
  resolveFileUrl: (path: string) => `https://fake-storage/${path}`,
}));

function makeCharge(overrides: Partial<MaintenanceCharge> = {}): MaintenanceCharge {
  return {
    id: 'charge-1',
    societyId: 'soc-1',
    apartmentId: 'apt-1',
    apartmentNumber: 'A-101',
    scheduleId: 'sched-1',
    scheduleName: 'Monthly Maintenance',
    chargeYear: 2026,
    chargeMonth: 7,
    amount: 5000,
    status: 'Pending',
    dueDate: '2026-07-05T00:00:00Z',
    isOverdue: false,
    proofs: [],
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('MaintenanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCharges = [];
  });

  test('renders charges in the list', () => {
    mockCharges = [makeCharge()];
    renderScreen();

    expect(screen.getByText('A-101')).toBeTruthy();
  });

  test('shows the proof-submission form when a selectable charge exists', () => {
    mockCharges = [makeCharge({ status: 'Pending' })];
    renderScreen();

    expect(screen.getByText('Submit payment proof')).toBeTruthy();
    expect(screen.getByText('Include in proof submission')).toBeTruthy();
  });

  test('does not show the proof-submission form or checkbox when no charge is selectable', () => {
    mockCharges = [makeCharge({ status: 'Paid' })];
    renderScreen();

    expect(screen.queryByText('Submit payment proof')).toBeNull();
    expect(screen.queryByText('Include in proof submission')).toBeNull();
  });

  test('a ProofSubmitted charge is not selectable either', () => {
    mockCharges = [makeCharge({ status: 'ProofSubmitted' })];
    renderScreen();

    expect(screen.queryByText('Include in proof submission')).toBeNull();
  });

  test('picking a proof photo uploads it and shows a preview', async () => {
    mockCharges = [makeCharge()];
    (pickImage as jest.Mock).mockResolvedValue('file://photo.jpg');
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockResolvedValue({ fileName: 'receipt.jpg', fileUrl: 'files/proofs/receipt.jpg' });

    renderScreen();
    fireEvent.press(screen.getByText('Pick proof photo'));

    await waitFor(() => expect(maintenanceApi.uploadPaymentProof).toHaveBeenCalledWith('soc-1', 'file://photo.jpg'));
    expect(await screen.findByText('receipt.jpg')).toBeTruthy();
  });

  test('submitting proof requires at least one selected charge and an uploaded proof', async () => {
    mockCharges = [makeCharge()];
    (pickImage as jest.Mock).mockResolvedValue('file://photo.jpg');
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockResolvedValue({ fileName: 'receipt.jpg', fileUrl: 'files/proofs/receipt.jpg' });

    renderScreen();

    fireEvent.press(screen.getByText('Include in proof submission'));
    fireEvent.press(screen.getByText('Pick proof photo'));
    await screen.findByText('receipt.jpg');

    fireEvent.press(screen.getByText('Submit proof for 1 charge'));

    expect(mockSubmitProof).toHaveBeenCalledWith(
      { chargeIds: ['charge-1'], proofUrl: 'files/proofs/receipt.jpg', notes: undefined },
      expect.anything()
    );
  });

  test('shows an alert when the proof upload fails', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCharges = [makeCharge()];
    (pickImage as jest.Mock).mockResolvedValue('file://photo.jpg');
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockRejectedValue(new Error('network error'));

    renderScreen();
    fireEvent.press(screen.getByText('Pick proof photo'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not upload proof', expect.any(String)));
  });
});
