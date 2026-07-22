import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { VisitorPassScreen } from '../../../src/features/visitors/VisitorPassScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Visitor } from '../../../src/api/types';

const mockCheckOutAsync = jest.fn();
let mockVisitor: Partial<Visitor>;

jest.mock('../../../src/features/visitors/hooks/useVisitors', () => ({
  useVisitor: () => ({ data: mockVisitor, isLoading: false }),
  useCheckOutVisitor: () => ({ mutateAsync: mockCheckOutAsync, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function makeVisitor(status: string): Partial<Visitor> {
  return {
    id: 'v1',
    vn: 'Jane Visitor',
    vp: '9876543210',
    pu: 'Delivery',
    hrn: 'Host Resident',
    hbn: 'A',
    hfn: 1,
    hft: '101',
    st: status,
    cit: status === 'CheckedIn' ? '2026-07-15T09:00:00Z' : undefined,
  };
}

function setUser(role: string): void {
  useAuthStore.setState({
    user: {
      id: 'u1', sid: 'soc-1', fn: 'Test User', em: 't@a.com', ph: '1',
      rl: role as never, rt: 'SocietyAdmin' as never, aid: undefined,
      vf: true, ac: true,
    },
    token: 'tok',
    isAuthenticated: true,
  });
}

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <VisitorPassScreen route={{ params: { id: 'v1' } }} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('VisitorPassScreen — security check-out', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckOutAsync.mockResolvedValue(undefined);
  });

  test('SUSecurity sees the Check Out button for a checked-in visitor and can check them out', async () => {
    mockVisitor = makeVisitor('CheckedIn');
    setUser('SUSecurity');

    renderScreen();

    const button = screen.getByLabelText('Check out visitor');
    fireEvent.press(button);

    await waitFor(() => expect(mockCheckOutAsync).toHaveBeenCalledWith('v1'));
  });

  test('SUAdmin also sees the Check Out button for a checked-in visitor', () => {
    mockVisitor = makeVisitor('CheckedIn');
    setUser('SUAdmin');

    renderScreen();

    expect(screen.getByLabelText('Check out visitor')).toBeTruthy();
  });

  test('a resident (SUUser) never sees the Check Out button', () => {
    mockVisitor = makeVisitor('CheckedIn');
    setUser('SUUser');

    renderScreen();

    expect(screen.queryByLabelText('Check out visitor')).toBeNull();
  });

  test('the Check Out button is hidden when the visitor is not checked in', () => {
    mockVisitor = makeVisitor('Approved');
    setUser('SUSecurity');

    renderScreen();

    expect(screen.queryByLabelText('Check out visitor')).toBeNull();
  });
});

describe('VisitorPassScreen — real QR pass and sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('an approved visitor with a QR code renders the scannable QR image and share actions', () => {
    mockVisitor = { ...makeVisitor('Approved'), qr: 'aGVsbG8=', pc: 'ABC123', ipe: false };
    setUser('SUUser');

    renderScreen();

    expect(screen.getByLabelText('Visitor pass QR code')).toBeTruthy();
    expect(screen.getByText('Pass code: ABC123')).toBeTruthy();
    expect(screen.getByLabelText('Share pass')).toBeTruthy();
    expect(screen.getByLabelText('Send pass to visitor')).toBeTruthy();
  });

  test('an expired pass shows the EXPIRED placeholder instead of a QR image and hides sharing', () => {
    mockVisitor = { ...makeVisitor('Approved'), qr: 'aGVsbG8=', pc: 'ABC123', ipe: true };
    setUser('SUUser');

    renderScreen();

    expect(screen.queryByLabelText('Visitor pass QR code')).toBeNull();
    expect(screen.getByText('EXPIRED')).toBeTruthy();
    expect(screen.queryByLabelText('Share pass')).toBeNull();
  });

  test('a pending visitor has no QR image or share actions', () => {
    mockVisitor = { ...makeVisitor('Pending'), pc: '', ipe: false };
    setUser('SUUser');

    renderScreen();

    expect(screen.queryByLabelText('Visitor pass QR code')).toBeNull();
    expect(screen.queryByLabelText('Share pass')).toBeNull();
  });
});
