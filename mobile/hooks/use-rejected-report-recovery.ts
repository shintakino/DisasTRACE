import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import type { ChatbotReporterMode } from '../lib/chatbot-contracts';
import { deriveRejectedReportTransition } from '../lib/rejected-report-workflow';
import { useChatbotStore } from '../store/use-chatbot-store';
import { useEmergencyReportStore } from '../store/use-emergency-report-store';
import { updateGuestReportHistory } from '../lib/guest-report-history';

const PACC_PHONE = '09436018271';

export function useRejectedReportRecovery(reporterMode: ChatbotReporterMode) {
  const router = useRouter();
  const hasHandledRejection = useRef(false);

  const handleRejectedReport = useCallback((rejectionReason?: string | null) => {
    if (hasHandledRejection.current) return;
    hasHandledRejection.current = true;

    const transition = deriveRejectedReportTransition({
      reporterMode,
      rejectionReason: rejectionReason ?? '',
    });
    const activeReport = useChatbotStore.getState().activeReport;
    if (reporterMode === 'guest' && activeReport) {
      void updateGuestReportHistory(activeReport.id, {
        status: 'REJECTED',
        responseStatus: transition.message,
        rejectionReason: rejectionReason?.trim() || 'No rejection reason was provided by PACC.',
      });
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    useChatbotStore.getState().clearReportToIdle();
    useEmergencyReportStore.getState().resetReport();

    Alert.alert(
      'Report rejected',
      transition.message,
      [
        { text: 'Home', onPress: () => router.replace(transition.homeRoute as never) },
        {
          text: 'Call PACC',
          onPress: () => {
            // The report stores are already clear. Leave the locked emergency
            // route before opening the dialer so returning from the call can
            // never strand the reporter on a terminal waiting screen.
            router.replace(transition.homeRoute as never);
            void Linking.openURL(`tel:${PACC_PHONE}`).catch(() => {
              Alert.alert('Call PACC', `Please call ${PACC_PHONE}.`);
            });
          },
        },
        { text: 'Start new report', onPress: () => router.replace(transition.startNewReportRoute as never) },
      ],
      { cancelable: false },
    );
  }, [reporterMode, router]);

  return { handleRejectedReport, hasHandledRejection };
}
