import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SosAlertListScreen } from '../../../src/features/sos/SosAlertListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { SosAlert } from '../../../src/api/types';

const mockAcknowledge = jest.fn();
const mockResolve = jest.fn();
let mockAlertData: SosAlert[] = [];

jest.mock('../../../src/features/sos/hooks/useSos', () => ({
  useSosAlertList: () => ({
    data: mockAlertData,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useAcknowledgeSosAlert: () => ({ mutate: mockAcknowledge, isPending: false }),
  useResolveSosAlert: () => ({ mutate: mockResolve, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeAlert(overrides: Partial<SosAlert>): SosAlert {
  return {
    id: overrides.id ?? 'a1',
    al: 'A-101',
    un: 'Jane Resident',
    cat: 'Fire',
    st: 'Triggered',
    ta: '2026-01-01T00:00:00Z',
    ec: 0,
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
        <SosAlertListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('SosAlertListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertData = [];
  });

  function setUser(role: 'SUAdmin' | 'SUSecurity' | 'SUUser') {
    useAuthStore.setState({
      user: { id: 'viewer1', sid: 'soc-1', fn: 'Viewer', em: 'v@a.com', ph: '1', rl: role, rt: 'SocietyAdmin', aid: undefined, vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  test('shows Acknowledge and Resolve for a triggered alert', async () => {
    setUser('SUSecurity');
    mockAlertData = [makeAlert({ id: '1', al: 'A-101' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    expect(screen.getByText('Acknowledge')).toBeTruthy();
    expect(screen.getByText('Resolve')).toBeTruthy();
  });

  test('does not show Acknowledge for an already-acknowledged alert', async () => {
    setUser('SUSecurity');
    mockAlertData = [makeAlert({ id: '1', st: 'Acknowledged' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    expect(screen.queryByText('Acknowledge')).toBeNull();
    expect(screen.getByText('Resolve')).toBeTruthy();
  });

  test('tapping Acknowledge calls the mutation with the alert id', async () => {
    setUser('SUSecurity');
    mockAlertData = [makeAlert({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    fireEvent.press(screen.getByText('Acknowledge'));

    expect(mockAcknowledge).toHaveBeenCalledWith('1', expect.anything());
  });

  test('SUSecurity does not see the report link', async () => {
    setUser('SUSecurity');
    mockAlertData = [makeAlert({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    expect(screen.queryByText('View Report →')).toBeNull();
  });

  test('SUAdmin sees the report link', async () => {
    setUser('SUAdmin');
    mockAlertData = [makeAlert({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    expect(screen.getByText('View Report →')).toBeTruthy();
  });

  test('a plain resident can view the alert but cannot Acknowledge or Resolve it', async () => {
    setUser('SUUser');
    mockAlertData = [makeAlert({ id: '1' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText(/A-101/)).toBeTruthy());
    expect(screen.queryByText('Acknowledge')).toBeNull();
    expect(screen.queryByText('Resolve')).toBeNull();
  });
});
