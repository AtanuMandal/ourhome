import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HqSocietyListScreen } from '../../../src/features/hq/HqSocietyListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Society } from '../../../src/api/endpoints/society';

const mockActivate = jest.fn();
const mockDeactivate = jest.fn();
let mockSocieties: Society[] = [];

jest.mock('../../../src/features/hq/hooks/useHq', () => ({
  useHqSocieties: () => ({ data: { items: mockSocieties, total: mockSocieties.length, page: 1, pageSize: 100 }, isLoading: false, refetch: jest.fn(), isRefetching: false }),
  useActivateSociety: () => ({ mutate: mockActivate, isPending: false }),
  useDeactivateSociety: () => ({ mutate: mockDeactivate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeSociety(overrides: Partial<Society> = {}): Society {
  return {
    id: 's1', nm: 'Green Valley',
    addr: { str: '1 Main St', cty: 'Bengaluru', ste: 'Karnataka', pc: '560001', co: 'India' },
    ce: 'admin@gv.com', cp: '9876543210',
    tb: 2, ta: 40, mot: 7, mua: 10, voh: 5, st: 'Active',
    su: [], cm: [], th: 'ocean',
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
        <HqSocietyListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function setUser(role: 'HQAdmin' | 'HQUser') {
  useAuthStore.setState({
    user: { id: 'u1', sid: 'hq', fn: 'Platform Admin', em: 'admin@platform.com', ph: '9000000000',
      rl: role, rt: 'SocietyAdmin', aid: undefined, vf: true, ac: true },
    token: 'token',
    isAuthenticated: true,
  });
}

describe('HqSocietyListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocieties = [];
  });

  test('renders societies regardless of status', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ st: 'Active' }), makeSociety({ id: 's2', nm: 'Blue Ridge', st: 'Inactive' })];

    renderScreen();

    expect(screen.getByText('Green Valley')).toBeTruthy();
    expect(screen.getByText('Blue Ridge')).toBeTruthy();
  });

  test('HQAdmin sees Disable action for an active society', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ st: 'Active' })];

    renderScreen();
    fireEvent.press(screen.getByText('Disable'));

    expect(mockDeactivate).toHaveBeenCalledWith('s1', expect.anything());
  });

  test('HQAdmin sees Enable action for an inactive society', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety({ st: 'Inactive' })];

    renderScreen();
    fireEvent.press(screen.getByText('Enable'));

    expect(mockActivate).toHaveBeenCalledWith('s1', expect.anything());
  });

  test('HQUser does not see enable/disable actions', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety({ st: 'Active' })];

    renderScreen();

    expect(screen.queryByText('Disable')).toBeNull();
    expect(screen.queryByText('Enable')).toBeNull();
  });

  test('HQAdmin sees the Add Society FAB', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.getByLabelText('Add society')).toBeTruthy();
  });

  test('HQUser does not see the Add Society FAB', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.queryByLabelText('Add society')).toBeNull();
  });

  test('HQAdmin sees the Edit action', () => {
    setUser('HQAdmin');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.getByText('Edit')).toBeTruthy();
  });

  test('HQUser does not see the Edit action', () => {
    setUser('HQUser');
    mockSocieties = [makeSociety()];

    renderScreen();

    expect(screen.queryByText('Edit')).toBeNull();
  });
});
