import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisitorRegisterScreen } from '../../../src/features/visitors/VisitorRegisterScreen';
import { useAuthStore } from '../../../src/store/authStore';

const mockRegisterVisitor = jest.fn().mockResolvedValue({ id: 'new-visitor-1' });
const mockNavigate = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
  };
});

jest.mock('../../../src/features/visitors/hooks/useVisitors', () => ({
  useRegisterVisitor: () => ({ mutateAsync: mockRegisterVisitor, isPending: false }),
  useVisitorLookups: () => ({ data: { companies: [], purposes: [] } }),
}));

jest.mock('../../../src/features/apartments/hooks/useApartments', () => ({
  useApartmentList: () => ({ data: [{ id: 'apt-77', blk: 'B', flr: 2, num: '201' }] }),
}));

jest.mock('../../../src/camera/useCamera', () => ({
  useCamera: () => ({ upload: jest.fn(), isUploading: false }),
}));

jest.mock('../../../src/camera/useImagePicker', () => ({
  useImagePicker: () => ({ pickFromGallery: jest.fn(), pickFromCamera: jest.fn() }),
}));

jest.mock('../../../src/shared/hooks/useActiveApartment', () => ({
  useActiveApartment: () => {
    const { useAuthStore: store } = require('../../../src/store/authStore');
    const user = store.getState().user;
    return {
      apartments: user?.apts ?? [],
      activeApartmentId: user?.aid ?? null,
      activeResidentType: user?.rt,
      setSelectedApartment: jest.fn(),
    };
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
        <VisitorRegisterScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function fillRequiredFields() {
  fireEvent.changeText(screen.getByPlaceholderText("Visitor's full name"), 'Jane Visitor');
  fireEvent.changeText(screen.getByPlaceholderText('10-digit mobile number'), '9876543210');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Delivery, Guest, Plumber...'), 'Delivery');
}

function pressSubmit() {
  // The AppHeader title and the submit button share the text — the button renders last.
  const matches = screen.getAllByText('Register Visitor');
  fireEvent.press(matches[matches.length - 1]);
}

describe('VisitorRegisterScreen — pre-approval parity with web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('a resident (SUUser) registering for their own apartment pre-approves the pass', async () => {
    useAuthStore.setState({
      user: { id: 'res-1', sid: 'soc-1', fn: 'Res', em: 'r@r.com', ph: '1', rl: 'SUUser', rt: 'Owner', aid: 'apt-1', vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();
    fillRequiredFields();
    pressSubmit();

    await waitFor(() => expect(mockRegisterVisitor).toHaveBeenCalled());
    expect(mockRegisterVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ isPreApproved: true, apartmentId: 'apt-1' })
    );
    // Lands on the pass screen (QR + share), matching the web post-register view.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('VisitorDetail', { id: 'new-visitor-1' }));
  });

  test('SUSecurity registering a visitor does NOT pre-approve — resident approval stays required', async () => {
    useAuthStore.setState({
      user: { id: 'sec-1', sid: 'soc-1', fn: 'Guard', em: 'g@g.com', ph: '1', rl: 'SUSecurity', rt: 'CoOccupant', aid: undefined, vf: true, ac: true },
      token: 'tok',
      isAuthenticated: true,
    });

    renderScreen();
    fillRequiredFields();
    // Security must pick the host apartment: open the select, then choose the option.
    fireEvent.press(screen.getByLabelText('Select apartment'));
    fireEvent.press(await screen.findByText(/2-201/));
    pressSubmit();

    await waitFor(() => expect(mockRegisterVisitor).toHaveBeenCalled());
    expect(mockRegisterVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ isPreApproved: false, apartmentId: 'apt-77' })
    );
  });
});
