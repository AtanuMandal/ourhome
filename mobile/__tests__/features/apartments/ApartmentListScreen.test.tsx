import React from 'react';
import { Alert } from 'react-native';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ApartmentListScreen } from '../../../src/features/apartments/ApartmentListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { apartmentsApi } from '../../../src/api/endpoints/apartments';

jest.mock('../../../src/features/apartments/hooks/useApartments', () => ({
  useApartmentList: () => ({
    data: [],
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../../../src/api/endpoints/apartments', () => ({
  apartmentsApi: { exportDirectory: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file://cache/',
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 0, height: 0 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <NavigationContainer>
        <ApartmentListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('ApartmentListScreen — apartment directory report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setUser(role: 'SUAdmin' | 'SUUser') {
    useAuthStore.setState({
      user: { id: 'u1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', phone: '1', role, residentType: 'SocietyAdmin', isVerified: true, isActive: true } as never,
      token: 'tok',
      isAuthenticated: true,
    });
  }

  test('SUAdmin sees the Download Report link', () => {
    setUser('SUAdmin');
    renderScreen();

    expect(screen.getByText('Download Apartment Report →')).toBeTruthy();
  });

  test('SUUser does not see the Download Report link', () => {
    setUser('SUUser');
    renderScreen();

    expect(screen.queryByText('Download Apartment Report →')).toBeNull();
  });

  test('tapping the link exports the CSV and shares it', async () => {
    setUser('SUAdmin');
    (apartmentsApi.exportDirectory as jest.Mock).mockResolvedValue('csv,content');

    renderScreen();
    fireEvent.press(screen.getByText('Download Apartment Report →'));

    await waitFor(() => expect(apartmentsApi.exportDirectory).toHaveBeenCalledWith('soc-1'));
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file://cache/apartment-directory.csv', 'csv,content');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file://cache/apartment-directory.csv', { mimeType: 'text/csv', dialogTitle: 'Apartment directory report' });
  });

  test('shows an alert when the export fails', async () => {
    setUser('SUAdmin');
    (apartmentsApi.exportDirectory as jest.Mock).mockRejectedValue(new Error('Request failed with status 500'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderScreen();
    fireEvent.press(screen.getByText('Download Apartment Report →'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Could not export the apartment report', 'Request failed with status 500'));
  });
});
