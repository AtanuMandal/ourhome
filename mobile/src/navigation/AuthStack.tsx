import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../auth/useAuth';
import { authApi, type PasswordResetOption } from '../api/endpoints/auth';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { normalizeError } from '../shared/utils/errors';
import { LoadingOverlay } from '../shared/components/LoadingOverlay';

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  InviteAccept: { token: string };
};

type AuthNav = NativeStackNavigationProp<AuthStackParamList>;

// ──────────────────────────────────────────────────────────────────────────────
// LoginScreen
// ──────────────────────────────────────────────────────────────────────────────
function LoginScreen() {
  const navigation = useNavigation<AuthNav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Array<{ userId: string; societyId: string; societyName: string; role: string; apartmentLabel: string | null }> | null>(null);
  const { login } = useAuth();

  async function handleLogin(selectedUserId?: string): Promise<void> {
    if (!email || !password) {
      Alert.alert('Validation', 'Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, selectedUserId);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'REQUIRES_SELECTION') {
        setOptions((e as Error & { options: typeof options }).options);
      } else {
        Alert.alert('Login failed', normalizeError(e));
      }
    } finally {
      setLoading(false);
    }
  }

  if (options != null) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible={loading} />
        <View style={styles.card}>
          <Text style={styles.heading}>Select Account</Text>
          <Text style={styles.subheading}>Your email is linked to multiple accounts</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.userId}
              style={styles.optionRow}
              onPress={() => void handleLogin(opt.userId)}
            >
              <View style={styles.optionLeft}>
                <Text style={styles.optionSociety}>{opt.societyName}</Text>
                <Text style={styles.optionMeta}>{opt.role}{opt.apartmentLabel ? ` · ${opt.apartmentLabel}` : ''}</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => setOptions(null)} style={styles.backLink}>
            <Text style={styles.backLinkText}>��� Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LoadingOverlay visible={loading} />
      <View style={styles.card}>
        <Text style={styles.heading}>OurHome</Text>
        <Text style={styles.subheading}>Society Management</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.text.disabled}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.text.disabled}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity style={styles.button} onPress={() => void handleLogin()}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// ForgotPasswordScreen — 2-step: request OTP → verify + set new password
// ──────────────────────────────────────────────────────────────────────────────
function ForgotPasswordScreen() {
  const navigation = useNavigation<AuthNav>();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<PasswordResetOption[] | null>(null);
  const [selectedOption, setSelectedOption] = useState<PasswordResetOption | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleRequestOtp(): Promise<void> {
    if (!email.trim()) { Alert.alert('Validation', 'Email is required.'); return; }
    setLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email.trim());
      if (res.requiresSelection && res.options.length > 1) {
        setOptions(res.options);
      } else {
        // Single account — OTP sent automatically
        const opt = res.options[0] ?? null;
        setSelectedOption(opt);
        setStep('confirm');
      }
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOption(opt: PasswordResetOption): void {
    setSelectedOption(opt);
    setOptions(null);
    setStep('confirm');
  }

  async function handleConfirm(): Promise<void> {
    if (!otpCode.trim() || !newPassword) {
      Alert.alert('Validation', 'OTP and new password are required.');
      return;
    }
    if (newPassword.length < 8) { Alert.alert('Validation', 'Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Validation', 'Passwords do not match.'); return; }
    if (!selectedOption) { Alert.alert('Error', 'No account selected.'); return; }

    setLoading(true);
    try {
      await authApi.confirmPasswordReset({
        userId: selectedOption.userId,
        societyId: selectedOption.societyId,
        otpCode: otpCode.trim(),
        newPassword,
      });
      Alert.alert('Success', 'Password reset successfully. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  if (options != null) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Select Account</Text>
          <Text style={styles.subheading}>Choose which account to reset</Text>
          {options.map((opt) => (
            <TouchableOpacity key={opt.userId} style={styles.optionRow} onPress={() => handleSelectOption(opt)}>
              <View style={styles.optionLeft}>
                <Text style={styles.optionSociety}>{opt.societyName}</Text>
                <Text style={styles.optionMeta}>{opt.role}{opt.apartmentLabel ? ` · ${opt.apartmentLabel}` : ''}</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  if (step === 'request') {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LoadingOverlay visible={loading} />
        <View style={styles.card}>
          <Text style={styles.heading}>Reset Password</Text>
          <Text style={styles.subheading}>We'll send an OTP to your email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.text.disabled}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.button} onPress={() => void handleRequestOtp()}>
            <Text style={styles.buttonText}>Send OTP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.forgotLinkText}>← Back to login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LoadingOverlay visible={loading} />
      <View style={styles.card}>
        <Text style={styles.heading}>Enter OTP</Text>
        <Text style={styles.subheading}>Check your email for the one-time code</Text>
        <TextInput
          style={styles.input}
          placeholder="OTP code"
          placeholderTextColor={colors.text.disabled}
          value={otpCode}
          onChangeText={setOtpCode}
          autoCapitalize="none"
          keyboardType="default"
        />
        <TextInput
          style={styles.input}
          placeholder="New password (min 8 chars)"
          placeholderTextColor={colors.text.disabled}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.text.disabled}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={() => void handleConfirm()}>
          <Text style={styles.buttonText}>Reset Password</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.forgotLink} onPress={() => setStep('request')}>
          <Text style={styles.forgotLinkText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// InviteAcceptScreen — registration via invite token
// ──────────────────────────────────────────────────────────────────────────────
function InviteAcceptScreen({ route }: { route: { params?: { token?: string } } }) {
  const navigation = useNavigation<AuthNav>();
  const token = route.params?.token ?? '';

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [societyName, setSocietyName] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) { setInviteError('No invite token provided.'); setValidating(false); return; }
    authApi.validateInvite(token)
      .then((res) => {
        if (!res.isValid) { setInviteError('This invite link is invalid or has expired.'); }
        else { setSocietyName(res.societyName); setPrefillEmail(res.email); setEmail(res.email); }
      })
      .catch(() => setInviteError('Could not validate invite link.'))
      .finally(() => setValidating(false));
  }, [token]);

  async function handleRegister(): Promise<void> {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Validation', 'All fields are required.'); return;
    }
    if (!/^\d{10}$/.test(phone.trim())) { Alert.alert('Validation', 'Phone must be 10 digits.'); return; }
    if (password.length < 8) { Alert.alert('Validation', 'Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { Alert.alert('Validation', 'Passwords do not match.'); return; }

    setLoading(true);
    try {
      await authApi.selfRegister({ inviteToken: token, fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), password });
      Alert.alert('Account Created', 'Your account has been created. Please log in.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (e) {
      Alert.alert('Error', normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.subheading, { marginTop: spacing.md, textAlign: 'center' }]}>Validating invite…</Text>
      </View>
    );
  }

  if (inviteError) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Invalid Invite</Text>
          <Text style={[styles.subheading, { color: colors.error }]}>{inviteError}</Text>
          <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LoadingOverlay visible={loading} />
      <ScrollView contentContainerStyle={styles.scrollCard} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Join {societyName}</Text>
        <Text style={styles.subheading}>Complete your registration</Text>

        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={colors.text.disabled}
          value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={colors.text.disabled}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Phone (10 digits)" placeholderTextColor={colors.text.disabled}
          value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Password (min 8 chars)" placeholderTextColor={colors.text.disabled}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor={colors.text.disabled}
          value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={() => void handleRegister()}>
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Stack
// ──────────────────────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="InviteAccept" component={InviteAcceptScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  heading: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  forgotLink: { alignItems: 'center', marginTop: spacing.md },
  forgotLinkText: { fontSize: typography.fontSize.sm, color: colors.primary },
  backLink: { alignItems: 'center', marginTop: spacing.md },
  backLinkText: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  optionLeft: { flex: 1 },
  optionSociety: { fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  optionMeta: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginTop: 2 },
  optionArrow: { fontSize: typography.fontSize.xl, color: colors.text.disabled },
});
