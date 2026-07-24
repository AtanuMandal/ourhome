import 'react-native-gesture-handler/jestSetup';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppDrawer } from '../../src/navigation/AppDrawer';
import { useAuthStore } from '../../src/store/authStore';
import { useThemeStore } from '../../src/store/themeStore';
import { DEFAULT_THEME_ID } from '../../src/theme/themes';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

jest.mock('../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => ({ apartments: [], activeApartmentId: null, setSelectedApartment: jest.fn() }),
}));

jest.mock('../../src/auth/useAuth', () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));

// Drawer.Navigator only mounts the focused screen (Dashboard, the first Drawer.Screen) — the
// other ~40 screens imported by AppDrawer.tsx are never rendered here, so only this one needs
// stubbing out to avoid pulling in its real react-query/API dependencies.
jest.mock('../../src/features/dashboard/DashboardScreen', () => {
  const { Text } = require('react-native');
  return { DashboardScreen: () => <Text>Dashboard stub</Text> };
});

function renderAppDrawer() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AppDrawer />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe('AppDrawer — society branding background', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'admin-1', societyId: 'soc-1', fullName: 'Admin', email: 'a@a.com', phone: '1', role: 'SUAdmin', residentType: 'SocietyAdmin', isVerified: true, isActive: true } as never,
      token: 'tok',
      isAuthenticated: true,
    });
    useThemeStore.setState({ themeId: DEFAULT_THEME_ID, status: 'resolved', logoUrl: null, sidenavBackgroundUrl: null });
  });

  test('renders no background image behind the main content when the society has not uploaded one', () => {
    renderAppDrawer();

    const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
    expect(images.length).toBe(0);
  });

  test("renders the society's uploaded background image behind the main content when set", () => {
    useThemeStore.setState({ sidenavBackgroundUrl: 'https://api.example.com/files/society-backgrounds/soc-1/def.jpg' });

    renderAppDrawer();

    const images = screen.UNSAFE_queryAllByType(require('react-native').Image);
    expect(images.length).toBe(1);
    expect(images[0].props.source).toEqual({ uri: 'https://api.example.com/files/society-backgrounds/soc-1/def.jpg' });
    expect(images[0].props.style).toEqual(expect.objectContaining({ opacity: 0.7 }));
  });
});
