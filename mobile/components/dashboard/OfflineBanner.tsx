import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { useOfflineReports } from '../../hooks/use-offline-reports';
import { WifiOff, Wifi } from 'lucide-react-native';

export function OfflineBanner() {
  const { isOnline, syncing, isSyncingQueue, offlineQueue } = useOfflineReports();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerStatus, setBannerStatus] = useState<'offline' | 'syncing' | 'restored'>('offline');
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    // Clear any pending timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isOnline) {
      // 1. Offline State
      setBannerStatus('offline');
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else if (isSyncingQueue || syncing) {
      // 2. Online & Syncing State
      setBannerStatus('syncing');
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      // 3. Online & Fully Flushed/Synced
      // Only transition to restored and then auto-hide if the banner was already visible!
      if (showBanner) {
        setBannerStatus('restored');
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start();

        timerRef.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 350,
            useNativeDriver: true,
          }).start(() => {
            setShowBanner(false);
          });
        }, 2500);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isOnline, isSyncingQueue, syncing, showBanner]);

  if (!showBanner) return null;

  let bgStyle = styles.offlineBg;
  if (bannerStatus === 'syncing') {
    bgStyle = styles.syncBg;
  } else if (bannerStatus === 'restored') {
    bgStyle = styles.onlineBg;
  }

  return (
    <Animated.View 
      style={[
        styles.bannerContainer, 
        { transform: [{ translateY: slideAnim }] },
        bgStyle
      ]}
    >
      <View style={styles.contentRow}>
        {bannerStatus === 'offline' && (
          <WifiOff size={14} color="#FFFFFF" style={styles.iconStyle} />
        )}
        {bannerStatus === 'syncing' && (
          <ActivityIndicator size="small" color="#FFFFFF" style={styles.loaderStyle} />
        )}
        {bannerStatus === 'restored' && (
          <Wifi size={14} color="#FFFFFF" style={styles.iconStyle} />
        )}
        <Text style={styles.bannerText}>
          {bannerStatus === 'offline' && 'Offline — features limited'}
          {bannerStatus === 'syncing' && (
            isSyncingQueue && offlineQueue.length > 0
              ? `Syncing ${offlineQueue.length} pending updates...`
              : syncing
              ? 'Uploading report drafts...'
              : 'Restoring connections...'
          )}
          {bannerStatus === 'restored' && 'Connection Restored'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  offlineBg: {
    backgroundColor: '#F97316', // Safety Orange
  },
  onlineBg: {
    backgroundColor: '#22C55E', // Baliwag Success Green
  },
  syncBg: {
    backgroundColor: '#3B82F6', // Dynamic Info Blue
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStyle: {
    marginRight: 8,
  },
  loaderStyle: {
    marginRight: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
