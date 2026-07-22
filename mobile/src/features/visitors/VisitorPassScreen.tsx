import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { useAuthStore } from '../../store/authStore';
import { useVisitor, useCheckOutVisitor } from './hooks/useVisitors';
import { visitorsApi } from '../../api/endpoints/visitors';
import { AppHeader } from '../../shared/components/AppHeader';
import { StatusChip } from '../../shared/components/StatusChip';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { ImageZoomModal } from '../../shared/components/ImageZoomModal';
import { resolveFileUrl } from '../../camera/imageUpload';
import { normalizeError } from '../../shared/utils/errors';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { formatDateTime } from '../../shared/utils/date';

interface VisitorPassScreenProps {
  route: { params: { id: string } };
}

/** The backend returns the QR as a base64 PNG (or a ready data URI). */
function qrImageUri(qrCode: string): string {
  return qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`;
}

// Public web pass page origin — the same link the web app's "Copy pass link" produces.
// Configure per environment via the WEB_BASE_URL env in eas.json build profiles.
const WEB_BASE_URL = process.env['WEB_BASE_URL'] ?? 'http://localhost:4200';

function publicPassLink(passCode: string): string {
  return `${WEB_BASE_URL}/visitor-pass/${encodeURIComponent(passCode)}`;
}

export function VisitorPassScreen({ route }: VisitorPassScreenProps) {
  const societyId = useSocietyId();
  const { id } = route.params;
  const { data: visitor, isLoading } = useVisitor(societyId, id);
  const role = useAuthStore((s) => s.user?.rl ?? '');
  const canManageVisitors = role === 'SUAdmin' || role === 'SUSecurity';
  const { mutateAsync: checkOut, isPending: isCheckingOut } = useCheckOutVisitor(societyId);
  const [sharing, setSharing] = React.useState(false);
  const [photoZoomVisible, setPhotoZoomVisible] = React.useState(false);

  async function handleCheckOut(): Promise<void> {
    try {
      await checkOut(id);
    } catch (e) {
      Alert.alert('Could not check out the visitor', normalizeError(e));
    }
  }

  /** Native share sheet — pass link + code + details, matching the web app's "Copy pass link". */
  async function handleNativeShare(): Promise<void> {
    if (!visitor) return;
    await Share.share({
      message:
        `OurHome visitor pass for ${visitor.vn}\n` +
        `Pass code: ${visitor.pc}\n` +
        (visitor.pc ? `View pass: ${publicPassLink(visitor.pc)}\n` : '') +
        `Host: ${visitor.hrn} (${visitor.hbn} ${visitor.hfn}-${visitor.hft})` +
        (visitor.vu ? `\nValid until: ${formatDateTime(visitor.vu)}` : ''),
    });
  }

  /** Backend emails/texts the visitor a link to the public pass page. */
  async function handleSendToVisitor(): Promise<void> {
    if (!visitor) return;
    setSharing(true);
    try {
      await visitorsApi.sharePass(societyId, visitor.id, {
        email: visitor.ve || undefined,
        phone: visitor.vp || undefined,
      });
      Alert.alert('Pass sent', `The pass link has been sent to ${visitor.vn}.`);
    } catch (e) {
      Alert.alert('Could not send the pass', normalizeError(e));
    } finally {
      setSharing(false);
    }
  }

  const showPass = visitor != null && (visitor.st === 'Approved' || visitor.st === 'CheckedIn');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Visitor Pass" showBack />
      <LoadingOverlay visible={isLoading || isCheckingOut || sharing} />
      {visitor != null && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.passCard}>
            <Text style={styles.passLabel}>VISITOR PASS</Text>
            {!!visitor.img && (
              <TouchableOpacity
                onPress={() => setPhotoZoomVisible(true)}
                accessibilityLabel="View visitor photo"
              >
                <Image
                  source={{ uri: resolveFileUrl(visitor.img) }}
                  style={styles.visitorPhoto}
                />
              </TouchableOpacity>
            )}
            {showPass && visitor.qr && !visitor.ipe ? (
              <Image
                source={{ uri: qrImageUri(visitor.qr) }}
                style={styles.qrImage}
                accessibilityLabel="Visitor pass QR code"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <Text style={styles.qrText}>{visitor.ipe ? 'EXPIRED' : '—'}</Text>
                <Text style={styles.qrId}>{visitor.pc || visitor.id.slice(0, 8)}</Text>
              </View>
            )}
            {!!visitor.pc && (
              <Text style={styles.passCode}>Pass code: {visitor.pc}</Text>
            )}
            <Text style={styles.visitorName}>{visitor.vn}</Text>
            <Text style={styles.meta}>Phone: {visitor.vp}</Text>
            <Text style={styles.meta}>Purpose: {visitor.pu}</Text>
            <Text style={styles.meta}>
              Host: {visitor.hrn} · {visitor.hbn} {visitor.hfn}-{visitor.hft}
            </Text>
            {visitor.vu != null && (
              <Text style={styles.meta}>Valid until: {formatDateTime(visitor.vu)}</Text>
            )}

            <View style={styles.statusRow}>
              <StatusChip status={visitor.st} />
            </View>

            {visitor.cit != null && (
              <Text style={styles.time}>
                Check-in: {formatDateTime(visitor.cit)}
              </Text>
            )}
            {visitor.cot != null && (
              <Text style={styles.time}>
                Check-out: {formatDateTime(visitor.cot)}
              </Text>
            )}

            {showPass && !visitor.ipe && (
              <View style={styles.shareRow}>
                <TouchableOpacity
                  style={[styles.shareBtn, styles.shareBtnOutline]}
                  onPress={() => void handleNativeShare()}
                  accessibilityLabel="Share pass"
                >
                  <Text style={styles.shareBtnOutlineText}>Share…</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={() => void handleSendToVisitor()}
                  disabled={sharing}
                  accessibilityLabel="Send pass to visitor"
                >
                  <Text style={styles.shareBtnText}>Email / SMS to visitor</Text>
                </TouchableOpacity>
              </View>
            )}

            {canManageVisitors && visitor.st === 'CheckedIn' && (
              <TouchableOpacity
                style={styles.checkOutBtn}
                onPress={() => void handleCheckOut()}
                disabled={isCheckingOut}
                accessibilityLabel="Check out visitor"
              >
                <Text style={styles.checkOutBtnText}>Check Out Visitor</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
      {visitor?.img != null && (
        <ImageZoomModal
          visible={photoZoomVisible}
          uri={resolveFileUrl(visitor.img)}
          onClose={() => setPhotoZoomVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  passCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  passLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  visitorPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: spacing.md,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  qrImage: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  qrPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: colors.background,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.disabled,
  },
  qrId: { fontSize: typography.fontSize.xs, color: colors.text.disabled },
  passCode: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  visitorName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  meta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  statusRow: { marginVertical: spacing.sm },
  time: {
    fontSize: typography.fontSize.xs,
    color: colors.text.disabled,
    marginTop: 4,
  },
  shareRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  shareBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  shareBtnText: { color: '#FFF', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  shareBtnOutlineText: { color: colors.primary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold },
  checkOutBtn: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
  },
  checkOutBtnText: {
    color: '#FFF',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
