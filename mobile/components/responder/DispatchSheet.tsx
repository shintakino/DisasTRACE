import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Vibration, Image, Modal, Alert, ScrollView } from 'react-native';
import { MapPin, Camera, Maximize2, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useResponderStore } from '../../stores/useResponderStore';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const apiBaseUrl = () => (process.env.EXPO_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_MOBILE_API_URL?.replace(/\/api$/, '')
  || 'https://disas-trace.vercel.app').replace(/\/$/, '');

export function DispatchSheet() {
  const { status, activeDispatch, acceptDispatch, completeIncident } = useResponderStore();
  const offerDurationSeconds = activeDispatch?.dispatchOfferDurationSeconds ?? 30;
  const serverExpiry = activeDispatch?.offerExpiresAt ? Date.parse(activeDispatch.offerExpiresAt) : NaN;
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');
  const progress = useSharedValue(100);
  const [accepting, setAccepting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(offerDurationSeconds);
  const [serverClockOffsetMs, setServerClockOffsetMs] = useState(0);
  
  // Start off-screen at the top.
  const translateY = useSharedValue(-800);

  // Trigger continuous vibration when an emergency alert is offered
  useEffect(() => {
    if (status === 'dispatch_offered') {
      Vibration.vibrate([1000, 1000], true);
    } else {
      Vibration.cancel();
    }
    return () => {
      Vibration.cancel();
    };
  }, [status]);

  useEffect(() => {
    if (status !== 'dispatch_offered') {
      setServerClockOffsetMs(0);
      return;
    }

    let cancelled = false;
    const syncServerClock = async () => {
      const requestStartedAt = Date.now();
      try {
        const apiUrl = apiBaseUrl();
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${apiUrl}/api/dispatch-clock`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        const payload = await response.json();
        const serverNow = Date.parse(payload.now);
        const responseReceivedAt = Date.now();
        if (!cancelled && response.ok && Number.isFinite(serverNow)) {
          // Use the midpoint to avoid treating network round-trip time as
          // client clock drift.
          setServerClockOffsetMs(serverNow - ((requestStartedAt + responseReceivedAt) / 2));
        }
      } catch (error) {
        // The persisted expiry is still a safe fallback when the phone is
        // briefly offline. Acceptance itself is always checked by the server.
        console.log('Dispatch clock sync failed:', error);
      }
    };

    void syncServerClock();
    return () => { cancelled = true; };
  }, [status, activeDispatch?.id]);

  useEffect(() => {
    if (status === 'dispatch_offered') {
      const expiresAt = Number.isFinite(serverExpiry)
        ? serverExpiry
        : Date.now() + serverClockOffsetMs + offerDurationSeconds * 1000;
      const currentServerTime = () => Date.now() + serverClockOffsetMs;
      const remainingMilliseconds = Math.max(0, expiresAt - currentServerTime());
      const updateCountdown = () => {
        setRemainingSeconds(Math.max(0, Math.ceil((expiresAt - currentServerTime()) / 1000)));
      };
      updateCountdown();
      const countdownId = setInterval(updateCountdown, 250);

      // Trigger success notification haptic pulse immediately to get attention
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate in from the top
      translateY.value = withSpring(insets.top + 16, {
        damping: 18,
        stiffness: 120,
        mass: 1
      });

      // Reset and animate the progress bar
      progress.value = Math.min(100, (remainingMilliseconds / (offerDurationSeconds * 1000)) * 100);
      progress.value = withTiming(0, { duration: remainingMilliseconds, easing: Easing.linear });

      // Auto-dismiss timeout
      const timeoutId = setTimeout(async () => {
        if (useResponderStore.getState().status === 'dispatch_offered') {
          // Reject dispatch automatically if timer expires
          try {
            const apiUrl = apiBaseUrl();
            const { data: { session } } = await supabase.auth.getSession();
            const reqHeaders: any = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
              reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
            }
            await fetch(`${apiUrl}/api/incidents/respond`, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                incidentId: activeDispatch?.id,
                action: 'REJECT'
              })
            });
          } catch (e) {
            console.log('Auto-reject failed:', e);
          }
          completeIncident(); // Dismiss
        }
      }, Math.max(0, expiresAt - currentServerTime()));

      return () => {
        clearInterval(countdownId);
        clearTimeout(timeoutId);
      };
    } else {
      // Animate out back to the top
      translateY.value = withTiming(-800, { duration: 300, easing: Easing.out(Easing.cubic) });
      progress.value = 100;
      setRemainingSeconds(offerDurationSeconds);
    }
  }, [status, insets.top, offerDurationSeconds, serverExpiry, serverClockOffsetMs]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`
    };
  });

  const pointerEvents = status === 'dispatch_offered' ? 'auto' : 'none';

  return (
    <>
      <Animated.View 
        className="absolute top-0 left-0 right-0 z-50 px-4"
        style={animatedStyle}
        pointerEvents={pointerEvents}
      >
        <View
          className="bg-white rounded-[28px] p-4 shadow-2xl shadow-slate-900/40"
          style={{
            // Never force a card taller than the visible safe area. Its
            // content scrolls while the accept action remains reachable.
            maxHeight: Math.max(0, screenHeight - insets.top - insets.bottom - 32),
            overflow: 'hidden',
          }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            nestedScrollEnabled
          >
          
          {/* Countdown Banner */}
          <View className="bg-[#E2E8F0]/40 rounded-2xl p-4 mb-4 relative overflow-hidden flex-row items-center justify-center">
            <Animated.View className="absolute top-0 bottom-0 left-0 bg-[#DBEAFE]" style={progressStyle} />
            <View className="items-center z-10 flex-row">
              <View className="w-4 h-4 border-2 border-[#1E3A8A] border-t-transparent rounded-full mr-3 animate-spin" />
              <View>
              <Text className="text-[#1E3A8A] font-black text-[16px] mb-0.5">
                {remainingSeconds > 0 ? `${remainingSeconds}s remaining` : 'Offer expired'}
              </Text>
              <Text className="text-[#475569] text-[11px] font-medium">Auto-dismissed and passed to the next available unit</Text>
              </View>
            </View>
          </View>

          {/* Incident Details */}
          <Text className="text-2xl tracking-tight font-black text-[#0F172A] mb-1">
            {activeDispatch?.type || 'Emergency'}
          </Text>
          <View className="flex-row items-center mb-4">
            <MapPin size={14} color="#0F172A" strokeWidth={3} />
            <Text className="text-[#334155] text-xs ml-1.5 font-bold tracking-wide">
              {activeDispatch?.locationName || 'Location unavailable'} · {activeDispatch?.distance || 'Distance pending'}
            </Text>
          </View>

          {/* Metrics Grid */}
          <View className="flex-row space-x-3 mb-4">
            <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[20px] py-3 px-2 items-center justify-center">
              <Text
                className="text-[#991B1B] font-black text-[12px] uppercase tracking-tight"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {activeDispatch?.natureOfCall || 'EMERGENCY'}
              </Text>
              <Text className="text-[#64748B] text-[8px] font-bold mt-1 uppercase tracking-[0.15em]">NATURE OF CALL</Text>
            </View>
            <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[20px] py-3 px-2 items-center justify-center relative overflow-hidden">
              <View className="absolute bg-[#F1F5F9] w-10 h-10 rounded-full -top-2 opacity-80" />
              <Text className="text-[#334155] font-black text-lg z-10">{activeDispatch?.peopleInvolved || '1'}</Text>
              <Text className="text-[#475569] text-[8px] font-bold mt-0.5 uppercase tracking-[0.15em] z-10">PERSONS</Text>
            </View>
            <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[20px] py-3 px-2 items-center justify-center">
              <Text className="text-[#1E3A8A] font-black text-lg tracking-tight">{activeDispatch?.eta ?? 'Calculating'}</Text>
              <Text className="text-[#64748B] text-[8px] font-bold mt-0.5 uppercase tracking-[0.15em]">ETA</Text>
            </View>
          </View>

          {/* Reporter Info */}
          <View className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-[20px] p-3.5 flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-[#1E3A8A] items-center justify-center shadow-sm">
                <Text className="text-white font-bold text-[14px]">{activeDispatch?.reporterInitials || 'R'}</Text>
              </View>
              <View className="ml-3">
                <Text className="text-[#0F172A] font-black text-[13px]">{activeDispatch?.reporterName || 'Resident'}</Text>
                <Text className="text-[#64748B] text-[9px] mt-0.5 font-bold uppercase tracking-[0.05em]">{activeDispatch?.reporterPhone || (activeDispatch?.attachmentUrl ? 'Live photo attached' : 'No photo attached')}</Text>
              </View>
            </View>
            <Text className="text-[#475569] text-[10px] font-semibold tracking-wide">{activeDispatch?.timestamp || ''}</Text>
          </View>

          {/* Captured Resident Photo Preview */}
          {activeDispatch?.attachmentUrl ? (
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => setPreviewImage(activeDispatch.attachmentUrl || null)}
              className="mb-4 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm relative h-36"
            >
              <Image 
                source={{ uri: activeDispatch.attachmentUrl }} 
                className="w-full h-full" 
                resizeMode="cover"
              />
              <View className="absolute bottom-0 left-0 right-0 bg-slate-950/80 p-2 flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Camera size={13} color="#38BDF8" />
                  <Text className="text-white text-[11px] font-bold">Resident Captured Photo</Text>
                </View>
                <View className="bg-blue-600/90 px-2 py-0.5 rounded flex-row items-center gap-1">
                  <Maximize2 size={10} color="white" />
                  <Text className="text-white text-[10px] font-bold">Expand</Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : null}
          </ScrollView>

          {/* Actions Button Row */}
          <View className="flex-row">
            <TouchableOpacity 
              className="bg-[#1E3A8A] rounded-[20px] py-4 items-center shadow-lg shadow-[#1E3A8A]/30 active:bg-blue-900 flex-1 flex-row justify-center"
              disabled={accepting}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                progress.value = 100; // Cancel animation
                setAccepting(true);
                try {
                  const apiUrl = apiBaseUrl();
                  const { data: { session } } = await supabase.auth.getSession();
                  const reqHeaders: any = { 'Content-Type': 'application/json' };
                  if (session?.access_token) {
                    reqHeaders['Authorization'] = `Bearer ${session.access_token}`;
                  }

                  const response = await fetch(`${apiUrl}/api/incidents/respond`, {
                    method: 'POST',
                    headers: reqHeaders,
                    body: JSON.stringify({
                      incidentId: activeDispatch?.id,
                      action: 'ACCEPT'
                    })
                  });
                  const res = await response.json();
                  if (res.success) {
                    acceptDispatch();
                  } else {
                    Alert.alert(
                      "Dispatch not accepted",
                      res.error || "This offer may have expired or been reassigned.",
                    );
                  }
                } catch (err) {
                  console.error("Failed to accept dispatch offer:", err);
                  Alert.alert(
                    "Dispatch not accepted",
                    "The server could not confirm this dispatch. Check your connection and try again.",
                  );
                } finally {
                  setAccepting(false);
                }
              }}
            >
              {accepting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-bold text-[16px] tracking-wide">Accept Dispatch</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>

      {/* Expanded Image Full-Screen Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View className="flex-1 bg-black/90 justify-center items-center p-4 relative">
          <TouchableOpacity 
            onPress={() => setPreviewImage(null)}
            className="absolute top-12 right-6 z-50 bg-white/20 p-2.5 rounded-full"
          >
            <X color="white" size={24} />
          </TouchableOpacity>
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              className="w-full h-4/5 rounded-2xl" 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </>
  );
}
