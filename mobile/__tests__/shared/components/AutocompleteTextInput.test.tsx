import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AutocompleteTextInput } from '../../../src/shared/components/AutocompleteTextInput';

describe('AutocompleteTextInput', () => {
  test('shows filtered suggestions matching the current text once focused', () => {
    const onChangeText = jest.fn();
    render(
      <AutocompleteTextInput
        value="swi"
        onChangeText={onChangeText}
        suggestions={['Swiggy', 'Zomato', 'Amazon']}
        placeholder="Company"
      />
    );

    fireEvent(screen.getByPlaceholderText('Company'), 'focus');

    expect(screen.getByText('Swiggy')).toBeTruthy();
    expect(screen.queryByText('Zomato')).toBeNull();
  });

  test('selecting a suggestion calls onChangeText with that value', () => {
    const onChangeText = jest.fn();
    render(
      <AutocompleteTextInput
        value="swi"
        onChangeText={onChangeText}
        suggestions={['Swiggy', 'Zomato']}
        placeholder="Company"
      />
    );

    fireEvent(screen.getByPlaceholderText('Company'), 'focus');
    fireEvent.press(screen.getByText('Swiggy'));

    expect(onChangeText).toHaveBeenCalledWith('Swiggy');
  });

  test('allows free text with no matching suggestions', () => {
    render(
      <AutocompleteTextInput
        value="Brand New Courier Co"
        onChangeText={jest.fn()}
        suggestions={['Swiggy', 'Zomato']}
        placeholder="Company"
      />
    );

    fireEvent(screen.getByPlaceholderText('Company'), 'focus');

    expect(screen.queryByText('Swiggy')).toBeNull();
    expect(screen.queryByText('Zomato')).toBeNull();
    expect(screen.getByDisplayValue('Brand New Courier Co')).toBeTruthy();
  });
});
