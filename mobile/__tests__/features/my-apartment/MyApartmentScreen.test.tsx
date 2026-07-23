import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyApartmentScreen } from '../../../src/features/my-apartment/MyApartmentScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { apartmentsApi } from '../../../src/api/endpoints/apartments';
import type { Apartment } from '../../../src/api/types';

jest.mock('../../../src/api/endpoints/apartments', () => ({
  apartmentsApi: {
    getApartment: jest.fn(),
    getApartments: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 500 }),
    updateParking: jest.fn(),
  },
}));

jest.mock('../../../src/api/endpoints/users', () => ({
  usersApi: {
    shareInviteLink: jest.fn(),
    requestApartmentJoin: jest.fn(),
  },
}));

// useActiveApartment issues a TanStack profile query; mock it to follow the auth store's
// account-level apartmentId so these tests don't need to also mock the profile endpoint.
jest.mock('../../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => {
    const { useAuthStore: store } = require('../../../src/store/authStore');
    const user = store.getState().user;
    return {
      apartments: user?.apartments ?? [],
      activeApartmentId: user?.apartmentId ?? null,
      activeResidentType: user?.residentType,
      setSelectedApartment: jest.fn(),
    };
  },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeApartment(overrides: Partial<Apartment> = {}): Apartment {
  return {
    id: 'apt-1',
    societyId: 'soc-1',
    apartmentNumber: '101',
    blockName: 'A',
    floorNumber: 1,
    status: 'Occupied',
    residents: [],
    parkingSlots: [],
    parkingCarNumbers: [],
    ...overrides,
  };
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
        <NavigationContainer>
          <MyApartmentScreen />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

describe('MyApartmentScreen — parking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'u1', societyId: 'soc-1', fullName: 'Alice', email: 'alice@a.com', phone: '1',
        role: 'SUUser', residentType: 'Owner', apartmentId: 'apt-1',
        apartments: [{ apartmentId: 'apt-1', name: 'A-101', residentType: 'Owner' }],
        isVerified: true, isActive: true,
      } as never,
      token: 'tok',
      isAuthenticated: true,
    });
  });

  test('shows one text box per parking slot, pre-filled with the saved car number', async () => {
    (apartmentsApi.getApartment as jest.Mock).mockResolvedValue(makeApartment({
      parkingSlots: ['P1', 'P2'],
      parkingCarNumbers: [{ slotId: 'P1', carNumber: 'KA-01-AB-1234' }],
    }));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Parking')).toBeTruthy());
    expect(screen.getByText('Car no. — Slot P1')).toBeTruthy();
    expect(screen.getByText('Car no. — Slot P2')).toBeTruthy();
    expect(screen.getByDisplayValue('KA-01-AB-1234')).toBeTruthy();
  });

  test('shows no parking section when the apartment has no parking slots', async () => {
    (apartmentsApi.getApartment as jest.Mock).mockResolvedValue(makeApartment({ parkingSlots: [] }));

    renderScreen();

    await waitFor(() => expect(screen.getByText('Residents')).toBeTruthy());
    expect(screen.queryByText('Parking')).toBeNull();
  });

  test('saves the edited car numbers for every slot on the apartment', async () => {
    (apartmentsApi.getApartment as jest.Mock).mockResolvedValue(makeApartment({ parkingSlots: ['P1', 'P2'] }));
    (apartmentsApi.updateParking as jest.Mock).mockResolvedValue(makeApartment({
      parkingSlots: ['P1', 'P2'],
      parkingCarNumbers: [{ slotId: 'P1', carNumber: 'KA-01-AB-1234' }],
    }));
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderScreen();
    await waitFor(() => expect(screen.getByText('Parking')).toBeTruthy());

    const [slotP1Input] = screen.getAllByPlaceholderText('KA-01-AB-1234');
    fireEvent.changeText(slotP1Input, 'KA-01-AB-1234');
    fireEvent.press(screen.getByText('Save Parking'));

    await waitFor(() => expect(apartmentsApi.updateParking).toHaveBeenCalledWith('soc-1', 'apt-1', [
      { slotId: 'P1', carNumber: 'KA-01-AB-1234' },
      { slotId: 'P2', carNumber: '' },
    ]));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Saved', 'Parking updated.'));
  });

  test('shows an alert when updating parking fails', async () => {
    (apartmentsApi.getApartment as jest.Mock).mockResolvedValue(makeApartment({ parkingSlots: ['P1'] }));
    (apartmentsApi.updateParking as jest.Mock).mockRejectedValue(new Error('Request failed with status 500'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderScreen();
    await waitFor(() => expect(screen.getByText('Parking')).toBeTruthy());

    fireEvent.press(screen.getByText('Save Parking'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Could not update parking', 'Request failed with status 500'));
  });
});
