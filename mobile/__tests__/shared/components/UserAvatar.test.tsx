import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { UserAvatar } from '../../../src/shared/components/UserAvatar';

describe('UserAvatar', () => {
  test('renders initials when no picture url is set', () => {
    render(<UserAvatar name="Alice Smith" />);

    expect(screen.getByText('AS')).toBeTruthy();
  });

  test('renders a question mark for an empty name without a picture', () => {
    render(<UserAvatar name="" />);

    expect(screen.getByText('?')).toBeTruthy();
  });

  test('renders the picture instead of initials when a url is set', () => {
    render(<UserAvatar name="Alice Smith" pictureUrl="files/profile-pictures/soc-1/a.jpg" />);

    expect(screen.queryByText('AS')).toBeNull();
    expect(screen.getByLabelText('Alice Smith profile picture')).toBeTruthy();
  });

  test('tapping the picture opens the standard zoom modal', () => {
    render(<UserAvatar name="Alice Smith" pictureUrl="files/profile-pictures/soc-1/a.jpg" />);

    fireEvent.press(screen.getByLabelText('Alice Smith profile picture'));

    // ImageZoomModal toolbar becomes visible
    expect(screen.getByLabelText('Zoom in')).toBeTruthy();
  });

  test('does not open the zoom modal when zoom is disabled', () => {
    render(<UserAvatar name="Alice Smith" pictureUrl="files/profile-pictures/soc-1/a.jpg" zoom={false} />);

    fireEvent.press(screen.getByLabelText('Alice Smith profile picture'));

    expect(screen.queryByLabelText('Zoom in')).toBeNull();
  });
});
