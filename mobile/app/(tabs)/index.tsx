import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStatus } from '../../hooks/use-auth-status';
import { useLocationPermission } from '../../hooks/use-location-permission';
import { LocationPermissionDrawer } from '../../components/dashboard/LocationPermissionDrawer';
import { HelpButton } from '../../components/dashboard/HelpButton';
import { OfflineBanner } from '../../components/dashboard/OfflineBanner';
import { MapPin, HelpCircle, Bell, Shield, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Tabs } from 'expo-router';
import { ResponderHome } from '../../components/responder/ResponderHome';
import { useResponderStore } from '../../stores/useResponderStore';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, verificationStatus, role, user, isLoaded } = useAuthStatus();
  const [isCheckingIncident, setIsCheckingIncident] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch and subscribe to unread notification count
  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('unread', true);
        
        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('[HomeScreen] Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();

    const instanceId = Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(`mobile_home_notifs_${user.id}_${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    let active = true;

    async function checkForActiveIncident() {
      if (!isLoaded || !user) {
        setIsCheckingIncident(false);
        return;
      }

      try {
        if (role === 'public_user') {
          console.log('[HomeScreen] Checking for active or pending incidents for resident:', user.id);
          
          // 1. Fetch latest verification request for the resident
          const { data: request, error: reqError } = await supabase
            .from('verification_requests')
            .select('*')
            .eq('resident_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (reqError) {
            console.error('[HomeScreen] Error fetching active verification request:', reqError);
            if (active) setIsCheckingIncident(false);
            return;
          }

          if (request) {
            console.log('[HomeScreen] Latest verification request found:', request.id, 'status:', request.status);
            
            if (request.status === 'PENDING') {
              // Restore store state and route to pending
              useEmergencyReportStore.setState({
                report: {
                  id: request.id,
                  requestId: request.request_id,
                  latitude: request.latitude,
                  longitude: request.longitude,
                  incidentType: request.type as any,
                  peopleInvolved: request.people_involved as any,
                  landmarks: request.location_description || undefined,
                  photoUri: request.image_url || '',
                  severity: request.severity as any,
                }
              });
              
              console.log('[HomeScreen] Redirecting to pending screen.');
              router.replace('/help/pending');
              return;
            } else if (request.status === 'VERIFIED') {
              // Check if there is an active (unresolved) incident associated with it
              const { data: incident, error: incError } = await supabase
                .from('incidents')
                .select('*')
                .eq('request_id', request.id)
                .maybeSingle();

              if (incError) {
                console.error('[HomeScreen] Error fetching incident:', incError);
              }

              if (incident && incident.status !== 'RESOLVED') {
                console.log('[HomeScreen] Active incident found:', incident.id, 'status:', incident.status);
                
                // Restore store state and route to tracking
                useEmergencyReportStore.setState({
                  report: {
                    id: request.id,
                    requestId: request.request_id,
                    incidentId: incident.id,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    incidentType: request.type as any,
                    peopleInvolved: request.people_involved as any,
                    landmarks: request.location_description || undefined,
                    photoUri: request.image_url || '',
                    severity: request.severity as any,
                  }
                });
                
                if (incident.responder_id) {
                  console.log('[HomeScreen] Redirecting to tracking screen.');
                  router.replace('/help/tracking');
                } else {
                  console.log('[HomeScreen] Active incident has no responder assigned yet. Redirecting to pending screen.');
                  router.replace('/help/pending');
                }
                return;
              }
            }
          }
        } else if (role === 'ambulance_responder') {
          console.log('[HomeScreen] Checking for active dispatch in database for responder:', user.id);
          const { data: activeInc, error } = await supabase
            .from('incidents')
            .select('*')
            .eq('responder_id', user.id)
            .neq('status', 'RESOLVED')
            .maybeSingle();

          if (error) throw error;

          if (activeInc) {
            console.log('[HomeScreen] Found active incident in DB to resume:', activeInc);
            
            let reporterName = 'Resident';
            let reporterInitials = 'R';
            let locationName = 'Baliwag City';
            let typeOfEmergency = 'Medical Emergency';
            let peopleInvolved = 1;
            let incidentLat = 14.9538;
            let incidentLng = 120.9029;

            const { data: vReq } = await supabase
              .from('verification_requests')
              .select('*')
              .eq('id', activeInc.request_id)
              .single();

            if (vReq) {
              locationName = vReq.location_description || vReq.address || 'Baliwag City';
              typeOfEmergency = vReq.type || 'Emergency';
              incidentLat = vReq.latitude ? Number(vReq.latitude) : 14.9538;
              incidentLng = vReq.longitude ? Number(vReq.longitude) : 120.9029;
              
              if (vReq.people_involved) {
                const matched = vReq.people_involved.match(/\d+/);
                peopleInvolved = matched ? parseInt(matched[0], 10) : 1;
              }

              const { data: resUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', vReq.resident_id)
                .single();

              if (resUser) {
                reporterName = resUser.full_name || 'Resident';
                reporterInitials = reporterName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
              }
            }

            let storeStatus: any = 'en_route';
            if (activeInc.status === 'ARRIVED') {
              storeStatus = 'on_scene';
            }

            useResponderStore.setState({
              status: storeStatus,
              activeDispatch: {
                id: activeInc.id,
                type: typeOfEmergency,
                locationName,
                distance: '1.5 km',
                natureOfCall: 'Emergency',
                peopleInvolved,
                eta: activeInc.eta_minutes ? `~${activeInc.eta_minutes} min` : '~8 min',
                reporterName,
                reporterInitials,
                timestamp: new Date(activeInc.created_at).toLocaleTimeString("en-US", {
                  hour: '2-digit',
                  minute: '2-digit'
                }),
                coordinates: {
                  latitude: incidentLat,
                  longitude: incidentLng,
                },
                typeOfEmergency,
                assignedAmbulance: activeInc.assigned_ambulance || 'AMB-001',
                attachmentUrl: vReq?.image_url || undefined,
              }
            });
          } else {
            // If no accepted incident, check for pending dispatch offers
            console.log('[HomeScreen] Checking for pending dispatch offers in DB for responder:', user.id);
            const { data: offerInc, error: offerError } = await supabase
              .from('incidents')
              .select('*')
              .eq('current_offer_responder_id', user.id)
              .eq('status', 'DISPATCHED')
              .maybeSingle();

            if (!offerError && offerInc) {
              console.log('[HomeScreen] Found active offer in DB to resume:', offerInc);
              
              let reporterName = 'Resident';
              let reporterInitials = 'R';
              let locationName = 'Baliwag City';
              let typeOfEmergency = 'Medical Emergency';
              let peopleInvolved = 1;
              let incidentLat = 14.9538;
              let incidentLng = 120.9029;

              const { data: vReq } = await supabase
                .from('verification_requests')
                .select('*')
                .eq('id', offerInc.request_id)
                .single();

              if (vReq) {
                locationName = vReq.location_description || vReq.address || 'Baliwag City';
                typeOfEmergency = vReq.type || 'Emergency';
                incidentLat = vReq.latitude ? Number(vReq.latitude) : 14.9538;
                incidentLng = vReq.longitude ? Number(vReq.longitude) : 120.9029;
                
                if (vReq.people_involved) {
                  const matched = vReq.people_involved.match(/\d+/);
                  peopleInvolved = matched ? parseInt(matched[0], 10) : 1;
                }

                const { data: resUser } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', vReq.resident_id)
                  .single();

                if (resUser) {
                  reporterName = resUser.full_name || 'Resident';
                  reporterInitials = reporterName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase();
                }
              }

              useResponderStore.setState({
                status: 'dispatch_offered',
                activeDispatch: {
                  id: offerInc.id,
                  type: typeOfEmergency,
                  locationName,
                  distance: '1.5 km',
                  natureOfCall: 'Emergency',
                  peopleInvolved,
                  eta: offerInc.eta_minutes ? `~${offerInc.eta_minutes} min` : '~8 min',
                  reporterName,
                  reporterInitials,
                  timestamp: new Date(offerInc.created_at).toLocaleTimeString("en-US", {
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  coordinates: {
                    latitude: incidentLat,
                    longitude: incidentLng,
                  },
                  typeOfEmergency,
                  dispatchOfferDurationSeconds: offerInc.dispatch_offer_duration_seconds || 30,
                  assignedAmbulance: offerInc.assigned_ambulance || 'AMB-001',
                  attachmentUrl: vReq?.image_url || undefined,
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('[HomeScreen] Error in checkForActiveIncident:', err);
      } finally {
        if (active) {
          setIsCheckingIncident(false);
        }
      }
    }

    if (isLoaded) {
      checkForActiveIncident();
    }
  }, [isLoaded, role, user]);

  const { isLocationGateActive, requestPermissions } = useLocationPermission();
  
  // Fallback for initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = profile?.fullName ? getInitials(profile.fullName) : '??';

  const { status } = useResponderStore();

  if (!isLoaded || isCheckingIncident) {
    return (
      <View className="flex-1 bg-[#1E3A8A] justify-center items-center">
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white font-medium text-sm mt-4 tracking-wider uppercase opacity-80">
          Checking active incidents...
        </Text>
      </View>
    );
  }

  if (role === 'ambulance_responder') {
    return (
      <>
        <Tabs.Screen options={{ 
          tabBarStyle: status === 'idle' ? {
            backgroundColor: '#020617',
            borderTopWidth: 1,
            borderTopColor: '#1E293B',
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
            elevation: 0,
            shadowOpacity: 0,
          } : { display: 'none' } 
        }} />
        <ResponderHome />
      </>
    );
  }

  return (
    <View className="flex-1 bg-[#1E3A8A]">
      <OfflineBanner />
      <StatusBar barStyle="light-content" />
      
      {/* Header Section */}
      <View style={{ paddingTop: (StatusBar.currentHeight || 24) + 12 }}>
        <View className="px-6 py-4 flex-row justify-between items-start">
          <View>
            <View className="flex-row items-center">
              <MapPin size={20} color="white" opacity={0.8} />
              <Text className="text-white/80 text-xs ml-1 uppercase tracking-wider">Your Location</Text>
            </View>
            <Text className="text-white text-md font-bold mt-0.5">Baliwag City</Text>
          </View>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity className="p-2" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <HelpCircle size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2 relative" 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={24} color="white" />
              {unreadCount > 0 && (
                <View className="absolute top-1 right-1 flex h-[18px] w-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 border border-white">
                  <Text className="text-white text-[8px] font-black px-0.5 text-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Card */}
        <View className="px-6 pb-8 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="relative">
              <View className="w-14 h-14 rounded-full border border-white/40 items-center justify-center bg-[#1E3A8A] overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <Image 
                    source={{ uri: user.user_metadata.avatar_url }} 
                    style={{ width: '100%', height: '100%', borderRadius: 28 }} 
                  />
                ) : (
                  <Text className="text-white font-black text-xl tracking-tighter">{initials}</Text>
                )}
              </View>
              <View className="absolute top-0 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Check size={8} color="#1E3A8A" strokeWidth={5} />
              </View>
            </View>

            
            <View className="ml-4">
              <Text className="text-white text-lg font-bold leading-tight tracking-tight">
                {profile?.fullName || 'Eloisa Guibani'}
              </Text>
              <Text className="text-white/60 text-sm">
                {profile?.address || 'Barangay Paitan'}
              </Text>
            </View>
          </View>

          <View className="bg-white/20 px-3 py-1 rounded-full border border-white/5">
            <Text className="text-white text-[10px] font-black tracking-widest uppercase">Online</Text>
          </View>
        </View>
      </View>

      {/* Main Report Canvas */}
      <View className="flex-1 bg-white rounded-t-[32px] px-6 pt-10">
        <Text className="text-slate-400 text-[11px] font-medium text-center uppercase tracking-[2px] mb-12">
          Incident Reporting
        </Text>

        <View className="flex-1 items-center pt-2">
          <HelpButton onPress={() => router.push('/help/camera')} />
          
          <View className="mt-14 px-4">
            <Text className="text-slate-500 text-center text-sm leading-relaxed">
              Takes a <Text className="font-bold text-slate-700">live photo</Text> of the scene and files a report. Help reaches you faster.
            </Text>
          </View>
        </View>

        {/* Service Improvement Banner */}
        <View className="mb-10 overflow-hidden rounded-2xl shadow-sm shadow-red-900/10">
          <LinearGradient
            colors={['#B91C1C', '#991B1B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-5"
          >
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-white font-bold text-base">Help us improve our service</Text>
                <Text className="text-white/90 text-xs mt-0.5 leading-snug">
                  Spotted an issue in your area? Contact us so we can fix it.
                </Text>
              </View>
              <View className="bg-white/10 p-2 rounded-xl border border-white/10">
                <HelpCircle size={20} color="white" opacity={0.8} />
              </View>
            </View>
            
            <TouchableOpacity 
              className="bg-[#1E3A8A] rounded-xl py-2.5 items-center shadow-sm active:bg-blue-900"
              onPress={() => console.log('Contact Us pressed')}
            >
              <Text className="text-white font-bold text-sm">Contact Us</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>

      {/* Location Gate Overlay */}
      <LocationPermissionDrawer 
        isVisible={isLocationGateActive} 
        onRequestPermission={requestPermissions}
      />
    </View>
  );
}
