import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { HqSocietyFormScreen } from '../../../src/features/hq/HqSocietyFormScreen';

const mockCreateMutate = jest.fn();

jest.mock('../../../src/features/hq/hooks/useHq', () => ({
  useCreateSociety: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
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
        <HqSocietyFormScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function fillValidForm() {
  fireEvent.changeText(screen.getByTestId('input-name'), 'Green Valley Residency');
  fireEvent.changeText(screen.getByTestId('input-street'), '1 Main St');
  fireEvent.changeText(screen.getByTestId('input-city'), 'Bengaluru');
  fireEvent.changeText(screen.getByTestId('input-state'), 'Karnataka');
  fireEvent.changeText(screen.getByTestId('input-postalCode'), '560001');
  fireEvent.changeText(screen.getByTestId('input-country'), 'India');
  fireEvent.changeText(screen.getByTestId('input-contactEmail'), 'admin@gv.com');
  fireEvent.changeText(screen.getByTestId('input-contactPhone'), '9876543210');
  fireEvent.changeText(screen.getByTestId('input-adminFullName'), 'Raj Kumar');
  fireEvent.changeText(screen.getByTestId('input-adminEmail'), 'raj@gv.com');
  fireEvent.changeText(screen.getByTestId('input-adminPhone'), '9000000001');
}

describe('HqSocietyFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('validates that name and address are required before creating', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('Create Society'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Society name and full address are required.'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  test('validates contact details once address is filled', async () => {
    renderScreen();
    fireEvent.changeText(screen.getByTestId('input-name'), 'Green Valley Residency');
    fireEvent.changeText(screen.getByTestId('input-street'), '1 Main St');
    fireEvent.changeText(screen.getByTestId('input-city'), 'Bengaluru');
    fireEvent.changeText(screen.getByTestId('input-state'), 'Karnataka');
    fireEvent.changeText(screen.getByTestId('input-postalCode'), '560001');
    fireEvent.changeText(screen.getByTestId('input-country'), 'India');

    fireEvent.press(screen.getByText('Create Society'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Contact email and phone are required.'));
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  test('creates a society with the full form payload', async () => {
    mockCreateMutate.mockResolvedValue(undefined);
    renderScreen();
    fillValidForm();

    fireEvent.press(screen.getByText('Create Society'));

    await waitFor(() => expect(mockCreateMutate).toHaveBeenCalled());
    expect(mockCreateMutate).toHaveBeenCalledWith({
      name: 'Green Valley Residency', street: '1 Main St', city: 'Bengaluru', state: 'Karnataka',
      postalCode: '560001', country: 'India', contactEmail: 'admin@gv.com', contactPhone: '9876543210',
      totalBlocks: 1, totalApartments: 1,
      adminFullName: 'Raj Kumar', adminEmail: 'raj@gv.com', adminPhone: '9000000001',
    });
  });
});
