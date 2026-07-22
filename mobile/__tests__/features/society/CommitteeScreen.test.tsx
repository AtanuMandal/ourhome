import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CommitteeScreen } from '../../../src/features/society/CommitteeScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { societyApi } from '../../../src/api/endpoints/society';
import { residentsApi } from '../../../src/api/endpoints/residents';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <CommitteeScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

jest.mock('../../../src/api/endpoints/society', () => ({
  societyApi: {
    getSociety: jest.fn(),
    updateSociety: jest.fn(),
  },
}));

jest.mock('../../../src/api/endpoints/residents', () => ({
  residentsApi: {
    getResidents: jest.fn(),
  },
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

const mockSociety = {
  id: 'soc-1',
  nm: 'Green Valley',
  ce: 'admin@gv.com',
  cp: '+91-9876543210',
  tb: 2,
  ta: 40,
  mot: 7,
  su: [],
  cm: [
    {
      nm: 'Managing Committee',
      mem: [{ uid: 'u1', fn: 'Bob Jones', em: 'bob@example.com', rt: 'Chairman' }],
    },
  ],
};

const mockResidents = {
  items: [
    { id: 'u1', fn: 'Bob Jones', em: 'bob@example.com' },
    { id: 'u2', fn: 'Carol White', em: 'carol@example.com' },
  ],
  total: 2,
  page: 1,
  pageSize: 500,
};

describe('CommitteeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'admin1', sid: 'soc-1', fn: 'Admin', em: 'a@a.com', ph: '1', rl: 'SUAdmin', rt: 'SocietyAdmin', vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });
    (societyApi.getSociety as jest.Mock).mockResolvedValue(mockSociety);
    (residentsApi.getResidents as jest.Mock).mockResolvedValue(mockResidents);
  });

  test('renders the existing committee and member role title', async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByDisplayValue('Managing Committee')).toBeTruthy());
    expect(screen.getByDisplayValue('Chairman')).toBeTruthy();
  });

  test('a new committee member picker excludes the already-assigned resident', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByDisplayValue('Managing Committee')).toBeTruthy());

    fireEvent.press(screen.getByText('+ Add Member'));
    fireEvent.press(screen.getByText('Select resident'));

    await waitFor(() => expect(screen.getByText('Carol White (carol@example.com)')).toBeTruthy());
    // Bob still appears once as row 1's already-selected trigger label, but must not
    // also appear as a selectable option in row 2's freshly-opened picker.
    expect(screen.getAllByText('Bob Jones (bob@example.com)')).toHaveLength(1);
  });

  test('save submits the committee draft alongside unmodified society fields', async () => {
    (societyApi.updateSociety as jest.Mock).mockResolvedValue(mockSociety);
    renderScreen();
    await waitFor(() => expect(screen.getByDisplayValue('Managing Committee')).toBeTruthy());

    fireEvent.press(screen.getByText('Save Committees'));

    await waitFor(() => expect(societyApi.updateSociety).toHaveBeenCalledWith('soc-1', expect.objectContaining({
      name: 'Green Valley',
      contactEmail: 'admin@gv.com',
      committees: [{ name: 'Managing Committee', members: [{ email: 'bob@example.com', roleTitle: 'Chairman' }] }],
    })));
  });
});
