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
      user: { id: 'u1', societyId: 'soc-1', fullName: 'Alice', email: 'a@a.com', phone: '1', role: 'SUUser', residentType: 'Owner', isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('renders society contact info and committee members', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue({
      id: 'soc-1',
      name: 'Green Valley',
      contactEmail: 'admin@gv.com',
      contactPhone: '+91-9876543210',
      totalBlocks: 2,
      totalApartments: 40,
      maintenanceOverdueThresholdDays: 7,
      societyUsers: [],
      committees: [
        { name: 'Managing Committee', members: [{ userId: 'u1', fullName: 'Bob Jones', email: 'bob@example.com', roleTitle: 'Chairman' }] },
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
