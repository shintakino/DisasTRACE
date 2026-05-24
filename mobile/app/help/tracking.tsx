import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Modal } from 'react-native';
import { Map, Camera, Marker, GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';
import { useRouter } from 'expo-router';
import { Phone, MessageSquare, Check, AlertCircle, ChevronUp, ChevronDown, MapPin, CheckCircle2, Truck, Navigation } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

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
  const [elapsed, setElapsed] = useState(310); // 5 mins 10 secs
  const [isArrived, setIsArrived] = useState(false);
  const [progressPercent, setProgressPercent] = useState(85);
  
  const [routeCoords, setRouteCoords] = useState<number[][] | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const drawerHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const isExpandedRef = useRef(false);

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

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    
    async function fetchRoute() {
      try {
        const startLng = targetLocation.longitude - 0.02;
        const startLat = targetLocation.latitude + 0.015;
        const endLng = targetLocation.longitude;
        const endLat = targetLocation.latitude;
        
        // OSRM Public Free API
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates; // [lng, lat][]
          setRouteCoords(coords);
          setAmbulanceLocation({ latitude: coords[0][1], longitude: coords[0][0] });
          
          const steps = coords.length;
          const totalDuration = 10000; // 10 seconds simulation
          const intervalTime = totalDuration / steps;
          const distStep = 1.7 / steps;
          const progStep = (100 - 85) / steps;
          
          let step = 0;
          let elapsedSecs = 310;
          
          timer = setInterval(() => {
            step++;
            
            if (step % Math.ceil(1000 / intervalTime) === 0) {
              elapsedSecs++;
              setElapsed(elapsedSecs);
            }
            
            if (step < steps) {
              setCurrentStep(step);
              setAmbulanceLocation({
                longitude: coords[step][0],
                latitude: coords[step][1],
              });
              setDistance(prev => Math.max(0, prev - distStep));
              setProgressPercent(prev => Math.min(100, prev + progStep));
              setEta(Math.ceil(8 * (1 - step / steps)));
            } else {
              setIsArrived(true);
              clearInterval(timer);
            }
          }, intervalTime);
        }
      } catch (err) {
        console.error("OSRM Route Error", err);
      }
    }
    
    fetchRoute();
    
    return () => clearInterval(timer);
  }, []);

  // Format Elapsed Time
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };



  const region = {
    latitude: (ambulanceLocation.latitude + targetLocation.latitude) / 2,
    longitude: (ambulanceLocation.longitude + targetLocation.longitude) / 2,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

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
          initialViewState={{
            center: [region.longitude, region.latitude],
            zoom: 14,
          }}
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

        {/* Route Line */}
        <GeoJSONSource
          id="routeSource"
          data={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeCoords && routeCoords.length > 0 
                ? (currentStep >= routeCoords.length - 1 ? routeCoords.slice(-2) : routeCoords.slice(currentStep)) 
                : [
                    [ambulanceLocation.longitude, ambulanceLocation.latitude],
                    [targetLocation.longitude, targetLocation.latitude],
                  ],
            },
            properties: {}
          }}
        >
          <Layer
            id="routeFill"
            type="line"
            paint={{
              'line-color': '#3B82F6',
              'line-width': 3,
            }}
          />
        </GeoJSONSource>
      </Map>

      {/* Top Header Overlay */}
      <View style={styles.topHeader}>
        <Text style={styles.title}>Ambulance Tracker</Text>
        <Text style={styles.subtitle}>DR-2026-0847 · Help is on the way</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Time Elapsed</Text>
            <Text style={styles.statValue}>{formatTime(elapsed)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
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
            <View style={styles.ambulancePill}>
              <View style={styles.ambulanceIconBox}>
                <Truck color="#991B1B" size={18} />
              </View>
              <View style={styles.ambulancePillText}>
                <Text style={styles.ambulanceUnitText}>AMB-001</Text>
                <Text style={styles.ambulanceStatusText}>
                  {isArrived ? "Arrived at your location" : "Near Rizal St. heading your way"}
                </Text>
              </View>
            </View>
            <View style={styles.etaBox}>
              <Text style={styles.etaNumber}>
                {eta.toString().padStart(2, '0')}<Text style={styles.etaMins}>m</Text>
              </Text>
              <Text style={styles.etaLabel}>ETA</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>CDRRMO HQ</Text>
              <Text style={styles.progressLabelRight}>Your Location</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              <View style={[styles.progressKnob, { left: `${progressPercent}%` }]} />
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
                  <Text style={styles.crewRole}>DRIVER</Text>
                  <View style={styles.crewAvatar}>
                    <Text style={styles.crewAvatarText}>RB</Text>
                  </View>
                  <Text style={styles.crewName}>Bastes, Renzy</Text>
                  <Text style={styles.crewYears}>Serving since 2018</Text>
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
                  <Text style={styles.crewName}>Guanzing, Christopher</Text>
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
                    <Text style={styles.timelineTitleCompleted}>Passing Rizal Street</Text>
                    <Text style={styles.timelineSubtitle}>09:46 AM • 0.9 km covered</Text>
                  </View>
                </View>

                {/* Step 3 (Current / Completed) */}
                <View style={styles.timelineItem}>
                  <View style={isArrived ? styles.timelineIconCompleted : styles.timelineIconCurrent}>
                    {!isArrived && <View style={styles.timelineIconCurrentInner} />}
                    {isArrived && <Check color="#1E3A8A" size={12} />}
                  </View>
                  <View style={isArrived ? styles.timelineLineCompleted : styles.timelineLinePending} />
                  <View style={styles.timelineContent}>
                    <Text style={isArrived ? styles.timelineTitleCompleted : styles.timelineTitleCurrent}>En route Near Pagala</Text>
                    <Text style={isArrived ? styles.timelineSubtitle : styles.timelineSubtitleCurrent}>
                      {isArrived ? "09:50 AM • Passed" : `Now • ${distance.toFixed(1)} km remaining`}
                    </Text>
                    {!isArrived && (
                      <View style={styles.alertPill}>
                        <AlertCircle color="#DC2626" size={14} style={{marginRight: 4}} />
                        <Text style={styles.alertText}>Traffic ahead minor delay</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Step 4 (Future / Current) */}
                <View style={[styles.timelineItem, { paddingBottom: 0 }]}>
                  <View style={isArrived ? styles.timelineIconCurrent : styles.timelineIconPending}>
                    {isArrived && <View style={styles.timelineIconCurrentInner} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={isArrived ? styles.timelineTitleCurrent : styles.timelineTitlePending}>Arrival at Your Location</Text>
                    <Text style={isArrived ? styles.timelineSubtitleCurrent : styles.timelineSubtitlePending}>
                      {isArrived ? "Now • Arrived" : "Est. 09:54 AM • Your Location"}
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
            <TouchableOpacity style={styles.actionButton}>
              <MessageSquare color="#FFF" size={20} style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Phone color="#FFF" size={20} style={{marginRight: 8}} />
              <Text style={styles.actionButtonText}>Call Unit</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Ambulance Arrived Modal */}
      <Modal visible={isArrived} transparent animationType="fade">
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
              onPress={() => router.replace('/(tabs)')}
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
});
