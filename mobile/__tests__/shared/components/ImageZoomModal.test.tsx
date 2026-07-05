import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ImageZoomModal } from '../../../src/shared/components/ImageZoomModal';

describe('ImageZoomModal', () => {
  test('is not visible when visible=false', () => {
    render(<ImageZoomModal visible={false} uri="https://example.com/photo.jpg" onClose={jest.fn()} />);
    expect(screen.queryByText('100%')).toBeNull();
  });

  test('starts at 100% zoom when opened', () => {
    render(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={jest.fn()} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  test('zoom in increases the displayed percentage up to 400%', () => {
    render(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={jest.fn()} />);

    const zoomIn = screen.getByLabelText('Zoom in');
    for (let i = 0; i < 10; i++) fireEvent.press(zoomIn);

    expect(screen.getByText('400%')).toBeTruthy();
  });

  test('zoom out decreases the displayed percentage down to 100%', () => {
    render(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={jest.fn()} />);

    const zoomIn = screen.getByLabelText('Zoom in');
    fireEvent.press(zoomIn);
    fireEvent.press(zoomIn);

    const zoomOut = screen.getByLabelText('Zoom out');
    for (let i = 0; i < 10; i++) fireEvent.press(zoomOut);

    expect(screen.getByText('100%')).toBeTruthy();
  });

  test('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    render(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  test('resets zoom back to 100% each time it is reopened', () => {
    const { rerender } = render(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={jest.fn()} />);

    fireEvent.press(screen.getByLabelText('Zoom in'));
    expect(screen.getByText('150%')).toBeTruthy();

    rerender(<ImageZoomModal visible={false} uri="https://example.com/photo.jpg" onClose={jest.fn()} />);
    rerender(<ImageZoomModal visible uri="https://example.com/photo.jpg" onClose={jest.fn()} />);

    expect(screen.getByText('100%')).toBeTruthy();
  });
});
