import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SocietySettingsScreen } from '../../../src/features/society/SocietySettingsScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { useThemeStore } from '../../../src/store/themeStore';
import { societyApi, type Society } from '../../../src/api/endpoints/society';
import { residentsApi } from '../../../src/api/endpoints/residents';
import { uploadSocietyLogo, uploadSocietyBackgroundImage } from '../../../src/camera/imageUpload';

jest.mock('../../../src/api/endpoints/society', () => ({
  societyApi: {
    getSociety: jest.fn(),
    updateSociety: jest.fn(),
    removeLogo: jest.fn(),
    removeBackgroundImage: jest.fn(),
  },
}));

jest.mock('../../../src/api/endpoints/residents', () => ({
  residentsApi: { getResidents: jest.fn() },
}));

jest.mock('../../../src/camera/imageUpload', () => ({
  uploadSocietyLogo: jest.fn(),
  uploadSocietyBackgroundImage: jest.fn(),
  resolveFileUrl: (path: string) => `https://api.example.com/${path}`,
}));

const mockPickFromGallery = jest.fn();
const mockPickFromCamera = jest.fn();
jest.mock('../../../src/camera/useImagePicker', () => ({
  useImagePicker: () => ({ pickFromGallery: mockPickFromGallery, pickFromCamera: mockPickFromCamera }),
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
        <SocietySettingsScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function makeSociety(overrides: Partial<Society> = {}): Society {
  return {
    id: 'soc-1', name: 'Green Valley',
    address: { street: '1 Main St', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
    contactEmail: 'admin@gv.com', contactPhone: '+91-9876543210',
    totalBlocks: 2, totalApartments: 40, maintenanceOverdueThresholdDays: 7,
    maxUsersPerApartment: 10, visitorOverstayThresholdHours: 5,
    status: 'Active', societyUsers: [], committees: [], themeId: 'ocean',
    ...overrides,
  };
}

describe('SocietySettingsScreen — branding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'admin-1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', phone: '1', role: 'SUAdmin', residentType: 'SocietyAdmin', isVerified: true, isActive: true } as never,
      token: 'tok',
      isAuthenticated: true,
    });
    useThemeStore.setState({ logoUrl: null, sidenavBackgroundUrl: null });
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety());
    (residentsApi.getResidents as jest.Mock).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 500 });
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Auto-select "Gallery" so the upload flow proceeds without a real interactive prompt.
      const galleryButton = buttons?.find((b) => b.text === 'Gallery');
      galleryButton?.onPress?.();
    });
  });

  test('shows placeholders when no logo or background has been uploaded', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());
    expect(screen.getByText('No background')).toBeTruthy();
    expect(screen.getAllByText('Upload')).toHaveLength(2);
  });

  test('uploads a picked logo and updates the displayed logo and the theme store', async () => {
    mockPickFromGallery.mockResolvedValue('file://picked-logo.png');
    (uploadSocietyLogo as jest.Mock).mockResolvedValue('files/society-logos/soc-1/new.png');

    renderScreen();
    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Upload')[0]);

    await waitFor(() => expect(uploadSocietyLogo).toHaveBeenCalledWith('file://picked-logo.png', 'soc-1'));
    await waitFor(() => expect(screen.getByText('Change')).toBeTruthy());
    expect(useThemeStore.getState().logoUrl).toBe('https://api.example.com/files/society-logos/soc-1/new.png');
  });

  test('uploads a picked background image and updates the displayed background and the theme store', async () => {
    mockPickFromGallery.mockResolvedValue('file://picked-bg.jpg');
    (uploadSocietyBackgroundImage as jest.Mock).mockResolvedValue('files/society-backgrounds/soc-1/new.jpg');

    renderScreen();
    await waitFor(() => expect(screen.getByText('No background')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Upload')[1]);

    await waitFor(() => expect(uploadSocietyBackgroundImage).toHaveBeenCalledWith('file://picked-bg.jpg', 'soc-1'));
    expect(useThemeStore.getState().sidenavBackgroundUrl).toBe('https://api.example.com/files/society-backgrounds/soc-1/new.jpg');
  });

  test('shows an alert and leaves the placeholder in place when the upload fails', async () => {
    mockPickFromGallery.mockResolvedValue('file://picked-logo.png');
    (uploadSocietyLogo as jest.Mock).mockRejectedValue(new Error('Upload failed with status 500'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderScreen();
    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Upload')[0]);

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Upload failed', 'Upload failed with status 500'));
    expect(screen.getByText('No logo')).toBeTruthy();
  });

  test('does nothing when the picker is cancelled (returns null)', async () => {
    mockPickFromGallery.mockResolvedValue(null);

    renderScreen();
    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Upload')[0]);

    await waitFor(() => expect(mockPickFromGallery).toHaveBeenCalled());
    expect(uploadSocietyLogo).not.toHaveBeenCalled();
  });

  test('shows the previously uploaded logo/background as thumbnails with a "Change" action', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety({
      logoUrl: 'files/society-logos/soc-1/existing.png',
      sidenavBackgroundUrl: 'files/society-backgrounds/soc-1/existing.jpg',
    }));

    renderScreen();

    await waitFor(() => expect(screen.getAllByText('Change')).toHaveLength(2));
    expect(screen.queryByText('No logo')).toBeNull();
    expect(screen.queryByText('No background')).toBeNull();
  });

  test('does not show a Remove action when no logo/background has been uploaded', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());
    expect(screen.queryByText('Remove')).toBeNull();
  });

  test('removes the logo and reverts the theme store to the default when confirmed', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety({
      logoUrl: 'files/society-logos/soc-1/existing.png',
    }));
    (societyApi.removeLogo as jest.Mock).mockResolvedValue(makeSociety({ logoUrl: null }));
    useThemeStore.setState({ logoUrl: 'https://api.example.com/files/society-logos/soc-1/existing.png' });
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Remove')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove'));

    await waitFor(() => expect(societyApi.removeLogo).toHaveBeenCalledWith('soc-1'));
    await waitFor(() => expect(screen.getByText('No logo')).toBeTruthy());
    expect(useThemeStore.getState().logoUrl).toBeNull();
  });

  test('removes the background image and reverts the theme store to the default when confirmed', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety({
      sidenavBackgroundUrl: 'files/society-backgrounds/soc-1/existing.jpg',
    }));
    (societyApi.removeBackgroundImage as jest.Mock).mockResolvedValue(makeSociety({ sidenavBackgroundUrl: null }));
    useThemeStore.setState({ sidenavBackgroundUrl: 'https://api.example.com/files/society-backgrounds/soc-1/existing.jpg' });
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Remove')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove'));

    await waitFor(() => expect(societyApi.removeBackgroundImage).toHaveBeenCalledWith('soc-1'));
    await waitFor(() => expect(screen.getByText('No background')).toBeTruthy());
    expect(useThemeStore.getState().sidenavBackgroundUrl).toBeNull();
  });

  test('shows an alert and leaves the thumbnail in place when removing the logo fails', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety({
      logoUrl: 'files/society-logos/soc-1/existing.png',
    }));
    (societyApi.removeLogo as jest.Mock).mockRejectedValue(new Error('Request failed with status 500'));
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Remove')?.onPress?.();
    });
    const alertSpy = jest.spyOn(Alert, 'alert');

    renderScreen();
    await waitFor(() => expect(screen.getByText('Remove')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Remove failed', 'Request failed with status 500'));
    expect(screen.queryByText('No logo')).toBeNull();
  });

  test('does nothing when the removal confirmation is cancelled', async () => {
    (societyApi.getSociety as jest.Mock).mockResolvedValue(makeSociety({
      logoUrl: 'files/society-logos/soc-1/existing.png',
    }));
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Remove')).toBeTruthy());

    fireEvent.press(screen.getByText('Remove'));

    expect(societyApi.removeLogo).not.toHaveBeenCalled();
  });
});
