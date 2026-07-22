import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaintenanceScreen } from '../../../src/features/maintenance/MaintenanceScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { maintenanceApi } from '../../../src/api/endpoints/maintenance';
import { pickImageFile } from '../../../src/camera/ImagePicker';
import { pickProofDocument } from '../../../src/camera/DocumentPicker';
import { viewRemoteFile } from '../../../src/camera/fileViewer';
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <MaintenanceScreen />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const mockSubmitProof = jest.fn();
let mockCharges: MaintenanceCharge[] = [];

jest.mock('../../../src/shared/hooks/useSocietyId', () => ({
  useSocietyId: () => 'soc-1',
}));

// Capture the arguments the screen passes so tests can assert the apartment scoping.
const mockUseMaintenanceList = jest.fn(() => ({
  data: mockCharges,
  isLoading: false,
  fetchNextPage: jest.fn(),
  hasNextPage: false,
  refetch: jest.fn(),
}));

jest.mock('../../../src/features/maintenance/hooks/useMaintenance', () => ({
  useMaintenanceList: (...args: unknown[]) => mockUseMaintenanceList(...(args as [])),
  useSubmitPaymentProof: () => ({ mutate: mockSubmitProof, isPending: false }),
}));

// The screen resolves the resident's apartment via useActiveApartment, which fetches the
// full profile — stub it so no network is attempted and the apartment list is deterministic.
jest.mock('../../../src/api/endpoints/profile', () => ({
  profileApi: {
    getProfile: jest.fn().mockResolvedValue({
      id: 'u1', sid: 'soc-1',
      apts: [{ aid: 'apt-1', nm: 'A 1-101', rt: 'Owner' }],
    }),
  },
}));

jest.mock('../../../src/api/endpoints/maintenance', () => ({
  maintenanceApi: {
    uploadPaymentProof: jest.fn(),
    approveProof: jest.fn(),
    markPaid: jest.fn(),
    denyProof: jest.fn(),
    approveProofGroup: jest.fn(),
    denyProofGroup: jest.fn(),
  },
}));

jest.mock('../../../src/camera/ImagePicker', () => ({
  pickImageFile: jest.fn(),
}));

jest.mock('../../../src/camera/DocumentPicker', () => ({
  pickProofDocument: jest.fn(),
}));

jest.mock('../../../src/camera/fileViewer', () => ({
  viewRemoteFile: jest.fn(),
}));

jest.mock('../../../src/camera/imageUpload', () => ({
  resolveFileUrl: (path: string) => `https://fake-storage/${path}`,
}));

function makeCharge(overrides: Partial<MaintenanceCharge> = {}): MaintenanceCharge {
  return {
    id: 'charge-1',
    aid: 'apt-1',
    anm: 'A-101',
    sid: 'sched-1',
    snm: 'Monthly Maintenance',
    cy: 2026,
    cm: 7,
    amt: 5000,
    st: 'Pending',
    dd: '2026-07-05T00:00:00Z',
    ov: false,
    pf: [],
    ...overrides,
  };
}

function loginAs(role: string, apartmentId?: string): void {
  useAuthStore.setState({
    user: {
      id: 'u1', sid: 'soc-1', fn: 'User', em: 'u@a.com', ph: '1',
      rl: role as never, rt: 'Owner' as never, aid: apartmentId,
      vf: true, ac: true,
    },
    token: 'tok',
    isAuthenticated: true,
  });
}

describe('MaintenanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCharges = [];
    loginAs('SUUser', 'apt-1');
  });

  // The backend rejects charge listings from non-admins that aren't scoped to an apartment
  // ("Residents must request maintenance charges for their apartment"), so the resident's
  // apartment id must always ride along as a query parameter.
  test('a resident (SUUser) always passes their apartmentId to the charge query', () => {
    renderScreen();

    expect(mockUseMaintenanceList).toHaveBeenCalledWith(
      'soc-1',
      expect.objectContaining({ apartmentId: 'apt-1' }),
      true
    );
  });

  test('a resident with a status filter passes both status and apartmentId', () => {
    mockCharges = [makeCharge()];
    renderScreen();

    fireEvent.press(screen.getByText('Paid'));

    expect(mockUseMaintenanceList).toHaveBeenLastCalledWith(
      'soc-1',
      expect.objectContaining({ status: 'Paid', apartmentId: 'apt-1' }),
      true
    );
  });

  test('SUAdmin lists charges society-wide without an apartmentId filter', () => {
    loginAs('SUAdmin');
    renderScreen();

    expect(mockUseMaintenanceList).toHaveBeenCalledWith('soc-1', undefined, true);
  });

  test('the charge query stays disabled for a resident whose apartment is not yet known', () => {
    loginAs('SUUser', undefined);
    renderScreen();

    expect(mockUseMaintenanceList).toHaveBeenCalledWith('soc-1', undefined, false);
  });

  test('renders charges in the list', () => {
    mockCharges = [makeCharge()];
    renderScreen();

    expect(screen.getByText('A-101')).toBeTruthy();
  });

  test('shows the proof-submission form when a selectable charge exists', () => {
    mockCharges = [makeCharge({ st: 'Pending' })];
    renderScreen();

    expect(screen.getByText('Submit payment proof')).toBeTruthy();
    expect(screen.getByText('Include in proof submission')).toBeTruthy();
  });

  test('does not show the proof-submission form or checkbox when no charge is selectable', () => {
    mockCharges = [makeCharge({ st: 'Paid' })];
    renderScreen();

    expect(screen.queryByText('Submit payment proof')).toBeNull();
    expect(screen.queryByText('Include in proof submission')).toBeNull();
  });

  test('a ProofSubmitted charge is not selectable either', () => {
    mockCharges = [makeCharge({ st: 'ProofSubmitted' })];
    renderScreen();

    expect(screen.queryByText('Include in proof submission')).toBeNull();
  });

  test('picking a proof photo uploads it and shows a preview', async () => {
    mockCharges = [makeCharge()];
    (pickImageFile as jest.Mock).mockResolvedValue({ uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' });
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockResolvedValue({ fn: 'receipt.jpg', fu: 'files/proofs/receipt.jpg' });

    renderScreen();
    fireEvent.press(screen.getByText('Pick proof photo'));

    await waitFor(() =>
      expect(maintenanceApi.uploadPaymentProof).toHaveBeenCalledWith('soc-1', {
        uri: 'file://photo.jpg',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      })
    );
    expect(await screen.findByText('receipt.jpg')).toBeTruthy();
  });

  test('picking a proof document uploads it and shows a file-type thumbnail', async () => {
    mockCharges = [makeCharge()];
    (pickProofDocument as jest.Mock).mockResolvedValue({ uri: 'file://receipt.pdf', name: 'receipt.pdf', mimeType: 'application/pdf' });
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockResolvedValue({ fn: 'receipt.pdf', fu: 'files/proofs/receipt.pdf' });

    renderScreen();
    fireEvent.press(screen.getByText('Pick proof document'));

    await waitFor(() =>
      expect(maintenanceApi.uploadPaymentProof).toHaveBeenCalledWith('soc-1', {
        uri: 'file://receipt.pdf',
        name: 'receipt.pdf',
        mimeType: 'application/pdf',
      })
    );
    expect(await screen.findByText('receipt.pdf')).toBeTruthy();
    expect(await screen.findByText('PDF')).toBeTruthy();
  });

  test('tapping a non-image proof thumbnail downloads and opens it', async () => {
    mockCharges = [makeCharge({ pf: [{ pu: 'files/proofs/receipt.pdf', sa: '2026-07-02T00:00:00Z' }] })];
    (viewRemoteFile as jest.Mock).mockResolvedValue(undefined);

    renderScreen();
    fireEvent.press(screen.getByLabelText('View proof file'));

    await waitFor(() => expect(viewRemoteFile).toHaveBeenCalledWith('files/proofs/receipt.pdf', 'proof.pdf'));
  });

  test('shows an alert when opening a non-image proof fails', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCharges = [makeCharge({ pf: [{ pu: 'files/proofs/receipt.pdf', sa: '2026-07-02T00:00:00Z' }] })];
    (viewRemoteFile as jest.Mock).mockRejectedValue(new Error('network error'));

    renderScreen();
    fireEvent.press(screen.getByLabelText('View proof file'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not open file', expect.any(String)));
  });

  test('an image proof renders inline instead of a file-type tile', () => {
    mockCharges = [makeCharge({ pf: [{ pu: 'files/proofs/receipt.jpg', sa: '2026-07-02T00:00:00Z' }] })];
    renderScreen();

    expect(screen.queryByLabelText('View proof file')).toBeNull();
  });

  test('submitting proof requires at least one selected charge and an uploaded proof', async () => {
    mockCharges = [makeCharge()];
    (pickImageFile as jest.Mock).mockResolvedValue({ uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' });
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockResolvedValue({ fn: 'receipt.jpg', fu: 'files/proofs/receipt.jpg' });

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
    (pickImageFile as jest.Mock).mockResolvedValue({ uri: 'file://photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg' });
    (maintenanceApi.uploadPaymentProof as jest.Mock).mockRejectedValue(new Error('network error'));

    renderScreen();
    fireEvent.press(screen.getByText('Pick proof photo'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Could not upload proof', expect.any(String)));
  });
});

describe('MaintenanceScreen — clubbed submissions (grouping, approve, deny)', () => {
  function makeProof(overrides: Partial<{ proofUrl: string; submittedAt: string }> = {}) {
    return {
      pu: overrides.proofUrl ?? 'files/proofs/receipt.jpg',
      sa: overrides.submittedAt ?? '2026-07-02T00:00:00Z',
    };
  }

  // Apr + May + Jun clubbed into one submission for the same apartment. submissionGroupId is a
  // top-level field on the charge (the backend projects it from the latest proof's group id) —
  // that's what the screen's grouping predicate reads, not proofs[].submissionGroupId directly.
  function makeClubbedCharges(): MaintenanceCharge[] {
    return [
      makeCharge({ id: 'charge-apr', cm: 4, st: 'ProofSubmitted', pf: [makeProof()], sgi: 'group-1' }),
      makeCharge({ id: 'charge-may', cm: 5, st: 'ProofSubmitted', pf: [makeProof()], sgi: 'group-1' }),
      makeCharge({ id: 'charge-jun', cm: 6, st: 'ProofSubmitted', pf: [makeProof()], sgi: 'group-1' }),
    ];
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockCharges = [];
    loginAs('SUAdmin');
  });

  test('clusters charges sharing an apartment and submissionGroupId into one clubbed card', async () => {
    mockCharges = makeClubbedCharges();
    renderScreen();

    await waitFor(() => expect(screen.getByText('Clubbed payment proof submissions')).toBeTruthy());
    expect(screen.getAllByText('A-101').length).toBeGreaterThan(0);
    expect(screen.getByText(/3 charges/)).toBeTruthy();
  });

  test('does not show the clubbed section for a lone submission', () => {
    mockCharges = [makeCharge({ id: 'charge-solo', st: 'ProofSubmitted', pf: [makeProof()], sgi: 'group-solo' })];
    renderScreen();

    expect(screen.queryByText('Clubbed payment proof submissions')).toBeNull();
  });

  test('a grouped charge shows a note instead of its own admin action buttons', () => {
    mockCharges = makeClubbedCharges();
    renderScreen();

    // Only the group card's Approve/Deny render — no per-charge duplicates for grouped members.
    expect(screen.getAllByText('Part of a clubbed submission — review it above.')).toHaveLength(3);
    expect(screen.queryByText('Approve proof')).toBeNull();
  });

  test('approving the group calls approveProofGroup with every member charge id', async () => {
    mockCharges = makeClubbedCharges();
    (maintenanceApi.approveProofGroup as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => expect(screen.getByText('Clubbed payment proof submissions')).toBeTruthy());
    fireEvent.press(screen.getByText('Approve'));

    await waitFor(() =>
      expect(maintenanceApi.approveProofGroup).toHaveBeenCalledWith(
        'soc-1',
        expect.arrayContaining(['charge-apr', 'charge-may', 'charge-jun']),
        expect.objectContaining({ paymentMethod: 'Offline' })
      )
    );
  });

  test('denying the group opens the reason dialog and calls denyProofGroup with every member id', async () => {
    mockCharges = makeClubbedCharges();
    (maintenanceApi.denyProofGroup as jest.Mock).mockResolvedValue([]);
    renderScreen();

    await waitFor(() => expect(screen.getByText('Clubbed payment proof submissions')).toBeTruthy());
    fireEvent.press(screen.getByText('Deny'));

    expect(screen.getByText('Deny payment proof')).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText('Reason for denial'), 'Total does not match receipt.');
    fireEvent.press(screen.getByLabelText('Confirm deny'));

    await waitFor(() =>
      expect(maintenanceApi.denyProofGroup).toHaveBeenCalledWith(
        'soc-1',
        expect.arrayContaining(['charge-apr', 'charge-may', 'charge-jun']),
        'Total does not match receipt.'
      )
    );
  });

  test('denying a single ungrouped charge calls denyProof with its id and reason', async () => {
    mockCharges = [makeCharge({ id: 'charge-solo', st: 'ProofSubmitted' })];
    (maintenanceApi.denyProof as jest.Mock).mockResolvedValue({});
    renderScreen();

    fireEvent.press(screen.getByText('Deny'));
    fireEvent.changeText(screen.getByPlaceholderText('Reason for denial'), 'Blurry screenshot.');
    fireEvent.press(screen.getByLabelText('Confirm deny'));

    await waitFor(() => expect(maintenanceApi.denyProof).toHaveBeenCalledWith('soc-1', 'charge-solo', 'Blurry screenshot.'));
  });

  test('the deny confirm button stays disabled until a reason is entered', () => {
    mockCharges = [makeCharge({ id: 'charge-solo', st: 'ProofSubmitted' })];
    renderScreen();

    fireEvent.press(screen.getByText('Deny'));
    fireEvent.press(screen.getByLabelText('Confirm deny'));

    expect(maintenanceApi.denyProof).not.toHaveBeenCalled();
  });

  test('a Rejected charge shows the denial reason', () => {
    mockCharges = [makeCharge({ id: 'charge-rejected', st: 'Rejected', rr: 'Amount mismatch.' })];
    renderScreen();

    expect(screen.getByText('Denied: Amount mismatch.')).toBeTruthy();
  });

  // Regression for "once resubmitted, SUAdmin cannot view/approve/deny it": a charge that was
  // Rejected and then resubmitted comes back as a solo ProofSubmitted charge carrying a fresh
  // submissionGroupId it doesn't share with anything else. It must render the normal Approve/Deny
  // buttons — not the "part of a clubbed submission" note that only applies to actual 2+ groups.
  test('a resubmitted charge (Rejected then re-proofed) shows normal Approve/Deny, not the clubbed note', async () => {
    mockCharges = [makeCharge({
      id: 'charge-resubmitted',
      st: 'ProofSubmitted',
      rr: null,
      pf: [makeProof()],
      sgi: 'group-fresh',
    })];
    renderScreen();

    expect(screen.queryByText('Clubbed payment proof submissions')).toBeNull();
    expect(screen.queryByText('Part of a clubbed submission — review it above.')).toBeNull();
    expect(screen.getByText('Approve proof')).toBeTruthy();
    expect(screen.getByText('Deny')).toBeTruthy();

    fireEvent.press(screen.getByText('Approve proof'));
    await waitFor(() =>
      expect(maintenanceApi.approveProof).toHaveBeenCalledWith(
        'soc-1',
        'charge-resubmitted',
        expect.objectContaining({ paymentMethod: 'Offline' })
      )
    );
  });
});
