import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StaffListScreen } from '../../../src/features/staff/StaffListScreen';
import { useAuthStore } from '../../../src/store/authStore';
import type { Staff, StaffAttendance } from '../../../src/api/types';

const mockCheckIn = jest.fn();
const mockCheckOut = jest.fn();
const mockDeactivate = jest.fn();
let mockStaffData: Staff[] = [];
let mockOnDutyData: StaffAttendance[] = [];

jest.mock('../../../src/features/staff/hooks/useStaff', () => ({
  useStaffList: () => ({
    data: mockStaffData,
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    refetch: jest.fn(),
  }),
  useOnDutyStaff: () => ({ data: mockOnDutyData }),
  useCheckInStaff: () => ({ mutate: mockCheckIn, isPending: false }),
  useCheckOutStaff: () => ({ mutate: mockCheckOut, isPending: false }),
  useDeactivateStaff: () => ({ mutate: mockDeactivate, isPending: false }),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return { MaterialIcons: (props: Record<string, unknown>) => <Text>{String(props.name)}</Text> };
});

function makeStaff(overrides: Partial<Staff>): Staff {
  return {
    id: overrides.id ?? 's1',
    societyId: 'soc-1',
    fullName: overrides.fullName ?? 'John Guard',
    phone: overrides.phone ?? '9876543210',
    category: overrides.category ?? 'Security',
    employmentType: overrides.employmentType ?? 'OnPayroll',
    isActive: overrides.isActive ?? true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Staff;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <StaffListScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('StaffListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStaffData = [];
    mockOnDutyData = [];
  });

  function setUser(role: 'SUAdmin' | 'SUSecurity') {
    useAuthStore.setState({
      user: { id: 'viewer1', societyId: 'soc-1', fullName: 'Viewer', email: 'v@a.com', phone: '1', role, residentType: 'SocietyAdmin', apartmentId: undefined, isVerified: true, isActive: true },
      token: 'tok',
      isAuthenticated: true,
    });
  }

  test('shows Check In for a staff member not currently on duty', async () => {
    setUser('SUSecurity');
    mockStaffData = [makeStaff({ id: '1', fullName: 'John Guard' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('John Guard')).toBeTruthy());
    expect(screen.getByText('Check In')).toBeTruthy();
    expect(screen.queryByText('On Duty')).toBeNull();
  });

  test('shows On Duty badge and Check Out for a staff member currently checked in', async () => {
    setUser('SUSecurity');
    mockStaffData = [makeStaff({ id: '1', fullName: 'John Guard' })];
    mockOnDutyData = [{ id: 'a1', societyId: 'soc-1', staffId: '1', staffName: 'John Guard', attendanceDate: '2026-01-01', isLate: false, status: 'CheckedIn' }];

    renderScreen();

    await waitFor(() => expect(screen.getByText('John Guard')).toBeTruthy());
    expect(screen.getByText('On Duty')).toBeTruthy();
    expect(screen.getByText('Check Out')).toBeTruthy();
  });

  test('tapping Check In calls the mutation with the staff id', async () => {
    setUser('SUSecurity');
    mockStaffData = [makeStaff({ id: '1', fullName: 'John Guard' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('John Guard')).toBeTruthy());
    fireEvent.press(screen.getByText('Check In'));

    expect(mockCheckIn).toHaveBeenCalledWith('1', expect.anything());
  });

  test('SUSecurity does not see the add-staff FAB or attendance report link', async () => {
    setUser('SUSecurity');
    mockStaffData = [makeStaff({ id: '1', fullName: 'John Guard' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('John Guard')).toBeTruthy());
    expect(screen.queryByText('View Attendance Report →')).toBeNull();
  });

  test('SUAdmin sees the attendance report link', async () => {
    setUser('SUAdmin');
    mockStaffData = [makeStaff({ id: '1', fullName: 'John Guard' })];

    renderScreen();

    await waitFor(() => expect(screen.getByText('John Guard')).toBeTruthy());
    expect(screen.getByText('View Attendance Report →')).toBeTruthy();
  });
});
