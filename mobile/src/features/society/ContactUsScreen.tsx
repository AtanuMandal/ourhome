import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocietyId } from '../../shared/hooks/useSocietyId';
import { AppHeader } from '../../shared/components/AppHeader';
import { LoadingOverlay } from '../../shared/components/LoadingOverlay';
import { EmptyState } from '../../shared/components/EmptyState';
import { societyApi, type Society } from '../../api/endpoints/society';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export function ContactUsScreen() {
  const societyId = useSocietyId();
  const [loading, setLoading] = useState(true);
  const [society, setSociety] = useState<Society | null>(null);

  useEffect(() => {
    if (!societyId) { setLoading(false); return; }
    societyApi.getSociety(societyId)
      .then(setSociety)
      .catch(() => setSociety(null))
      .finally(() => setLoading(false));
  }, [societyId]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <AppHeader title="Contact Us" showMenu />
      <LoadingOverlay visible={loading} />
      {!loading && !society ? (
        <EmptyState icon="📞" title="Not available" subtitle="Society contact information is not available." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {society && (
            <>
              <Text style={styles.societyName}>{society.nm}</Text>

              {(society.ce || society.cp) && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Society Office</Text>
                  {society.ce && (
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${society.ce}`)}>
                      <Text style={styles.contactText}>✉️ {society.ce}</Text>
                    </TouchableOpacity>
                  )}
                  {society.cp && (
                    <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`tel:${society.cp}`)}>
                      <Text style={styles.contactText}>📞 {society.cp}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Committees</Text>
                {society.cm.length === 0 ? (
                  <Text style={styles.emptyCopy}>No committees have been published yet.</Text>
                ) : (
                  society.cm.map((committee) => (
                    <View key={committee.nm} style={styles.committeeCard}>
                      <Text style={styles.committeeTitle}>{committee.nm}</Text>
                      {committee.mem.map((member) => (
                        <View key={member.uid + member.rt} style={styles.memberRow}>
                          <Text style={styles.memberName}>{member.fn}</Text>
                          <Text style={styles.memberRole}>{member.rt}</Text>
                        </View>
                      ))}
                    </View>
                  ))
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  societyName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  contactRow: { paddingVertical: spacing.xs },
  contactText: { fontSize: typography.fontSize.base, color: colors.text.primary },
  emptyCopy: { fontSize: typography.fontSize.sm, color: colors.text.secondary },
  committeeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  committeeTitle: { fontWeight: typography.fontWeight.semibold, color: colors.text.primary },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.xs },
  memberName: { fontSize: typography.fontSize.sm, color: colors.text.primary },
  memberRole: { fontSize: typography.fontSize.sm, color: colors.primary, fontWeight: typography.fontWeight.medium },
});
