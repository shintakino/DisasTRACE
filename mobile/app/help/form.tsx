import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { ChevronLeft, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle, MapPin, AlertCircle, Minus, Plus } from 'lucide-react-native';
import { useEmergencyReportStore } from '../../store/use-emergency-report-store';

const NATURE_OPTIONS = ["Emergency", "Non-emergency"];
const EMERGENCY_TYPES = [
  "Fire Emergency",
  "Vehicular Collision",
  "Medical Emergency",
  "Structural Failure",
  "Flood/Water",
  "Unknown Cause"
];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const CustomDropdown = ({ label, options, selected, onSelect, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={[styles.dropdownContainer, isOpen && styles.dropdownContainerOpen]}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setIsOpen(!isOpen)} activeOpacity={0.7}>
        <Text style={[styles.dropdownHeaderText, !selected && { color: '#64748B' }]}>{selected || placeholder}</Text>
        {isOpen ? <ChevronUp size={20} color="#1E3A8A" /> : <ChevronDown size={20} color="#1E3A8A" />}
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt: string, index: number) => (
            <TouchableOpacity 
              key={opt} 
              style={[styles.dropdownOption, index === options.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { onSelect(opt); setIsOpen(false); }}
            >
              <Text style={styles.dropdownOptionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function FormScreen() {
  const router = useRouter();
  const { report, setDetails } = useEmergencyReportStore();
  
  const [nature, setNature] = useState<string>("");
  const [emergencyType, setEmergencyType] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [people, setPeople] = useState<number>(0);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(
    report.latitude && report.longitude ? { latitude: report.latitude, longitude: report.longitude } : null
  );
  const [address, setAddress] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    if (!location) {
      getLocation();
    } else if (location.latitude && location.longitude && !address) {
      reverseGeocode(location.latitude, location.longitude);
    }
  }, [location]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode && geocode.length > 0) {
        const current = geocode[0];
        const formattedAddress = [
          current.name || current.street,
          current.city || current.subregion,
          current.region
        ].filter(Boolean).join(', ');
        setAddress(formattedAddress || 'Location found');
      } else {
        setAddress('Location detected');
      }
    } catch (error) {
      setAddress('Coordinates: ' + lat.toFixed(4) + ', ' + lng.toFixed(4));
    }
  };

  const getLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for emergency dispatch.');
        setIsLoadingLocation(false);
        return;
      }
      
      let lat = 14.945;
      let lng = 120.895;
      let usedFallback = false;

      try {
        // Attempt high-accuracy GPS with a 4-second timeout limit
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('GPS timeout')), 4000)
          )
        ]);

        if (loc && loc.coords) {
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (gpsError) {
        console.warn('[GPS] High accuracy request failed/timed out, attempting cached location:', gpsError);
        try {
          // Fallback 1: Get last known cached location
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc && lastLoc.coords) {
            lat = lastLoc.coords.latitude;
            lng = lastLoc.coords.longitude;
            console.log('[GPS] Retrieved cached location successfully.');
          } else {
            throw new Error('No cached position available');
          }
        } catch (cacheError) {
          console.warn('[GPS] Cached location fallback failed, using default Baliwag coordinates:', cacheError);
          // Fallback 2: Sensible default Baliwag command center coordinates with a small random offset
          lat = 14.945 + (Math.random() - 0.5) * 0.005;
          lng = 120.895 + (Math.random() - 0.5) * 0.005;
          usedFallback = true;
        }
      }

      // Geofence enforcement: DisasTRACE is only active within the municipality of Baliwag City
      const isDevMode = process.env.EXPO_PUBLIC_DEV_MODE === 'true';
      const isOutsideBaliwag = lat < 14.90 || lat > 15.00 || lng < 120.80 || lng > 121.00;

      if (isOutsideBaliwag) {
        if (isDevMode) {
          // Mock coordinates inside Baliwag for developer testing convenience
          lat = 14.945 + (Math.random() - 0.5) * 0.01;
          lng = 120.895 + (Math.random() - 0.5) * 0.01;
          console.log('[DevMode] User is outside Baliwag. Mocked location to center.');
        } else {
          // Strictly fail/warn in production/deployment
          Alert.alert(
            'Out of Service Area',
            'DisasTRACE emergency response services are currently only active within the municipality of Baliwag City. We are unable to dispatch an ambulance to your current location.',
            [{ text: 'OK' }]
          );
          setIsLoadingLocation(false);
          return;
        }
      }
      
      setLocation({ latitude: lat, longitude: lng });
      await reverseGeocode(lat, lng);

      if (usedFallback) {
        Alert.alert(
          'Weak GPS Signal', 
          'We estimated your local coordinates so you can still submit. Please describe your exact landmarks below to help responders.'
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not retrieve coordinates.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!nature || !location) {
      Alert.alert('Missing Details', 'Please fill in required fields and allow location access.');
      return;
    }
    if (nature === 'Emergency' && !emergencyType) {
      Alert.alert('Missing Details', 'Please select a type of emergency.');
      return;
    }
    
    // Save to store
    setDetails({
      nature: nature as any,
      incidentType: nature === 'Emergency' ? emergencyType as any : nature as any,
      peopleInvolved: people === 0 ? "None" : (people >= 6 ? "6+ Persons" : `${people} Person${people > 1 ? 's' : ''}`) as any,
      latitude: location.latitude,
      longitude: location.longitude,
      severity: severity as any,
    });
    
    router.push('/help/details');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBlueArea}>
        <TouchableOpacity style={styles.retakeBtn} onPress={() => router.back()} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ChevronLeft color="#FFF" size={24} />
          <Text style={styles.retakeText}>Retake a photo</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formScrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>ATTACHMENT <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.attachmentCard}>
          <View style={styles.attachmentIconBox}>
            <ImageIcon color="#64748B" size={20} />
          </View>
          <View style={styles.attachmentInfo}>
            <Text style={styles.attachmentName}>IMG_0019.jpg</Text>
            <Text style={styles.attachmentDetails}>Live capture · 2.4 MB · GPS tagged</Text>
          </View>
          <CheckCircle color="#64748B" size={20} />
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.sectionTitle}>NATURE OF CALL <Text style={styles.asterisk}>*</Text></Text>
          <AlertCircle color="#64748B" size={14} style={{ marginBottom: 8 }} />
        </View>
        <CustomDropdown 
          placeholder="Select nature of call" 
          options={NATURE_OPTIONS} 
          selected={nature} 
          onSelect={(val: string) => {
            setNature(val);
            if (val !== 'Emergency') setEmergencyType('');
          }} 
        />

        {nature === 'Emergency' && (
          <>
            <Text style={styles.sectionTitle}>TYPE OF EMERGENCY CALL <Text style={styles.asterisk}>*</Text></Text>
            <CustomDropdown 
              placeholder="Select type of emergency call" 
              options={EMERGENCY_TYPES} 
              selected={emergencyType} 
              onSelect={setEmergencyType} 
            />

            <Text style={styles.sectionTitle}>SEVERITY LEVEL <Text style={styles.asterisk}>*</Text></Text>
            <CustomDropdown 
              placeholder="Select severity level" 
              options={SEVERITY_LEVELS} 
              selected={severity} 
              onSelect={setSeverity} 
            />
          </>
        )}

        <Text style={styles.sectionTitle}>NUMBER OF PEOPLE INVOLVED / AFFECTED <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.stepperCard}>
          <Text style={styles.stepperTitle}>How many people are involved or affected?</Text>
          <View style={styles.stepperControls}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setPeople(Math.max(0, people - 1))}>
              <Minus size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{people}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setPeople(people + 1)}>
              <Plus size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>YOUR LOCATION <Text style={styles.asterisk}>*</Text></Text>
        <View style={styles.locationCard}>
          <View style={styles.locationPinBox}>
            <MapPin color="#FFF" size={16} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {isLoadingLocation ? 'Locating...' : (address || 'Searching for address...')}
          </Text>
          <TouchableOpacity onPress={() => getLocation()}>
            <Text style={styles.editLocationText}>Retake &gt;</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <Text style={styles.submitBtnText}>Submit Report</Text>
        </TouchableOpacity>
        
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topBlueArea: {
    backgroundColor: '#1E3A8A',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  formScrollContent: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  asterisk: {
    color: '#DC2626',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  attachmentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  attachmentDetails: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  dropdownContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Shadow for unexpanded is light, but let's just make it look like a card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownContainerOpen: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 18,
  },
  dropdownHeaderText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  dropdownList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dropdownOption: {
    padding: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#475569',
  },
  stepperCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperTitle: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepperControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    minWidth: 40,
    textAlign: 'center',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 40,
  },
  locationPinBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  editLocationText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#B91C1C',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});

