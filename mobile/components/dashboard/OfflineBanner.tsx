import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useOfflineReports } from '../../hooks/use-offline-reports';
import { WifiOff, Wifi } from 'lucide-react-native';

export function OfflineBanner() {
  const { isOnline } = useOfflineReports();
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const prevOnlineRef = useRef(true);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else if (isOnline && !prevOnlineRef.current) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setShowBanner(false);
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  if (!showBanner) return null;

  return (
    <Animated.View 
      style={[
        styles.bannerContainer, 
        { transform: [{ translateY: slideAnim }] },
        isOnline ? styles.onlineBg : styles.offlineBg
      ]}
    >
      <View style={styles.contentRow}>
        {isOnline ? (
          <Wifi size={14} color="#FFFFFF" style={styles.iconStyle} />
        ) : (
          <WifiOff size={14} color="#FFFFFF" style={styles.iconStyle} />
        )}
        <Text style={styles.bannerText}>
          {isOnline ? 'Connection Restored' : 'Offline — features limited'}
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
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconStyle: {
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
