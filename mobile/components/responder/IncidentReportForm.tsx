import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Image, LayoutAnimation, UIManager, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Info, ChevronDown, Minus, Plus, FolderDown, Check } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';
import { ReportSubmittedModal } from './ReportSubmittedModal';
import * as Haptics from 'expo-haptics';
import { PatientCareModal } from './PatientCareModal';
import { TripTicketModal } from './TripTicketModal';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NATURE_OPTIONS = ['Emergency', 'Non-Emergency'];
const EMERGENCY_TYPES = [
  'Fire Emergency',
  'Vehicular Collision',
  'Medical Emergency',
  'Structural Failure',
  'Flood/Water',
  'Unknown Cause'
];
const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const PATIENT_STATUSES = ['Stable — Conscious', 'Stable — Unconscious', 'Critical', 'Deceased'];

function InlineDropdown({ 
  label, options, value, onSelect, isOpen, onToggle 
}: { 
  label?: string, options: string[], value: string, onSelect: (val: string) => void, isOpen: boolean, onToggle: () => void 
}) {
  return (
    <View className="mb-2">
      {label && <Text className="text-[#1E3A8A] font-black text-[10px] uppercase tracking-widest mb-2">{label}</Text>}
      <TouchableOpacity 
        onPress={onToggle}
        className={`flex-row items-center justify-between border border-slate-200 px-4 py-3.5 bg-white ${isOpen ? 'rounded-t-xl border-b-slate-100' : 'rounded-xl'}`}
      >
        <Text className="text-[#1E3A8A] font-bold text-sm">{value}</Text>
        <ChevronDown size={20} color="#1E3A8A" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {isOpen && (
        <View className="bg-white border border-slate-200 border-t-0 rounded-b-xl overflow-hidden mb-2">
          {options.map((opt) => (
            <TouchableOpacity 
              key={opt}
              onPress={() => { onSelect(opt); onToggle(); }}
              className={`px-4 py-3 border-t border-slate-100 flex-row justify-between items-center ${value === opt ? 'bg-blue-50' : ''}`}
            >
              <Text className={`text-sm ${value === opt ? 'text-[#1E3A8A] font-bold' : 'text-slate-700'}`}>{opt}</Text>
              {value === opt && <Check color="#1E3A8A" size={16} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function IncidentReportForm() {
  const { status, setStatus, activeDispatch, isSubmittingReport, submitReport, saveDraft, drafts } = useResponderStore();
  
  const [natureOfCall, setNatureOfCall] = useState('Emergency');
  const [typeOfEmergency, setTypeOfEmergency] = useState('Medical Emergency');
  const [severityLevel, setSeverityLevel] = useState('Medium');
  
  const [patients, setPatients] = useState<any[]>([
    { id: 1, status: 'Stable — Conscious', bp: '120/80', hr: '', spo2: '', pcrDetails: null },
  ]);

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [crewNotes, setCrewNotes] = useState('');

  const [activePcrPatientIndex, setActivePcrPatientIndex] = useState<number | null>(null);
  const [isTripTicketOpen, setIsTripTicketOpen] = useState(false);
  const [tripTicketData, setTripTicketData] = useState<any>(null);


  React.useEffect(() => {
    if (status === 'report_filling' && activeDispatch) {
      // 1. Check if there is an existing local draft for this incident
      const existingDraft = drafts.find(d => d.incidentId === activeDispatch.id);
      
      if (existingDraft && existingDraft.formData) {
        console.log('[IncidentReportForm] Loading existing draft data:', existingDraft);
        setNatureOfCall(existingDraft.formData.natureOfCall || 'Emergency');
        setTypeOfEmergency(existingDraft.formData.typeOfEmergency || activeDispatch.typeOfEmergency || activeDispatch.type || 'Medical Emergency');
        setSeverityLevel(existingDraft.formData.severityLevel || 'Medium');
        setCrewNotes(existingDraft.formData.crewNotes || '');
        setPatients(existingDraft.formData.patients || [
          { id: 1, status: 'Stable — Conscious', bp: '', hr: '', spo2: '', pcrDetails: null }
        ]);
        setTripTicketData(existingDraft.formData.tripTicketData || null);
      } else {
        console.log('[IncidentReportForm] Initializing fresh form from active dispatch pre-fills:', activeDispatch);
        setNatureOfCall(activeDispatch.natureOfCall || 'Emergency');
        setTypeOfEmergency(activeDispatch.typeOfEmergency || activeDispatch.type || 'Medical Emergency');
        setSeverityLevel('Medium');
        setCrewNotes('');
        setTripTicketData(null);
        
        // Match the number of people involved from resident findings
        const count = activeDispatch.peopleInvolved || 1;
        const initialPatients = Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          status: 'Stable — Conscious',
          bp: '',
          hr: '',
          spo2: '',
          pcrDetails: null
        }));
        setPatients(initialPatients);
      }
    }
  }, [status, activeDispatch, drafts]);


  const toggleDropdown = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenDropdown(openDropdown === id ? null : id);
  };

  if (status !== 'report_filling' && status !== 'idle') {
    return null;
  }

  const addPatient = () => {
    const newId = patients.length > 0 ? Math.max(...patients.map(p => p.id)) + 1 : 1;
    setPatients([...patients, { id: newId, status: 'Stable — Conscious', bp: '', hr: '', spo2: '', pcrDetails: null }]);
  };

  const removePatient = (id?: number) => {
    if (patients.length > 1) {
      if (id) {
        setPatients(patients.filter(p => p.id !== id));
      } else {
        setPatients(patients.slice(0, -1));
      }
    }
  };

  const updatePatient = (id: number, field: string, value: string) => {
    setPatients(patients.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSaveDraft = () => {
    if (activeDispatch) {
      saveDraft(activeDispatch, { natureOfCall, typeOfEmergency, severityLevel, patients, crewNotes, tripTicketData });
      setStatus('idle');
    }
  };

  const handleSavePcr = (pcrData: any) => {
    if (activePcrPatientIndex !== null) {
      setPatients(patients.map((p, idx) => idx === activePcrPatientIndex ? {
        ...p,
        bp: pcrData.vitalsLogs?.[0]?.bp || p.bp,
        hr: pcrData.vitalsLogs?.[0]?.pr || p.hr,
        spo2: pcrData.vitalsLogs?.[0]?.o2_sat || p.spo2,
        pcrDetails: pcrData
      } : p));
    }
  };

  const handleSubmit = () => {
    if (activeDispatch) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-generate PCRs for patients that don't have explicit pcrDetails
      const finalPcrList = patients.map((p, idx) => {
        if (p.pcrDetails) return p.pcrDetails;
        
        return {
          patientName: `Patient ${idx + 1}`,
          patientAddress: activeDispatch.locationName || '',
          patientContact: '',
          patientAge: null,
          patientGender: 'Male',
          dispatchInfo: {
            hqDprtTime: '', hqArrTime: '',
            sceneDprtTime: '', sceneArrTime: '',
            hospitalDprtTime: '', hospitalArrTime: ''
          },
          emergencyType: {
            callType: natureOfCall === 'Emergency' ? 'Medical' : 'Transfer',
            arrivalPerson: 'Bystander'
          },
          incidentInfo: {
            siteOfIncident: activeDispatch.locationName || '',
            chiefComplaints: typeOfEmergency
          },
          initialAssessment: {
            loc: p.status.includes('Conscious') ? 'Alert' : 'Unconscious/Unresponsive',
            spinalInjury: '-',
            circulation: { pulse: 'Present', bleeding: '-', bleedingLocation: '', controlled: 'Yes' },
            airway: { status: 'Open', intervention: 'None' },
            trachea: 'Normal & Stable',
            breathing: { status: 'No Dyspnea', oxygen: 'O2 not required', lpm: '', delivery: 'NC', breathSounds: 'Clear Breath Sounds' }
          },
          vitalsLogs: [
            { time: '', bp: p.bp, pr: p.hr, o2_sat: p.spo2, rr: '', temp: '', pupil: 'PEARR', skin: 'Warm' }
          ],
          sampleHistory: {
            allergies: 'None', medications: 'None', pastMedicalHistory: '', lastOralIntake: '', eventsLeadingToInjury: ''
          },
          traumaMarkers: [],
          narrativeReport: `Incident Report for Patient ${idx + 1}.`,
          handoffSignatures: {
            accomplishedBy: '', receivingHospital: '', referredTo: '', receivingPhysician: '', licenseNo: '', arrivalTime: ''
          },
          liabilityRelease: {
            refused: false, refusalType: 'Refusal to consent to treatment', signature: '', witnessedBy: '', witnessedAddress: ''
          }
        };
      });

      const finalTripTicket = tripTicketData || {
        driverName: 'Ambulance Driver',
        vehiclePlate: activeDispatch.assignedAmbulance || 'AMB-001',
        passengerName: 'Responder Crew',
        placesVisited: activeDispatch.locationName || 'Baliwag City',
        purpose: 'Emergency Response',
        tripLog: { departureOffice: '', arrivalScene: '', departureScene: '', arrivalOffice: '', distance: '' },
        gasolineConsumed: { balance: '', issued: '', purchase: '', total: '', deduction: '', balanceEnd: '' },
        lubricants: { carOil: '', lubeOil: '', grease: '' },
        speedometer: { beginning: '', remarks: '' }
      };

      const formData = {
        natureOfCall,
        typeOfEmergency,
        severityLevel,
        patients,
        description: crewNotes.trim() || `Crew findings on scene: ${natureOfCall} call. Emergency type identified as ${typeOfEmergency}. Severity level: ${severityLevel}. Treated ${patients.length} patient(s) on scene.`,
        patientCareReports: finalPcrList,
        driverTripTicket: finalTripTicket
      };
      submitReport(activeDispatch.id, formData);
    }
  };


  return (
    <Modal
      visible={status === 'report_filling'}
      animationType="slide"
      presentationStyle="formSheet"
    >
      <SafeAreaView className="flex-1 bg-[#16203A]">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center border-b border-blue-800/50">
          <TouchableOpacity 
            onPress={() => setStatus('to_hospital')}
            className="w-10 h-10 items-center justify-center"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold ml-2">Incident Report Form</Text>
        </View>

        <View className="flex-1 bg-white">
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
            
            {/* Info Box */}
            <View className="bg-blue-50 rounded-xl p-4 flex-row items-start mb-6">
              <View className="w-6 h-6 bg-blue-200 rounded-full items-center justify-center mr-3 mt-1">
                <Info size={14} color="#1E3A8A" />
              </View>
              <View className="flex-1">
                <Text className="text-[#1E3A8A] font-bold text-sm mb-1">Pre-filled from resident's report</Text>
                <Text className="text-[#1E3A8A] text-xs">
                  All fields below were auto-filled from what the resident submitted. <Text className="font-bold">Review each one</Text> — correct anything that doesn't match what you found on scene.
                </Text>
              </View>
            </View>

            {/* Tabs */}
            <View className="flex-row items-center mb-6">
              <Text className="text-slate-500 font-bold text-xs tracking-widest mr-4">INCIDENT INFORMATION</Text>
              <View className="bg-blue-100 px-3 py-1.5 rounded-full">
                <Text className="text-[#1E3A8A] font-bold text-xs">FROM RESIDENT</Text>
              </View>
            </View>

            {/* RESIDENT'S REPORT */}
            <Text className="text-[#1E3A8A] font-black text-xs uppercase tracking-widest mb-4">RESIDENT'S REPORT</Text>
            
            <View className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm shadow-slate-200 mb-8">
              <View className="flex-row justify-between mb-4">
                <Text className="text-slate-500 text-sm">Nature of Call</Text>
                <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.natureOfCall || 'Emergency'}</Text>
              </View>
              <View className="flex-row justify-between mb-6">
                <Text className="text-slate-500 text-sm">Type of Emergency</Text>
                <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.typeOfEmergency || 'Fire / Explosion'}</Text>
              </View>
              
              <View className="flex-row justify-between mb-4">
                <Text className="text-slate-500 text-sm">People Involved</Text>
                <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.peopleInvolved || 3}</Text>
              </View>
              <View className="flex-row justify-between mb-4">
                <Text className="text-slate-500 text-sm">Location</Text>
                <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.locationName || 'Sabang, Baliwag City'}</Text>
              </View>
              
              {activeDispatch?.attachmentUrl && (
                <View className="rounded-xl overflow-hidden relative h-32 bg-slate-100 mt-2">
                  <Image source={{ uri: activeDispatch.attachmentUrl }} className="w-full h-full" resizeMode="cover" />
                  <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <Text className="text-white text-xs font-medium">IMG_7904.jpg</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CREW'S ACTUAL FINDINGS */}
            <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-6">CREW'S ACTUAL FINDINGS</Text>

            {/* Form Fields */}
            <View className="space-y-6">
              
              <InlineDropdown 
                label="NATURE OF CALL"
                options={NATURE_OPTIONS}
                value={natureOfCall}
                onSelect={setNatureOfCall}
                isOpen={openDropdown === 'nature'}
                onToggle={() => toggleDropdown('nature')}
              />

              {natureOfCall === 'Emergency' && (
                <InlineDropdown 
                  label="TYPE OF EMERGENCY CALL"
                  options={EMERGENCY_TYPES}
                  value={typeOfEmergency}
                  onSelect={setTypeOfEmergency}
                  isOpen={openDropdown === 'type'}
                  onToggle={() => toggleDropdown('type')}
                />
              )}

              <InlineDropdown 
                label="SEVERITY LEVEL"
                options={SEVERITY_LEVELS}
                value={severityLevel}
                onSelect={setSeverityLevel}
                isOpen={openDropdown === 'severity'}
                onToggle={() => toggleDropdown('severity')}
              />

              <View>
                <Text className="text-[#1E3A8A] font-black text-[10px] uppercase tracking-widest mb-2">ACTUAL NUMBER OF PATIENTS</Text>
                <View className="flex-row items-center justify-between border border-slate-200 rounded-xl px-4 py-2 bg-white mb-2">
                  <TouchableOpacity onPress={() => removePatient()} className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center">
                    <Minus size={16} color="#475569" />
                  </TouchableOpacity>
                  <View className="items-center">
                    <Text className="text-[#1E3A8A] font-bold text-xl">{patients.length}</Text>
                    <Text className="text-slate-400 text-[8px] font-bold tracking-widest uppercase mt-0.5">PATIENTS ON SCENE</Text>
                  </View>
                  <TouchableOpacity onPress={addPatient} className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                    <Plus size={16} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-[#1E3A8A] font-black text-[10px] uppercase tracking-widest mb-2">LOCATION</Text>
                <TextInput 
                  className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white text-[#1E3A8A] font-medium"
                  value={activeDispatch?.locationName || 'Brgy. Sabang, near corner of Rizal St.'}
                />
              </View>

              <View>
                <Text className="text-[#1E3A8A] font-black text-[10px] uppercase tracking-widest mb-2">CREW CLINICAL NOTES (OPTIONAL)</Text>
                <TextInput 
                  placeholder="Type any findings, diagnoses, treatment notes, or crew observations here..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white text-[#1E3A8A] font-medium min-h-[100px]"
                  value={crewNotes}
                  onChangeText={setCrewNotes}
                />
              </View>

              <View className="mt-4">
                {patients.map((patient, index) => (
                  <View key={patient.id} className="border border-slate-200 rounded-2xl p-4 bg-white mb-4">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-[#1E3A8A] font-bold">Patient {index + 1}</Text>
                      {patients.length > 1 && (
                        <TouchableOpacity onPress={() => removePatient(patient.id)}>
                          <Text className="text-red-700 font-bold text-xs">Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <InlineDropdown 
                      options={PATIENT_STATUSES}
                      value={patient.status}
                      onSelect={(val) => updatePatient(patient.id, 'status', val)}
                      isOpen={openDropdown === `patient-${patient.id}`}
                      onToggle={() => toggleDropdown(`patient-${patient.id}`)}
                    />

                    <View className="flex-row space-x-3 mt-2">
                      <View className="flex-1">
                        <Text className="text-[#1E3A8A] font-black text-[9px] uppercase tracking-widest mb-1.5">BP</Text>
                        <TextInput 
                          className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#1E3A8A] font-medium text-sm"
                          placeholder="120/80"
                          placeholderTextColor="#94A3B8"
                          value={patient.bp}
                          onChangeText={(val) => updatePatient(patient.id, 'bp', val)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[#1E3A8A] font-black text-[9px] uppercase tracking-widest mb-1.5">HR</Text>
                        <TextInput 
                          className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#1E3A8A] font-medium text-sm"
                          placeholder="bpm"
                          placeholderTextColor="#94A3B8"
                          value={patient.hr}
                          onChangeText={(val) => updatePatient(patient.id, 'hr', val)}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-[#1E3A8A] font-black text-[9px] uppercase tracking-widest mb-1.5">SPO2</Text>
                        <TextInput 
                          className="border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-[#1E3A8A] font-medium text-sm"
                          placeholder="%"
                          placeholderTextColor="#94A3B8"
                          value={patient.spo2}
                          onChangeText={(val) => updatePatient(patient.id, 'spo2', val)}
                        />
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={() => setActivePcrPatientIndex(index)}
                      className="bg-blue-50 border border-blue-200 rounded-xl py-2.5 px-3 flex-row justify-center items-center mt-3"
                    >
                      <Text className="text-[#1E3A8A] font-bold text-xs">Fill Pre-Hospital Care Report (Detailed)</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity 
                  onPress={addPatient}
                  className="bg-[#1E3A8A] rounded-2xl py-4 flex-row justify-center items-center mt-2"
                >
                  <Plus color="white" size={20} />
                  <Text className="text-white font-bold ml-2">Add Patient</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setIsTripTicketOpen(true)}
                  className="bg-amber-50 border border-amber-200 rounded-2xl py-4 flex-row justify-center items-center mt-4 mb-8"
                >
                  <Text className="text-amber-800 font-bold text-base">Fill Driver's Trip Ticket</Text>
                </TouchableOpacity>
              </View>


            </View>
          </ScrollView>

          {/* Sticky Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4 pb-8 flex-row space-x-3">
            <TouchableOpacity 
              onPress={handleSaveDraft}
              className="flex-1 bg-yellow-50 border border-yellow-100 rounded-2xl py-4 flex-row justify-center items-center shadow-sm"
            >
              <FolderDown size={18} color="#92400E" />
              <Text className="text-[#92400E] font-bold ml-2 text-base">Save as Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleSubmit}
              disabled={isSubmittingReport}
              className={`flex-1 rounded-2xl py-4 flex-row justify-center items-center shadow-md ${isSubmittingReport ? 'bg-[#1E3A8A]/80' : 'bg-[#1E3A8A]'}`}
            >
              {isSubmittingReport ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Check size={18} color="white" />
                  <Text className="text-white font-bold ml-2 text-base">Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Overlay */}
        {isSubmittingReport && (
          <View className="absolute inset-0 bg-black/40 items-center justify-center" style={{ zIndex: 100 }}>
             <ActivityIndicator size="large" color="white" />
          </View>
        )}

      </SafeAreaView>
      
      {/* Report Submitted Modal */}
      <ReportSubmittedModal />

      {activePcrPatientIndex !== null && (
        <PatientCareModal
          visible={activePcrPatientIndex !== null}
          onClose={() => setActivePcrPatientIndex(null)}
          patientIndex={activePcrPatientIndex}
          data={patients[activePcrPatientIndex]?.pcrDetails}
          onSave={handleSavePcr}
        />
      )}

      {isTripTicketOpen && (
        <TripTicketModal
          visible={isTripTicketOpen}
          onClose={() => setIsTripTicketOpen(false)}
          data={tripTicketData}
          onSave={setTripTicketData}
        />
      )}
    </Modal>
  );
}

