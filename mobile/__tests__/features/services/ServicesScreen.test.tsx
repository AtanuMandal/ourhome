import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesScreen } from '../../../src/features/services/ServicesScreen';
import { useAuthStore } from '../../../src/store/authStore';

const mockListProviders = jest.fn();
const mockListRequests = jest.fn();

jest.mock('../../../src/api/endpoints/services', () => ({
  servicesApi: {
    listProviders: (...args: [string, Record<string, string | number>?]) => mockListProviders(...args),
    listRequests: (...args: [string, Record<string, string | number>?]) => mockListRequests(...args),
    registerProvider: jest.fn(),
    createRequest: jest.fn(),
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <ServicesScreen />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function loginAs(role: string): void {
  useAuthStore.setState({
    user: { id: 'u1', societyId: 'soc-1', fullName: 'User', email: 'u@a.com', phone: '1', role: role as never, residentType: 'Owner' as never, apartmentId: 'apt-1', isVerified: true, isActive: true },
    token: 'tok',
    isAuthenticated: true,
  });
}

describe('ServicesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListProviders.mockResolvedValue({
      items: [{
        id: 'sp1', providerName: 'CleanSphere', contactName: 'Ravi', contactPhone: '9876500000',
        serviceTypes: ['Cleaner'], description: 'Deep cleaning services', status: 'Active', rating: 4.5, reviewCount: 12,
      }],
      total: 1, page: 1, pageSize: 100,
    });
    mockListRequests.mockResolvedValue({
      items: [{
        id: 'sr1', societyId: 'soc-1', apartmentId: 'apt-1', serviceType: 'Plumber',
        description: 'Leaking tap in kitchen', preferredDateTime: '2026-07-20T10:00:00Z', status: 'Pending', createdAt: '2026-07-15T10:00:00Z',
      }],
      total: 1, page: 1, pageSize: 100,
    });
  });

  test('lists service providers on the default tab', async () => {
    loginAs('SUUser');

    renderScreen();

    await waitFor(() => expect(screen.getByText('CleanSphere')).toBeTruthy());
    expect(screen.getByText(/★ 4.5/)).toBeTruthy();
    expect(mockListProviders).toHaveBeenCalledWith('soc-1', { page: 1, pageSize: 100 });
  });

  test('switching to the Requests tab lists service requests', async () => {
    loginAs('SUUser');

    renderScreen();

    fireEvent.press(screen.getByText('Requests'));

    await waitFor(() => expect(screen.getByText('Leaking tap in kitchen')).toBeTruthy());
  });

  test('only SUAdmin sees the register-provider action', async () => {
    loginAs('SUUser');
    renderScreen();
    await waitFor(() => expect(screen.getByText('CleanSphere')).toBeTruthy());
    expect(screen.queryByLabelText('Register provider')).toBeNull();
  });

  test('SUAdmin sees the register-provider action on the providers tab', async () => {
    loginAs('SUAdmin');
    renderScreen();
    await waitFor(() => expect(screen.getByText('CleanSphere')).toBeTruthy());
    expect(screen.getByLabelText('Register provider')).toBeTruthy();
  });
});
