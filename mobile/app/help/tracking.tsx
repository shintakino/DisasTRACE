import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Modal } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { Phone, MessageSquare, Check, AlertCircle, ChevronUp, ChevronDown, MapPin, CheckCircle2, Truck, Navigation } from 'lucide-react-native';
import { Hospital } from 'iconsax-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';

const { height, width } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 220;
const EXPANDED_HEIGHT = height * 0.85;

export default function TrackingScreen() {
  const router = useRouter();
  const report = useEmergencyReportStore((state) => state.report);
  
  const targetLocation = {
    latitude: report.latitude || 14.954,
    longitude: report.longitude || 120.901,
  };

  // Dummy location for ambulance slightly offset from the incident
  const [ambulanceLocation, setAmbulanceLocation] = useState({
    latitude: targetLocation.latitude + 0.015,
    longitude: targetLocation.longitude - 0.01,
  });

  const [eta, setEta] = useState(8);
  const [distance, setDistance] = useState(1.7);
  const [elapsed, setElapsed] = useState(0); // Natural elapsed time starting from 0
  const [isArrived, setIsArrived] = useState(false);
  const [hasDismissedArrivedModal, setHasDismissedArrivedModal] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0); // Starts at 0% and climbs dynamically
  
  const [routeCoords, setRouteCoords] = useState<number[][] | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const drawerHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const isExpandedRef = useRef(false);

  const [assignedResponder, setAssignedResponder] = useState<any>(null);
  const [isFindingAmbulance, setIsFindingAmbulance] = useState(true);
  const [liveResponderStatus, setLiveResponderStatus] = useState<string | null>(null);
  const [liveTargetHospital, setLiveTargetHospital] = useState<any | null>(null);

  // Pulse animation values for radar holding screen
  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;
  const pulseAnim3 = useRef(new Animated.Value(0)).current;

  // Trigger pulsing loop for radar animation
  useEffect(() => {
    if (isFindingAmbulance) {
      const createPulse = (anim: Animated.Value, delay: number) => {
        anim.setValue(0);
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0,
                duration: 2000,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
      };

      const animation1 = createPulse(pulseAnim1, 0);
      const animation2 = createPulse(pulseAnim2, 600);
      const animation3 = createPulse(pulseAnim3, 1200);

      animation1.start();
      animation2.start();
      animation3.start();

      return () => {
        animation1.stop();
        animation2.stop();
        animation3.stop();
      };
    }
  }, [isFindingAmbulance]);

  const toggleDrawer = () => {
    const nextExpand = !isExpandedRef.current;
    isExpandedRef.current = nextExpand;
    drawerHeight.stopAnimation();
    Animated.timing(drawerHeight, {
      toValue: nextExpand ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setDrawerExpanded(nextExpand);
  };

  // 1. Mount/focus sync: Fetch the current active incident for this request to ensure store is perfectly in sync
  useEffect(() => {
    const requestId = report.id;
    if (!requestId) return;

    let active = true;

    const syncIncidentState = async () => {
      try {
        console.log('[TrackingScreen] Syncing incident state for request:', requestId);
        const { data: incident, error } = await supabase
          .from('incidents')
          .select('id, status, responder_id')
          .eq('request_id', requestId)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error('[TrackingScreen] Error syncing incident:', error);
          return;
        }

        if (incident) {
          console.log('[TrackingScreen] Sync resolved active incident ID:', incident.id);
          // Sync store if incidentId is missing or stale
          if (incident.id !== report.incidentId) {
            useEmergencyReportStore.setState((state) => ({
              report: {
                ...state.report,
                incidentId: incident.id
              }
            }));
          }
          
          if (incident.status === 'RESOLVED') {
            router.replace('/help/resolution');
            return;
          }
          
          if (incident.status === 'ARRIVED') {
            setIsArrived(true);
          }
          
          if (incident.responder_id) {
            setIsFindingAmbulance(false);
            const { data: resp } = await supabase
              .from('users')
              .select('*')
              .eq('id', incident.responder_id)
              .single();
            if (resp && active) {
              setAssignedResponder(resp);
              if (resp.last_latitude && resp.last_longitude) {
                setAmbulanceLocation({
                  latitude: Number(resp.last_latitude),
                  longitude: Number(resp.last_longitude)
                });
              }
            }
          } else {
            setAssignedResponder(null);
            setIsFindingAmbulance(true);
          }
        } else {
          // No incident exists for this request in the database (e.g. cascaded out)
          console.log('[TrackingScreen] Sync found no active incident. Reverting to pending screen.');
          useEmergencyReportStore.setState((state) => ({
            report: {
              ...state.report,
              incidentId: undefined
            }
          }));
          router.replace('/help/pending');
        }
      } catch (err) {
        console.error('[TrackingScreen] Catch block error during sync:', err);
      }
    };

    syncIncidentState();

    return () => {
      active = false;
    };
  }, [report.id]);

  // 2. Request-level Incident Lifecycle Listener (Tracks inserts, updates, and deletes)
  useEffect(() => {
    const requestId = report.id;
    if (!requestId) return;

    console.log('[TrackingScreen] Subscribing to incident lifecycle updates for request:', requestId);

    const dbChannel = supabase
      .channel(`incident-lifecycle-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `request_id=eq.${requestId}`,
        },
        async (payload) => {
          console.log('[TrackingScreen] Real-time incident event received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newIncident = payload.new;
            if (newIncident) {
              // Sync store if incidentId changed (e.g. PACC manual dispatch created a new record)
              if (newIncident.id !== report.incidentId) {
                console.log('[TrackingScreen] Incident ID updated/created! Syncing to store:', newIncident.id);
                useEmergencyReportStore.setState((state) => ({
                  report: {
                    ...state.report,
                    incidentId: newIncident.id
                  }
                }));
              }

              if (newIncident.status === 'ARRIVED') {
                setIsArrived(true);
              }
              if (newIncident.status === 'RESOLVED') {
                router.replace('/help/resolution');
              }

              if (newIncident.responder_id) {
                const { data: resp } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', newIncident.responder_id)
                  .single();

                if (resp) {
                  setAssignedResponder(resp);
                  if (resp.last_latitude && resp.last_longitude) {
                    setAmbulanceLocation({
                      latitude: Number(resp.last_latitude),
                      longitude: Number(resp.last_longitude)
                    });
                  }
                  setIsFindingAmbulance((prev) => {
                    if (prev) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                    return false;
                  });
                }
              } else {
                setAssignedResponder(null);
                setIsFindingAmbulance(true);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('[TrackingScreen] Active incident deleted (cascade expired). Reverting back to pending triage queue.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            useEmergencyReportStore.setState((state) => ({
              report: {
                ...state.report,
                incidentId: undefined
              }
            }));
            router.replace('/help/pending');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
    };
  }, [report.id]);

  // 3. Incident-specific high-frequency telemetry broadcasts receiver
  useEffect(() => {
    const incidentId = report.incidentId;
    if (!incidentId) return;

    console.log('[TrackingScreen] Subscribing to coordinate telemetry channel for incident:', incidentId);

    // Fetch initial coordinates & info
    const fetchInitialResponderLocation = async () => {
      try {
        const { data: incident, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('id', incidentId)
          .single();

        if (!error && incident) {
          if (incident.status === 'RESOLVED') {
            router.replace('/help/resolution');
            return;
          }
          if (incident.status === 'ARRIVED') {
            setIsArrived(true);
          }
          
          if (incident.responder_id) {
            setIsFindingAmbulance(false);
            const { data: resp } = await supabase
              .from('users')
              .select('*')
              .eq('id', incident.responder_id)
              .single();
            
            if (resp) {
              setAssignedResponder(resp);
              if (resp.last_latitude && resp.last_longitude) {
                setAmbulanceLocation({
                  latitude: Number(resp.last_latitude),
                  longitude: Number(resp.last_longitude)
                });
              }
            }
          } else {
            setAssignedResponder(null);
            setIsFindingAmbulance(true);
          }
        }
      } catch (err) {
        console.error('Error fetching initial responder telemetry:', err);
      }
    };

    fetchInitialResponderLocation();

    // Coordinates channel (high frequency OSRM simulator telemetry broadcasts)
    const channel = supabase.channel(`incident-tracking:${incidentId}`);
    const sub = channel
      .on('broadcast', { event: 'telemetry' }, ({ payload }) => {
        console.log('[TrackingScreen] Real-time telemetry broadcast received:', payload);
        if (payload) {
          if (payload.latitude && payload.longitude) {
            setAmbulanceLocation({
              latitude: payload.latitude,
              longitude: payload.longitude
            });
          }
          if (payload.responderStatus) {
            setLiveResponderStatus(payload.responderStatus);
          }
          if (payload.targetHospital) {
            setLiveTargetHospital(payload.targetHospital);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [report.incidentId]);

  // Natural elapsed time incrementer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isArrived) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isArrived]);

  const isTransporting = liveResponderStatus === 'to_hospital' && liveTargetHospital;
  const displayProgressPercent = isArrived && !isTransporting ? 100 : progressPercent;
  const destLng = isTransporting ? liveTargetHospital.coordinates.longitude : targetLocation.longitude;
  const destLat = isTransporting ? liveTargetHospital.coordinates.latitude : targetLocation.latitude;

  // Fetch real OSRM route from live moving ambulance location to incident coordinates
  useEffect(() => {
    async function updateRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${ambulanceLocation.longitude},${ambulanceLocation.latitude};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          setRouteCoords(route.geometry.coordinates);
          setDistance(route.distance / 1000);
          setEta(Math.ceil(route.duration / 60));
          
          // Calculate progress percentage dynamically relative to a baseline distance (e.g. 3.5 km initial gap)
          const initialDist = 3.5;
          const currentDist = route.distance / 1000;
          const progress = Math.max(0, Math.min(100, Math.round(((initialDist - currentDist) / initialDist) * 100)));
          setProgressPercent(progress);
        }
      } catch (err) {
        console.error("OSRM Dynamic Route Error", err);
      }
    }
    
    updateRoute();
  }, [ambulanceLocation.latitude, ambulanceLocation.longitude, isTransporting, destLng, destLat]);

  // Format Elapsed Time
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const region = {
    latitude: (ambulanceLocation.latitude + destLat) / 2,
    longitude: (ambulanceLocation.longitude + destLng) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  if (isFindingAmbulance) {
    return (
      <View style={styles.holdingContainer}>
        {/* Top Header Overlay */}
        <View style={styles.topHeaderHolding}>
          <Text style={styles.holdingTitle}>Securing Dispatch</Text>
          <Text style={styles.holdingSubtitle}>
            {report.requestId || "REQ-2026-0847"} · Processing Emergency
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.holdingScrollContent} showsVerticalScrollIndicator={false}>
          {/* Pulsing Radar Animation */}
          <View style={styles.radarWrapper}>
            <View style={styles.radarContainer}>
              <Animated.View style={[
                styles.pulseCircle,
                {
                  transform: [{
                    scale: pulseAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    })
                  }],
                  opacity: pulseAnim1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  })
                }
              ]} />
              <Animated.View style={[
                styles.pulseCircle,
                {
                  transform: [{
                    scale: pulseAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    })
                  }],
                  opacity: pulseAnim2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  })
                }
              ]} />
              <Animated.View style={[
                styles.pulseCircle,
                {
                  transform: [{
                    scale: pulseAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.5],
                    })
                  }],
                  opacity: pulseAnim3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 0],
                  })
                }
              ]} />
              
              <View style={styles.radarCenter}>
                <Truck color="#FFF" size={32} />
              </View>
            </View>
          </View>

          {/* Status Messaging */}
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>Finding Closest Ambulance...</Text>
            <Text style={styles.statusDescription}>
              PACC is currently dispatching the closest active unit in Baliwag City. If the closest unit does not respond, it will be automatically recycled and manually assigned by the PACC Command Center to guarantee response.
            </Text>
          </View>

          {/* Progress Timeline */}
          <View style={styles.holdingTimeline}>
            <View style={styles.holdingTimelineItem}>
              <View style={styles.timelineCheckIcon}>
                <Check color="#22C55E" size={14} />
              </View>
              <Text style={styles.timelineLabelActive}>Incident Report Submitted</Text>
            </View>
            
            <View style={styles.holdingTimelineItem}>
              <View style={styles.timelinePulseIconContainer}>
                <View style={styles.timelinePulseIcon} />
              </View>
              <Text style={styles.timelineLabelActive}>Auto-routing & Alerting Nearest Unit...</Text>
            </View>

            <View style={styles.holdingTimelineItem}>
              <View style={styles.timelinePendingIcon} />
              <Text style={styles.timelineLabelPending}>Dispatch Accepted by Crew</Text>
            </View>
          </View>

          {/* Safety Instructions Card */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsHeader}>CRITICAL SAFETY INSTRUCTIONS</Text>
            
            <View style={styles.instructionRow}>
              <View style={styles.instructionNumberBox}>
                <Text style={styles.instructionNumber}>1</Text>
              </View>
              <Text style={styles.instructionText}>
                Stay calm and remain at your reported location. Ensure your phone is not on silent.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <View style={styles.instructionNumberBox}>
                <Text style={styles.instructionNumber}>2</Text>
              </View>
              <Text style={styles.instructionText}>
                If indoors, clear any pathways, unlock gates, and secure pets for crew entry.
              </Text>
            </View>

            <View style={styles.instructionRow}>
              <View style={styles.instructionNumberBox}>
                <Text style={styles.instructionNumber}>3</Text>
              </View>
              <Text style={styles.instructionText}>
                Gather basic identification details and medication records of the patient.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Button at the bottom */}
        <View style={styles.holdingActionContainer}>
          <TouchableOpacity 
            style={styles.callPaccButton} 
            activeOpacity={0.85}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <Phone color="#FFF" size={20} style={{ marginRight: 10 }} />
            <Text style={styles.callPaccText}>Call Command Center (PACC)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dark Map View */}
      <Map 
        style={styles.map} 
        mapStyle="https://tiles.openfreemap.org/styles/dark"
        logo={false}
        attribution={true}
      >
        <Camera
          center={[region.longitude, region.latitude]}
          zoom={14}
          duration={1000}
        />
        
        {/* Ambulance Location */}
        <Marker id="ambulanceMarker" lngLat={[ambulanceLocation.longitude, ambulanceLocation.latitude]}>
          <View className="flex-row items-center bg-white p-1 pr-3 rounded-full border border-slate-200 shadow-sm">
            <View className="w-7 h-7 rounded-full items-center justify-center bg-blue-600">
              <Navigation color="white" size={14} fill="white" />
            </View>
            <Text className="ml-2 text-[10px] font-bold text-slate-700">
              AMB-001
            </Text>
          </View>
        </Marker>

        {/* User Destination */}
        <Marker id="userMarker" lngLat={[targetLocation.longitude, targetLocation.latitude]}>
          <View className="items-center justify-center relative">
            <View className="absolute w-8 h-8 rounded-full bg-red-500/30 animate-ping" />
            <View className="p-1 rounded-full border-2 border-red-200 bg-red-500 shadow-lg">
              <MapPin color="white" size={16} fill="white" />
            </View>
          </View>
        </Marker>

        {/* Hospital Destination */}
        {isTransporting && (
          <Marker id="hospitalMarker" lngLat={[liveTargetHospital.coordinates.longitude, liveTargetHospital.coordinates.latitude]}>
            <View className="items-center justify-center relative">
              <View className="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-pulse" />
              <View className="p-2 rounded-full border-2 border-emerald-200 bg-emerald-600 shadow-lg">
                <Hospital color="white" size={16} variant="Bold" />
              </View>
            </View>
          </Marker>
        )}

        {/* Route Line */}
        <GeoJSONSource
          id="routeSource"
          data={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeCoords && routeCoords.length > 0 
                ? routeCoords
                : [
                    [ambulanceLocation.longitude, ambulanceLocation.latitude],
                    [destLng, destLat],
                  ],
            },
            properties: {}
          }}
        >
          <Layer
            id="routeFill"
            type="line"
            paint={{
              'line-color': isTransporting ? '#10B981' : '#3B82F6',
              'line-width': 3,
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Top Header Overlay */}
      <View style={styles.topHeader}>
        <Text style={styles.title}>Ambulance Tracker</Text>
        <Text style={styles.subtitle}>
          {isTransporting 
            ? `Transporting to ${liveTargetHospital.name}` 
            : isArrived 
              ? "Ambulance Arrived · Crew Assisting on Scene" 
              : `${report.requestId || "DR-2026-0847"} · Help is on the way`}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time Elapsed</Text>
            <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>{isTransporting ? "Distance to Hosp" : "Distance"}</Text>
            <Text style={styles.statValue}>
              {isArrived && !isTransporting ? "0.0" : distance.toFixed(1)} km
            </Text>
          </View>
        </View>
      </View>

      {/* Draggable Bottom Drawer */}
      <Animated.View style={[styles.drawer, { height: drawerHeight }]}>
        
        {/* TAPPABLE HEADER ZONE */}
        <TouchableOpacity activeOpacity={0.7} onPress={toggleDrawer}>
          <View style={styles.drawerHandleArea}>
            <View style={styles.drawerHandle} />
            <View style={styles.swipeRow}>
              {drawerExpanded ? (
                <ChevronDown color="#94A3B8" size={16} style={{marginRight: 4}} />
              ) : (
                <ChevronUp color="#94A3B8" size={16} style={{marginRight: 4}} />
              )}
              <Text style={styles.swipeText}>
                {drawerExpanded ? "TAP TO CLOSE" : "TAP FOR DETAILS"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Ambulance Pill + Progress (always visible) */}
        <View>
          {/* Main Ambulance Pill */}
          <View style={styles.ambulancePillRow}>
            <View style={[styles.ambulancePill, isTransporting && { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
              <View style={[styles.ambulanceIconBox, isTransporting && { backgroundColor: '#6EE7B7' }]}>
                <Truck color={isTransporting ? '#065F46' : '#991B1B'} size={18} />
              </View>
              <View style={styles.ambulancePillText}>
                <Text style={[styles.ambulanceUnitText, isTransporting && { color: '#065F46' }]}>
                  {assignedResponder?.fullName ? `AMB-${assignedResponder.fullName.split(',')[0].toUpperCase()}` : "AMB-001"}
                </Text>
                <Text style={[styles.ambulanceStatusText, isTransporting && { color: '#047857' }]}>
                  {isTransporting 
                    ? `Transporting to ${liveTargetHospital.name}` 
                    : isArrived 
                      ? "Arrived at your location" 
                      : "En route to your location"}
                </Text>
              </View>
            </View>
            <View style={styles.etaBox}>
              <Text style={[styles.etaNumber, isTransporting && { color: '#065F46' }]}>
                {isArrived && !isTransporting ? "00" : eta.toString().padStart(2, '0')}<Text style={styles.etaMins}>m</Text>
              </Text>
              <Text style={styles.etaLabel}>ETA</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabelLeft, isTransporting && { color: '#047857' }]}>
                {isTransporting ? "Your Location" : "CDRRMO HQ"}
              </Text>
              <Text style={[styles.progressLabelRight, isTransporting && { color: '#047857' }]}>
                {isTransporting ? liveTargetHospital.name : "Your Location"}
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${displayProgressPercent}%` }, isTransporting && { backgroundColor: '#10B981' }]} />
              <View style={[styles.progressKnob, { left: `${displayProgressPercent}%` }, isTransporting && { borderColor: '#10B981' }]} />
            </View>
          </View>
        </View>

        {/* SCROLLABLE CONTENT (Crew & Timeline) */}
        <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false} scrollEnabled={drawerExpanded}>
          {drawerExpanded && (
            <View style={styles.expandedContent}>
              <Text style={styles.dispatchNotice}>Dispatch continues even if you stop viewing</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>CREW</Text>
              <View style={styles.crewRow}>
                {/* Driver */}
                <View style={styles.crewCard}>
                  <Text style={styles.crewRole}>RESPONDER</Text>
                  <View style={styles.crewAvatar}>
                    <Text style={styles.crewAvatarText}>
                      {assignedResponder?.fullName ? assignedResponder.fullName.substring(0, 2).toUpperCase() : "RB"}
                    </Text>
                  </View>
                  <Text style={styles.crewName} numberOfLines={1}>
                    {assignedResponder?.fullName || "Bastes, Renzy"}
                  </Text>
                  <Text style={styles.crewYears}>
                    {assignedResponder?.phone || "0917-123-4567"}
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 color="#1E3A8A" size={12} style={{marginRight: 4}} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
                
                {/* Paramedic */}
                <View style={styles.crewCard}>
                  <Text style={styles.crewRole}>PARAMEDIC</Text>
                  <View style={styles.crewAvatar}>
                    <Text style={styles.crewAvatarText}>CG</Text>
                  </View>
                  <Text style={styles.crewName} numberOfLines={1}>Guanzing, Chris</Text>
                  <Text style={styles.crewYears}>Serving since 2020</Text>
                  <View style={styles.verifiedBadge}>
                    <CheckCircle2 color="#1E3A8A" size={12} style={{marginRight: 4}} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>ROUTE</Text>
              <View style={styles.timeline}>
                {/* Step 1 */}
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIconCompleted}>
                    <Check color="#1E3A8A" size={12} />
                  </View>
                  <View style={styles.timelineLineCompleted} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitleCompleted}>Dispatched from CDRRMO HQ</Text>
                    <Text style={styles.timelineSubtitle}>09:46 AM • Maharlika Rd, Baliwag</Text>
                  </View>
                </View>
                
                {/* Step 2 */}
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIconCompleted}>
                    <Check color="#1E3A8A" size={12} />
                  </View>
                  <View style={styles.timelineLineCompleted} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitleCompleted}>
                      {isTransporting ? "Arrived at Your Location" : "Passing Rizal Street"}
                    </Text>
                    <Text style={styles.timelineSubtitle}>
                      {isTransporting ? "09:50 AM • Patients on-board" : "09:46 AM • 0.9 km covered"}
                    </Text>
                  </View>
                </View>

                {/* Step 3 (Current / Completed) */}
                <View style={styles.timelineItem}>
                  <View style={(isTransporting || isArrived) ? styles.timelineIconCompleted : styles.timelineIconCurrent}>
                    {!(isTransporting || isArrived) && <View style={styles.timelineIconCurrentInner} />}
                    {(isTransporting || isArrived) && <Check color="#1E3A8A" size={12} />}
                  </View>
                  <View style={(isTransporting || isArrived) ? styles.timelineLineCompleted : styles.timelineLinePending} />
                  <View style={styles.timelineContent}>
                    <Text style={(isTransporting || isArrived) ? styles.timelineTitleCompleted : styles.timelineTitleCurrent}>
                      {isTransporting ? "Departed Incident Scene" : "En route Near Pagala"}
                    </Text>
                    <Text style={(isTransporting || isArrived) ? styles.timelineSubtitle : styles.timelineSubtitleCurrent}>
                      {isTransporting ? "09:52 AM • Passed" : isArrived ? "09:50 AM • Passed" : `Now • ${distance.toFixed(1)} km remaining`}
                    </Text>
                    {!(isTransporting || isArrived) && (
                      <View style={styles.alertPill}>
                        <AlertCircle color="#DC2626" size={14} style={{marginRight: 4}} />
                        <Text style={styles.alertText}>Traffic ahead minor delay</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Step 4 (Future / Current) */}
                <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
                  <View style={isTransporting ? styles.timelineIconCurrent : isArrived ? styles.timelineIconCurrent : styles.timelineIconPending}>
                    {(isTransporting || isArrived) && <View style={styles.timelineIconCurrentInner} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={isTransporting ? styles.timelineTitleCurrent : isArrived ? styles.timelineTitleCurrent : styles.timelineTitlePending}>
                      {isTransporting ? `Hospital Transfer` : "Arrival at Your Location"}
                    </Text>
                    <Text style={isTransporting ? styles.timelineSubtitleCurrent : isArrived ? styles.timelineSubtitleCurrent : styles.timelineSubtitlePending}>
                      {isTransporting 
                        ? `En route to ${liveTargetHospital.name} · ${distance.toFixed(1)} km remaining` 
                        : isArrived 
                          ? "Now • Arrived" 
                          : "Est. 09:54 AM • Your Location"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{height: 120}} />
            </View>
          )}
        </ScrollView>
        
        {/* Action Buttons Fixed at Bottom */}
        {drawerExpanded && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <MessageSquare color="#FFF" size={20} style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            >
              <Phone color="#FFF" size={20} style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Call Unit</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Ambulance Arrived Modal */}
      <Modal visible={isArrived && !hasDismissedArrivedModal} transparent animationType="fade">
        <View style={styles.arrivedOverlay}>
          <View style={styles.arrivedCard}>
            {/* Ambulance Icon */}
            <View style={styles.arrivedIconContainer}>
              <View style={styles.arrivedIconBg}>
                <Truck color="#1E3A8A" size={32} />
              </View>
            </View>

            <Text style={styles.arrivedTitle}>Ambulance has arrived</Text>
            <Text style={styles.arrivedDescription}>
              Location reached. Please meet the crew or secure the area for entry. The tracking session is complete, but medical assistance is ongoing.
            </Text>

            {/* Trip Summary */}
            <View style={styles.tripSummaryBox}>
              <Text style={styles.tripSummaryLabel}>TRIP SUMMARY</Text>
              <View style={styles.tripStatsRow}>
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatValue}>{Math.floor(elapsed / 60)}m</Text>
                  <Text style={styles.tripStatLabel}>RESPONSE</Text>
                </View>
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatValue}>3</Text>
                  <Text style={styles.tripStatLabel}>PATIENTS</Text>
                </View>
                <View style={styles.tripStat}>
                  <Text style={styles.tripStatValue}>1.7</Text>
                  <Text style={styles.tripStatLabel}>KM</Text>
                </View>
              </View>
            </View>

            {/* Proceed Button */}
            <TouchableOpacity
              style={styles.proceedButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHasDismissedArrivedModal(true);
              }}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  ambulanceOuterRadius: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  markerLabel: {
    position: 'absolute',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabelText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ambulanceMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  destinationOuterRadius: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  destinationMarkerOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  destinationMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  topHeader: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 40,
  },
  statBox: {
  },
  statLabel: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: 'bold',
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 20,
  },
  drawerHandleArea: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  swipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginBottom: 12,
  },
  swipeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawerScroll: {
    flex: 1,
  },
  ambulancePillRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ambulancePill: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: 24,
    padding: 12,
    paddingRight: 16,
    alignItems: 'center',
    marginRight: 16,
  },
  ambulanceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  truckIconPlaceholder: {
    width: 16,
    height: 12,
    backgroundColor: '#B91C1C',
    borderRadius: 2,
  },
  ambulancePillText: {
    flex: 1,
  },
  ambulanceUnitText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  ambulanceStatusText: {
    fontSize: 12,
    color: '#B91C1C',
  },
  etaBox: {
    alignItems: 'center',
  },
  etaNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#991B1B',
  },
  etaMins: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  etaLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabelLeft: {
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: 'bold',
  },
  progressLabelRight: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B91C1C',
    borderRadius: 3,
  },
  progressKnob: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#B91C1C',
    marginLeft: -7,
  },
  expandedContent: {
    paddingHorizontal: 24,
  },
  dispatchNotice: {
    textAlign: 'center',
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
    marginVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 1,
    marginBottom: 16,
  },
  crewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  crewCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
  },
  crewRole: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  crewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  crewAvatarText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  crewName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  crewYears: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingBottom: 24,
  },
  timelineIconCompleted: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineIconCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineIconCurrentInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  timelineIconPending: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    zIndex: 2,
  },
  timelineLineCompleted: {
    position: 'absolute',
    top: 20,
    left: 9,
    width: 2,
    height: '100%',
    backgroundColor: '#CBD5E1',
    zIndex: 1,
  },
  timelineLinePending: {
    position: 'absolute',
    top: 20,
    left: 9,
    width: 2,
    height: '100%',
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  timelineContent: {
    marginLeft: 16,
    flex: 1,
  },
  timelineTitleCompleted: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  timelineTitleCurrent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  timelineTitlePending: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  timelineSubtitleCurrent: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  timelineSubtitlePending: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF', // ensures no background clipping
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Arrived Modal
  arrivedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  arrivedCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  arrivedIconContainer: {
    marginBottom: 20,
  },
  arrivedIconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrivedTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  arrivedDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  tripSummaryBox: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  tripSummaryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 16,
  },
  tripStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  tripStat: {
    alignItems: 'center',
  },
  tripStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  tripStatLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  proceedButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  proceedButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  holdingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
  },
  topHeaderHolding: {
    marginTop: 60,
    marginBottom: 20,
  },
  holdingTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  holdingSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  holdingScrollContent: {
    paddingBottom: 120,
    alignItems: 'center',
  },
  radarWrapper: {
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  radarContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  radarCenter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  statusBox: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  holdingTimeline: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  holdingTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  timelineCheckIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelinePulseIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelinePulseIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  timelinePendingIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    backgroundColor: 'transparent',
    marginRight: 16,
  },
  timelineLabelActive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  timelineLabelPending: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  instructionsHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444',
    letterSpacing: 1,
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  instructionNumberBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  holdingActionContainer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
  },
  callPaccButton: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  callPaccText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
