import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { MapPin } from 'lucide-react-native';
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

export function DispatchSheet() {
  const { status, activeDispatch, acceptDispatch, completeIncident } = useResponderStore();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(100);
  
  // Start off-screen at the top.
  const translateY = useSharedValue(-800);

  useEffect(() => {
    if (status === 'dispatch_offered') {
      // Animate in from the top
      translateY.value = withSpring(insets.top + 16, {
        damping: 18,
        stiffness: 120,
        mass: 1
      });

      // Reset and animate the progress bar
      progress.value = 100;
      progress.value = withTiming(0, { duration: 5000, easing: Easing.linear });

      // Auto-dismiss timeout
      const timeoutId = setTimeout(async () => {
        if (useResponderStore.getState().status === 'dispatch_offered') {
          // Reject dispatch automatically if timer expires
          try {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
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
      }, 5000);

      return () => clearTimeout(timeoutId);
    } else {
      // Animate out back to the top
      translateY.value = withTiming(-800, { duration: 300, easing: Easing.out(Easing.cubic) });
      progress.value = 100;
    }
  }, [status, insets.top]);

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
    <Animated.View 
      className="absolute top-0 left-0 right-0 z-50 px-4"
      style={animatedStyle}
      pointerEvents={pointerEvents}
    >
      <View className="bg-white rounded-[32px] p-6 shadow-2xl shadow-slate-900/40">
        
        {/* Countdown Banner */}
        <View className="bg-[#E2E8F0]/40 rounded-2xl p-4 mb-6 relative overflow-hidden flex-row items-center justify-center">
          <Animated.View className="absolute top-0 bottom-0 left-0 bg-[#DBEAFE]" style={progressStyle} />
          <View className="items-center z-10 flex-row">
            <View className="w-4 h-4 border-2 border-[#1E3A8A] border-t-transparent rounded-full mr-3 animate-spin" />
            <View>
              <Text className="text-[#1E3A8A] font-bold text-[13px] mb-0.5">Respond within 5 seconds</Text>
              <Text className="text-[#475569] text-[11px] font-medium">Auto-dismissed passed to next available unit</Text>
            </View>
          </View>
        </View>

        {/* Incident Details */}
        <Text className="text-2xl tracking-tight font-black text-[#0F172A] mb-2">
          {activeDispatch?.type || 'Vehicular Collision'}
        </Text>
        <View className="flex-row items-center mb-6">
          <MapPin size={14} color="#0F172A" strokeWidth={3} />
          <Text className="text-[#334155] text-xs ml-1.5 font-bold tracking-wide">
            {activeDispatch?.locationName || 'Brgy. Sabang, Baliwag City'} · {activeDispatch?.distance || '1.7 km'}
          </Text>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[24px] py-4 px-2 items-center justify-center">
            <Text className="text-[#991B1B] font-black text-[15px] uppercase tracking-tight">{activeDispatch?.natureOfCall || 'EMERGENCY'}</Text>
            <Text className="text-[#64748B] text-[8px] font-bold mt-1.5 uppercase tracking-[0.15em]">NATURE OF CALL</Text>
          </View>
          <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[24px] py-4 px-2 items-center justify-center relative overflow-hidden">
            <View className="absolute bg-[#F1F5F9] w-12 h-12 rounded-full -top-2 opacity-80" />
            <Text className="text-[#334155] font-black text-xl z-10">{activeDispatch?.peopleInvolved || '3'}</Text>
            <Text className="text-[#475569] text-[8px] font-bold mt-0.5 uppercase tracking-[0.15em] z-10">PERSONS</Text>
          </View>
          <View className="flex-1 bg-white border border-[#E2E8F0] shadow-sm shadow-[#E2E8F0] rounded-[24px] py-4 px-2 items-center justify-center">
            <Text className="text-[#1E3A8A] font-black text-xl tracking-tight">{activeDispatch?.eta || '~8 min'}</Text>
            <Text className="text-[#64748B] text-[8px] font-bold mt-0.5 uppercase tracking-[0.15em]">ETA</Text>
          </View>
        </View>

        {/* Reporter Info */}
        <View className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-[24px] p-4 flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-[#1E3A8A] items-center justify-center shadow-sm">
              <Text className="text-white font-bold text-[15px]">{activeDispatch?.reporterInitials || 'EG'}</Text>
            </View>
            <View className="ml-3.5">
              <Text className="text-[#0F172A] font-black text-[14px]">{activeDispatch?.reporterName || 'Eloisa Guibani'}</Text>
              <Text className="text-[#64748B] text-[9px] mt-1 font-bold uppercase tracking-[0.05em]">{activeDispatch?.id || 'DR-2026-0847'} · Live photo attached</Text>
            </View>
          </View>
          <Text className="text-[#475569] text-[11px] font-semibold tracking-wide">{activeDispatch?.timestamp || '09:43 PM'}</Text>
        </View>

        {/* Accept Button */}
        <TouchableOpacity 
          className="bg-[#B91C1C] rounded-[20px] py-4 items-center shadow-lg shadow-[#B91C1C]/30 active:bg-red-800"
          onPress={async () => {
            progress.value = 100; // Cancel animation
            try {
              const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
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
                alert(res.error || "Failed to accept dispatch.");
              }
            } catch (err) {
              console.error("Failed to accept dispatch offer:", err);
              // Fallback to local state so UX remains intact during dev
              acceptDispatch();
            }
          }}
        >
          <Text className="text-white font-bold text-[16px] tracking-wide">Accept Dispatch</Text>
        </TouchableOpacity>

      </View>
    </Animated.View>
  );
}
