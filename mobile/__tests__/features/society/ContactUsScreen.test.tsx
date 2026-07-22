import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ContactUsScreen } from '../../../src/features/society/ContactUsScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { societyApi } from '../../../src/api/endpoints/society';

jest.mock('../../../src/api/endpoints/society', () => ({
  societyApi: {
    getSociety: jest.fn(),
    updateSociety: jest.fn(),
  },
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
        <ContactUsScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('ContactUsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'u1', sid: 'soc-1', fn: 'Alice', em: 'a@a.com', ph: '1', rl: 'SUUser', rt: 'Owner', vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('renders society contact info and committee members', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({
      id: 'soc-1',
      nm: 'Green Valley',
      ce: 'admin@gv.com',
      cp: '+91-9876543210',
      tb: 2,
      ta: 40,
      mot: 7,
      su: [],
      cm: [
        { nm: 'Managing Committee', mem: [{ uid: 'u1', fn: 'Bob Jones', em: 'bob@example.com', rt: 'Chairman' }] },
      ],
    });

    renderScreen();

    await waitFor(() => expect(screen.getByText('Green Valley')).toBeTruthy());
    expect(screen.getByText(/admin@gv.com/)).toBeTruthy();
    expect(screen.getByText('Managing Committee')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
    expect(screen.getByText('Chairman')).toBeTruthy();
  });

  test('shows an empty state when the society could not be loaded', async () => {
    (societyApi.getSociety as jest.Mock).mockRejectedValue(new Error('network error'));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Not available')).toBeTruthy());
  });
});
