import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateWithBiometric,
  isBiometricAvailable,
} from '../../src/auth/biometric';

jest.mock('expo-local-authentication');

const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;

describe('biometric', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateWithBiometric', () => {
    test('returns false when hardware not supported', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await authenticateWithBiometric();

      expect(result).toBe(false);
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
    });

    test('returns false when not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await authenticateWithBiometric();

      expect(result).toBe(false);
      expect(mockLocalAuth.authenticateAsync).not.toHaveBeenCalled();
    });

    test('returns true on successful authentication', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: true,
        error: undefined as unknown as LocalAuthentication.AuthenticationError,
      });

      const result = await authenticateWithBiometric();

      expect(result).toBe(true);
      expect(mockLocalAuth.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Verify your identity',
        cancelLabel: 'Use password',
        disableDeviceFallback: false,
      });
    });

    test('returns false when authentication fails', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'user_cancel' as LocalAuthentication.AuthenticationError,
      });

      const result = await authenticateWithBiometric();

      expect(result).toBe(false);
    });
  });

  describe('isBiometricAvailable', () => {
    test('returns true when hardware present and enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);

      const result = await isBiometricAvailable();

      expect(result).toBe(true);
    });

    test('returns false when hardware not present', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await isBiometricAvailable();

      expect(result).toBe(false);
    });
  });
});
