import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { HqSocietyEditScreen } from '../../../src/features/hq/HqSocietyEditScreen';
import type { Society } from '../../../src/api/endpoints/society';

const mockUpdateMutate = jest.fn();
let mockSociety: Society | undefined;
let mockIsLoading = false;

jest.mock('../../../src/features/hq/hooks/useHq', () => ({
  useHqSociety: () => ({ data: mockSociety, isLoading: mockIsLoading }),
  useUpdateSociety: () => ({ mutateAsync: mockUpdateMutate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeSociety(overrides: Partial<Society> = {}): Society {
  return {
    id: 's1', nm: 'Green Valley',
    addr: { str: '1 Main St', cty: 'Bengaluru', ste: 'Karnataka', pc: '560001', co: 'India' },
    ce: 'admin@gv.com', cp: '9876543210',
    tb: 2, ta: 40, mot: 7, mua: 10, voh: 5, st: 'Active',
    su: [], cm: [], th: 'ocean',
    ...overrides,
  };
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <HqSocietyEditScreen route={{ params: { id: 's1', name: 'Green Valley' } }} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('HqSocietyEditScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSociety = makeSociety();
    mockIsLoading = false;
  });

  test('pre-fills the form from the loaded society', () => {
    renderScreen();

    expect(screen.getByTestId('input-name').props.value).toBe('Green Valley');
    expect(screen.getByTestId('input-street').props.value).toBe('1 Main St');
    expect(screen.getByTestId('input-city').props.value).toBe('Bengaluru');
    expect(screen.getByTestId('input-state').props.value).toBe('Karnataka');
    expect(screen.getByTestId('input-postalCode').props.value).toBe('560001');
    expect(screen.getByTestId('input-country').props.value).toBe('India');
    expect(screen.getByTestId('input-contactEmail').props.value).toBe('admin@gv.com');
    expect(screen.getByTestId('input-contactPhone').props.value).toBe('9876543210');
  });

  test('validates that name and address are required before saving', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByTestId('input-name'), '');

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Society name and full address are required.'));
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  test('validates contact details are required before saving', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByTestId('input-contactEmail'), '');
    fireEvent.changeText(screen.getByTestId('input-contactPhone'), '');

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Contact email and phone are required.'));
    expect(mockUpdateMutate).not.toHaveBeenCalled();
  });

  test('saves name, address, and contact changes while passing through unedited fields', async () => {
    mockUpdateMutate.mockResolvedValue(undefined);
    renderScreen();

    fireEvent.changeText(screen.getByTestId('input-name'), 'Green Valley Updated');
    fireEvent.changeText(screen.getByTestId('input-street'), '99 New Street');
    fireEvent.changeText(screen.getByTestId('input-city'), 'Pune');
    fireEvent.changeText(screen.getByTestId('input-state'), 'Maharashtra');
    fireEvent.changeText(screen.getByTestId('input-postalCode'), '411001');

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      societyId: 's1',
      data: {
        name: 'Green Valley Updated',
        contactEmail: 'admin@gv.com',
        contactPhone: '9876543210',
        totalBlocks: 2,
        totalApartments: 40,
        maintenanceOverdueThresholdDays: 7,
        maxUsersPerApartment: 10,
        street: '99 New Street',
        city: 'Pune',
        state: 'Maharashtra',
        postalCode: '411001',
        country: 'India',
        themeId: 'ocean',
      },
    });
  });

  test('does not render form fields while the society is loading', () => {
    mockSociety = undefined;
    mockIsLoading = true;
    renderScreen();

    expect(screen.getByTestId('input-name').props.value).toBe('');
  });

  test('pre-selects the swatch matching the society theme', () => {
    mockSociety = makeSociety({ th: 'violet' });
    renderScreen();

    expect(screen.getByTestId('theme-swatch-violet').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('theme-swatch-ocean').props.accessibilityState).toMatchObject({ selected: false });
  });

  test('falls back to the default swatch for an unrecognized theme id', () => {
    mockSociety = makeSociety({ th: 'retired-theme' });
    renderScreen();

    expect(screen.getByTestId('theme-swatch-ocean').props.accessibilityState).toMatchObject({ selected: true });
  });

  test('tapping a swatch changes the selection and is included when saving', async () => {
    mockUpdateMutate.mockResolvedValue(undefined);
    renderScreen();

    fireEvent.press(screen.getByTestId('theme-swatch-emerald'));

    expect(screen.getByTestId('theme-swatch-emerald').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('theme-swatch-ocean').props.accessibilityState).toMatchObject({ selected: false });

    fireEvent.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalled());
    expect(mockUpdateMutate.mock.calls[0][0].data).toMatchObject({ themeId: 'emerald' });
  });
});
