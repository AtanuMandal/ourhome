import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { HqUserListScreen } from '../../../src/features/hq/HqUserListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { User } from '../../../src/api/types';

const mockCreate = jest.fn();
const mockActivate = jest.fn();
const mockDeactivate = jest.fn();
let mockUsers: User[] = [];

jest.mock('../../../src/features/hq/hooks/useHq', () => ({
  useHqUsers: () => ({ data: { items: mockUsers, total: mockUsers.length, page: 1, pageSize: 100 }, isLoading: false, refetch: jest.fn(), isRefetching: false }),
  useCreateHqUser: () => ({ mutate: mockCreate, isPending: false }),
  useActivateHqUser: () => ({ mutate: mockActivate, isPending: false }),
  useDeactivateHqUser: () => ({ mutate: mockDeactivate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', sid: 'hq', fn: 'Platform Admin', em: 'admin@platform.com', ph: '9000000000',
    rl: 'HQAdmin', rt: 'SocietyAdmin', vf: true, ac: true,
    ...overrides,
  } as User;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <HqUserListScreen />
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

describe('HqUserListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsers = [];
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('lists existing HQ users', () => {
    setUser('HQAdmin');
    mockUsers = [makeUser({ fn: 'Jane Viewer', em: 'jane@platform.com' })];

    renderScreen();

    expect(screen.getByText('Jane Viewer')).toBeTruthy();
  });

  test('HQAdmin sees the create form and can submit it', () => {
    setUser('HQAdmin');

    renderScreen();
    fireEvent.changeText(screen.getByPlaceholderText('Full name'), 'New Viewer');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'viewer@platform.com');
    fireEvent.changeText(screen.getByPlaceholderText('Phone'), '9000000001');
    fireEvent.press(screen.getByText('Create HQ User'));

    expect(mockCreate).toHaveBeenCalledWith(
      { fullName: 'New Viewer', email: 'viewer@platform.com', phone: '9000000001', role: 'HQUser' },
      expect.anything()
    );
  });

  test('validates required fields before creating', async () => {
    setUser('HQAdmin');

    renderScreen();
    fireEvent.press(screen.getByText('Create HQ User'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('HQUser does not see the create form', () => {
    setUser('HQUser');

    renderScreen();

    expect(screen.queryByText('Add HQ User')).toBeNull();
  });

  test('HQAdmin can activate and deactivate a user', () => {
    setUser('HQAdmin');
    mockUsers = [makeUser({ id: 'u2', ac: false })];

    renderScreen();
    fireEvent.press(screen.getByText('Enable'));
    expect(mockActivate).toHaveBeenCalledWith('u2', expect.anything());
  });
});
