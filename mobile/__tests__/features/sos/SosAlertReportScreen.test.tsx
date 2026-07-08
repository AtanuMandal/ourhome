import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SosAlertReportScreen } from '../../../src/features/sos/SosAlertReportScreen';
import type { SosAlertReport } from '../../../src/api/types';

let mockReport: SosAlertReport | undefined;

jest.mock('../../../src/features/sos/hooks/useSos', () => ({
  useSosAlertReport: () => ({ data: mockReport, isLoading: false }),
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
        <SosAlertReportScreen />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

describe('SosAlertReportScreen', () => {
  beforeEach(() => {
    mockReport = undefined;
  });

  test('shows an empty state when there is no report data', async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByText('No SOS alerts for this range')).toBeTruthy());
  });

  test('renders summary metrics and category breakdown', async () => {
    mockReport = {
      fromDate: '2026-01-01T00:00:00Z',
      toDate: '2026-01-31T00:00:00Z',
      totalAlerts: 4,
      falseAlarmCount: 1,
      falseAlarmRatePercent: 25,
      averageAcknowledgeSeconds: 45,
      averageResolveSeconds: 300,
      byCategory: [{ category: 'Fire', count: 3 }, { category: 'Medical', count: 1 }],
    };

    renderScreen();

    await waitFor(() => expect(screen.getByText('4')).toBeTruthy());
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('Fire')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });
});
