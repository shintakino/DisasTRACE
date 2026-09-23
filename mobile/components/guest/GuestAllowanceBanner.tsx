import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { guestAllowanceCopy } from '../../lib/guest-report-allowance';

interface GuestAllowanceBannerProps {
  remaining?: number;
  style?: StyleProp<ViewStyle>;
  showReminder?: boolean;
  showRegistrationAction?: boolean;
}

export function GuestAllowanceBanner({
  remaining,
  style,
  showReminder = true,
  showRegistrationAction = true,
}: GuestAllowanceBannerProps) {
  const router = useRouter();
  if (remaining === undefined) return null;
  const copy = guestAllowanceCopy(remaining);

  return (
    <View style={[styles.container, copy.exhausted && styles.exhausted, style]}>
      <Text style={[styles.headline, copy.exhausted && styles.exhaustedHeadline]}>{copy.headline}</Text>
      {showReminder ? <Text style={styles.reminder}>{copy.reminder}</Text> : null}
      {showRegistrationAction ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Create a DisasTRACE account"
          onPress={() => router.push('/(auth)/sign-up' as never)}
          style={styles.action}
        >
          <Text style={styles.actionText}>Create account</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  exhausted: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  headline: { color: '#1E3A8A', fontSize: 14, fontWeight: '900' },
  exhaustedHeadline: { color: '#9A3412' },
  reminder: { color: '#475569', fontSize: 12, lineHeight: 17, marginTop: 4 },
  action: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 40, paddingTop: 4 },
  actionText: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
});
