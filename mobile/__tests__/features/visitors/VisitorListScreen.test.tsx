import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisitorListScreen } from '../../../src/features/visitors/VisitorListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Visitor } from '../../../src/api/types';

const mockApprove = jest.fn();
const mockDeny = jest.fn();
const mockCheckOut = jest.fn();
const mockCheckInByPass = jest.fn();

const pendingVisitor: Partial<Visitor> = {
  id: 'v1',
  vn: 'Jane Visitor',
  hrn: 'Host Resident',
  hbn: 'A',
  hfn: 1,
  hft: '101',
  aid: 'apt-999',
  pu: 'Delivery',
  st: 'Pending',
};

jest.mock('../../../src/features/visitors/hooks/useVisitors', () => ({
  useVisitorList: () => ({
    data: [pendingVisitor],
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useVisitorDefaultView: () => ({
    data: [pendingVisitor],
    isLoading: false,
    refetch: jest.fn(),
  }),
  useApproveVisitor: () => ({ mutate: mockApprove }),
  useDenyVisitor: () => ({ mutate: mockDeny }),
  useCheckOutVisitor: () => ({ mutate: mockCheckOut }),
  useCheckInVisitorByPass: () => ({ mutateAsync: mockCheckInByPass, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

// useActiveApartment issues a TanStack profile query; mock it to follow the auth
// store's account-level apartmentId so these tests need no QueryClientProvider.
jest.mock('../../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => {
    const { useAuthStore: store } = require('../../../src/store/authStore');
    const user = store.getState().user;
    return {
      apartments: user?.apts ?? [],
      activeApartmentId: user?.aid ?? null,
      activeResidentType: user?.rt,
      setSelectedApartment: jest.fn(),
    };
  },
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <VisitorListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('VisitorListScreen — approve/deny visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('SUAdmin sees Deny but not Approve for a pending visitor not hosted by them', async () => {
    useAuthStore.setState({
      user: { id: 'admin1', sid: 'soc-1', fn: 'Admin', em: 'a@a.com', ph: '1', rl: 'SUAdmin', rt: 'SocietyAdmin', aid: undefined, vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Deny')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  test('SUSecurity sees Deny but not Approve for a pending visitor not hosted by them', async () => {
    useAuthStore.setState({
      user: { id: 'sec1', sid: 'soc-1', fn: 'Guard', em: 'g@a.com', ph: '1', rl: 'SUSecurity', rt: 'SocietyAdmin', aid: undefined, vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Deny')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  test('the host resident sees Approve for their own visitor', async () => {
    useAuthStore.setState({
      user: { id: 'res1', sid: 'soc-1', fn: 'Resident', em: 'r@a.com', ph: '1', rl: 'SUUser', rt: 'Owner', aid: 'apt-999', vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.getByText('Approve')).toBeTruthy();
  });
});

describe('VisitorListScreen — gate pass verification checks the visitor in', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function loginAs(role: string, apartmentId?: string) {
    useAuthStore.setState({
      user: { id: 'u1', sid: 'soc-1', fn: 'User', em: 'u@a.com', ph: '1', rl: role, rt: 'Owner', aid: apartmentId, vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  test('SUSecurity sees the pass-code input and Verify & Check In button', async () => {
    loginAs('SUSecurity');

    renderScreen();

    await waitFor(() => expect(screen.getByPlaceholderText('Visitor pass code')).toBeTruthy());
    expect(screen.getByText('Verify & Check In')).toBeTruthy();
  });

  test('residents do not see the gate verification row', async () => {
    loginAs('SUUser', 'apt-999');

    renderScreen();

    await waitFor(() => expect(screen.getByText('Jane Visitor')).toBeTruthy());
    expect(screen.queryByPlaceholderText('Visitor pass code')).toBeNull();
    expect(screen.queryByText('Verify & Check In')).toBeNull();
  });

  test('verifying a pass checks the visitor in and confirms with an alert', async () => {
    loginAs('SUSecurity');
    mockCheckInByPass.mockResolvedValue({ id: 'v9', vn: 'Jane Visitor', st: 'CheckedIn' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    renderScreen();

    await waitFor(() => expect(screen.getByPlaceholderText('Visitor pass code')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('Visitor pass code'), ' abc123 ');
    fireEvent.press(screen.getByText('Verify & Check In'));

    await waitFor(() => expect(mockCheckInByPass).toHaveBeenCalledWith('abc123'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Pass verified', 'Jane Visitor is checked in.')
    );
    alertSpy.mockRestore();
  });

  test('a failed verification shows the error message', async () => {
    loginAs('SUAdmin');
    mockCheckInByPass.mockRejectedValue(new Error('Invalid or expired pass code'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    renderScreen();

    await waitFor(() => expect(screen.getByPlaceholderText('Visitor pass code')).toBeTruthy());
    fireEvent.changeText(screen.getByPlaceholderText('Visitor pass code'), 'BAD1');
    fireEvent.press(screen.getByText('Verify & Check In'));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('Could not verify the pass', 'Invalid or expired pass code')
    );
    alertSpy.mockRestore();
  });
});
