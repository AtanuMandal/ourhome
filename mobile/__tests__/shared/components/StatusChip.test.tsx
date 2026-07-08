import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatusChip } from '../../../src/shared/components/StatusChip';

describe('StatusChip', () => {
  test('renders Approved status text', () => {
    render(<StatusChip status="Approved" />);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  test('renders Pending status text', () => {
    render(<StatusChip status="Pending" />);
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  test('renders Denied status text', () => {
    render(<StatusChip status="Denied" />);
    expect(screen.getByText('Denied')).toBeTruthy();
  });

  test('renders unknown status text with default styling', () => {
    render(<StatusChip status="Unknown" />);
    expect(screen.getByText('Unknown')).toBeTruthy();
  });
});
