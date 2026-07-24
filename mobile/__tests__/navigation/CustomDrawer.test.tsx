import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { CustomDrawer } from '../../src/navigation/CustomDrawer';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { DEFAULT_THEME_ID } from '../../src/theme/themes';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockLogout = jest.fn();

jest.mock('../../src/auth/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

jest.mock('../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => ({ apartments: [], activeApartmentId: null, setSelectedApartment: jest.fn() }),
}));

function makeNavProps(): DrawerContentComponentProps {
  return {
    navigation: { navigate: jest.fn() } as unknown as DrawerContentComponentProps['navigation'],
    state: { routeNames: ['Dashboard'], index: 0 } as unknown as DrawerContentComponentProps['state'],
    descriptors: {} as DrawerContentComponentProps['descriptors'],
  };
}

function renderDrawer() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <CustomDrawer {...makeNavProps()} />
    </SafeAreaProvider>
  );
}

describe('CustomDrawer — society branding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'admin-1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', phone: '1', role: 'SUAdmin', residentType: 'SocietyAdmin', isVerified: true, isActive: true } as never,
      token: 'tok',
      isAuthenticated: true,
    });
    useThemeStore.setState({ themeId: DEFAULT_THEME_ID, status: 'resolved', logoUrl: null, sidenavBackgroundUrl: null });
  });

  test('shows the default "OurHome" wordmark when no logo has been uploaded', () => {
    renderDrawer();

    expect(screen.getByText('OurHome')).toBeTruthy();
    expect(screen.queryByLabelText('Society logo')).toBeNull();
  });

  test("shows the society's uploaded logo instead of the default wordmark when set", () => {
    useThemeStore.setState({ logoUrl: 'https://api.example.com/files/society-logos/soc-1/abc.png' });

    renderDrawer();

    expect(screen.queryByText('OurHome')).toBeNull();
    expect(screen.getByLabelText('Society logo')).toBeTruthy();
  });

  test('never renders a background image inside the drawer itself, regardless of sidenavBackgroundUrl', () => {
    // The society background image renders behind the main content area (AppDrawer.tsx),
    // not the drawer/menu panel — see AppDrawer.test.tsx.
    useThemeStore.setState({ sidenavBackgroundUrl: 'https://api.example.com/files/society-backgrounds/soc-1/def.jpg' });

    renderDrawer();

    const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
    expect(images.length).toBe(0);
  });
});

describe('CustomDrawer — Staff menu visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useThemeStore.setState({ themeId: DEFAULT_THEME_ID, status: 'resolved', logoUrl: null, sidenavBackgroundUrl: null });
  });

  function setUser(role: 'SUAdmin' | 'SUUser' | 'SUSecurity') {
    useAuthStore.setState({
      user: { id: 'u1', societyId: 'soc-1', fullName: 'User', email: 'u@a.com', phone: '1', role, residentType: 'Owner', isVerified: true, isActive: true } as never,
      token: 'tok',
      isAuthenticated: true,
    });
  }

  test('shows Staff to SUUser (read-only roster)', () => {
    setUser('SUUser');
    renderDrawer();

    expect(screen.getByText('Staff')).toBeTruthy();
  });

  test('shows Staff to SUAdmin', () => {
    setUser('SUAdmin');
    renderDrawer();

    expect(screen.getByText('Staff')).toBeTruthy();
  });

  test('shows Staff to SUSecurity', () => {
    setUser('SUSecurity');
    renderDrawer();

    expect(screen.getByText('Staff')).toBeTruthy();
  });
});
