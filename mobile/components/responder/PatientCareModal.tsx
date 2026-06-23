import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Trash2, Check } from 'lucide-react-native';

interface PatientCareModalProps {
  visible: boolean;
  onClose: () => void;
  patientIndex: number;
  data: any;
  onSave: (pcrData: any) => void;
}

export function PatientCareModal({ visible, onClose, patientIndex, data, onSave }: PatientCareModalProps) {
  const [patientName, setPatientName] = useState(data?.patientName || '');
  const [patientAddress, setPatientAddress] = useState(data?.patientAddress || '');
  const [patientContact, setPatientContact] = useState(data?.patientContact || '');
  const [patientAge, setPatientAge] = useState(data?.patientAge ? String(data.patientAge) : '');
  const [patientGender, setPatientGender] = useState(data?.patientGender || 'Male');

  const [dispatchInfo, setDispatchInfo] = useState(data?.dispatchInfo || {
    hqDprtTime: '', hqArrTime: '', sceneDprtTime: '', sceneArrTime: '', hospitalDprtTime: '', hospitalArrTime: ''
  });

  const [emergencyType, setEmergencyType] = useState(data?.emergencyType || {
    callType: 'Medical', arrivalPerson: 'Bystander'
  });

  const [incidentInfo, setIncidentInfo] = useState(data?.incidentInfo || {
    siteOfIncident: '', chiefComplaints: ''
  });

  const [initialAssessment, setInitialAssessment] = useState(data?.initialAssessment || {
    loc: 'Alert', spinalInjury: 'No',
    circulation: { pulse: 'Present', bleeding: 'No', bleedingLocation: '', controlled: 'Yes' },
    airway: { status: 'Open', intervention: 'None' },
    trachea: 'Normal & Stable',
    breathing: { status: 'No Dyspnea', oxygen: 'O2 not required', lpm: '', delivery: 'NC', breathSounds: 'Clear Breath Sounds' }
  });

  const [vitalsLogs, setVitalsLogs] = useState<any[]>(data?.vitalsLogs || [
    { time: '', bp: '', pr: '', o2_sat: '', rr: '', temp: '', pupil: 'PEARR', skin: 'Warm' }
  ]);

  const [sampleHistory, setSampleHistory] = useState(data?.sampleHistory || {
    allergies: 'None', medications: 'None', pastMedicalHistory: '', lastOralIntake: '', eventsLeadingToInjury: ''
  });

  const [traumaMarkers, setTraumaMarkers] = useState<string[]>(data?.traumaMarkers || []);
  const [narrativeReport, setNarrativeReport] = useState(data?.narrativeReport || '');

  const [handoffSignatures, setHandoffSignatures] = useState(data?.handoffSignatures || {
    accomplishedBy: '', receivingHospital: '', referredTo: '', receivingPhysician: '', licenseNo: '', arrivalTime: ''
  });

  const [liabilityRelease, setLiabilityRelease] = useState(data?.liabilityRelease || {
    refused: false, refusalType: 'Refusal to consent to treatment', signature: '', witnessedBy: '', witnessAddress: ''
  });

  const handleSave = () => {
    onSave({
      patientName,
      patientAddress,
      patientContact,
      patientAge: patientAge ? parseInt(patientAge) : null,
      patientGender,
      dispatchInfo,
      emergencyType,
      incidentInfo,
      initialAssessment,
      vitalsLogs,
      sampleHistory,
      traumaMarkers,
      narrativeReport,
      handoffSignatures,
      liabilityRelease
    });
    onClose();
  };

  const addVitalLog = () => {
    if (vitalsLogs.length < 4) {
      setVitalsLogs([...vitalsLogs, { time: '', bp: '', pr: '', o2_sat: '', rr: '', temp: '', pupil: 'PEARR', skin: 'Warm' }]);
    }
  };

  const removeVitalLog = (index: number) => {
    if (vitalsLogs.length > 1) {
      setVitalsLogs(vitalsLogs.filter((_, i) => i !== index));
    }
  };

  const updateVitalLog = (index: number, field: string, value: string) => {
    const updated = [...vitalsLogs];
    updated[index] = { ...updated[index], [field]: value };
    setVitalsLogs(updated);
  };

  const toggleTraumaMarker = (area: string) => {
    if (traumaMarkers.includes(area)) {
      setTraumaMarkers(traumaMarkers.filter(t => t !== area));
    } else {
      setTraumaMarkers([...traumaMarkers, area]);
    }
  };

  const TRAUMA_AREAS = ['Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Back', 'L-Arm', 'R-Arm', 'L-Leg', 'R-Leg'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
      <SafeAreaView className="flex-1 bg-[#16203A]">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between border-b border-blue-800/50">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-base font-bold">Patient {patientIndex + 1} Care Report</Text>
          <TouchableOpacity onPress={handleSave} className="bg-emerald-600 px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-xs">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Patient Profile */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Patient Profile</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Full Name</Text>
              <TextInput value={patientName} onChangeText={setPatientName} placeholder="John Doe" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Age</Text>
                <TextInput value={patientAge} onChangeText={setPatientAge} keyboardType="numeric" placeholder="25" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Gender</Text>
                <View className="flex-row space-x-2">
                  {['Male', 'Female'].map(g => (
                    <TouchableOpacity key={g} onPress={() => setPatientGender(g)} className={`flex-1 py-2 border rounded-xl items-center ${patientGender === g ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                      <Text className={`font-bold text-xs ${patientGender === g ? 'text-[#1E3A8A]' : 'text-slate-500'}`}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Address</Text>
              <TextInput value={patientAddress} onChangeText={setPatientAddress} placeholder="Brgy. Sabang, Baliwag City" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Contact Number</Text>
              <TextInput value={patientContact} onChangeText={setPatientContact} placeholder="09123456789" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>

          {/* Dispatch Info */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Dispatch Information (Times)</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">HQ Depart</Text>
                <TextInput value={dispatchInfo.hqDprtTime} onChangeText={(val) => setDispatchInfo({...dispatchInfo, hqDprtTime: val})} placeholder="10:00 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Scene Arrival</Text>
                <TextInput value={dispatchInfo.sceneArrTime} onChangeText={(val) => setDispatchInfo({...dispatchInfo, sceneArrTime: val})} placeholder="10:05 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Scene Depart</Text>
                <TextInput value={dispatchInfo.sceneDprtTime} onChangeText={(val) => setDispatchInfo({...dispatchInfo, sceneDprtTime: val})} placeholder="10:15 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Hospital Arrival</Text>
                <TextInput value={dispatchInfo.hospitalArrTime} onChangeText={(val) => setDispatchInfo({...dispatchInfo, hospitalArrTime: val})} placeholder="10:25 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
          </View>

          {/* Emergency & Incident Call Info */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Call & Incident Info</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Emergency Call Type</Text>
              <View className="flex-row space-x-2">
                {['Medical', 'Trauma', 'Transfer'].map(t => (
                  <TouchableOpacity key={t} onPress={() => setEmergencyType({...emergencyType, callType: t})} className={`flex-1 py-2 border rounded-xl items-center ${emergencyType.callType === t ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                    <Text className={`font-bold text-xs ${emergencyType.callType === t ? 'text-[#1E3A8A]' : 'text-slate-500'}`}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Person Available Upon Arrival</Text>
              <TextInput value={emergencyType.arrivalPerson} onChangeText={(val) => setEmergencyType({...emergencyType, arrivalPerson: val})} placeholder="Bystander / Brgy / Police" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Chief Complaint</Text>
              <TextInput value={incidentInfo.chiefComplaints} onChangeText={(val) => setIncidentInfo({...incidentInfo, chiefComplaints: val})} placeholder="Chest pain, difficulty breathing" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>

          {/* Initial Assessment */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Initial Assessment</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">LOC</Text>
                <TextInput value={initialAssessment.loc} onChangeText={(val) => setInitialAssessment({...initialAssessment, loc: val})} placeholder="Alert / Verbal / Pain" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Spinal Injury</Text>
                <TextInput value={initialAssessment.spinalInjury} onChangeText={(val) => setInitialAssessment({...initialAssessment, spinalInjury: val})} placeholder="Yes / No" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="border-t border-slate-100 pt-3">
              <Text className="text-[#1E3A8A] font-bold text-[10px] tracking-wider uppercase mb-2">Circulation</Text>
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Pulse</Text>
                  <TextInput value={initialAssessment.circulation.pulse} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, pulse: val}})} placeholder="Present" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bleeding</Text>
                  <TextInput value={initialAssessment.circulation.bleeding} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, bleeding: val}})} placeholder="No" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
            </View>
            <View className="border-t border-slate-100 pt-3">
              <Text className="text-[#1E3A8A] font-bold text-[10px] tracking-wider uppercase mb-2">Airway & Breathing</Text>
              <View className="flex-row space-x-3 mb-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Airway Status</Text>
                  <TextInput value={initialAssessment.airway.status} onChangeText={(val) => setInitialAssessment({...initialAssessment, airway: {...initialAssessment.airway, status: val}})} placeholder="Open" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Breathing Status</Text>
                  <TextInput value={initialAssessment.breathing.status} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, status: val}})} placeholder="No Dyspnea" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">O2 Delivery</Text>
                  <TextInput value={initialAssessment.breathing.oxygen} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, oxygen: val}})} placeholder="NC / NRM / Not Req" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Flow Rate (LPM)</Text>
                  <TextInput value={initialAssessment.breathing.lpm} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, lpm: val}})} placeholder="6 LPM" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
            </View>
          </View>

          {/* Vital Signs (Up to 4) */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase">Vital Signs Log (Max 4)</Text>
            {vitalsLogs.length < 4 && (
              <TouchableOpacity onPress={addVitalLog} className="bg-[#1E3A8A] px-3 py-1.5 rounded-lg flex-row items-center">
                <Plus color="white" size={12} />
                <Text className="text-white text-[10px] font-bold ml-1">Add Vital Log</Text>
              </TouchableOpacity>
            )}
          </View>
          {vitalsLogs.map((log, idx) => (
            <View key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-4 space-y-3">
              <View className="flex-row justify-between items-center border-b border-slate-50 pb-2">
                <Text className="text-[#1E3A8A] font-bold text-xs">Log #{idx + 1}</Text>
                {vitalsLogs.length > 1 && (
                  <TouchableOpacity onPress={() => removeVitalLog(idx)}>
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">Time</Text>
                  <TextInput value={log.time} onChangeText={(val) => updateVitalLog(idx, 'time', val)} placeholder="10:10" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">BP</Text>
                  <TextInput value={log.bp} onChangeText={(val) => updateVitalLog(idx, 'bp', val)} placeholder="120/80" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">PR (bpm)</Text>
                  <TextInput value={log.pr} onChangeText={(val) => updateVitalLog(idx, 'pr', val)} placeholder="80" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">O2 Sat (%)</Text>
                  <TextInput value={log.o2_sat} onChangeText={(val) => updateVitalLog(idx, 'o2_sat', val)} placeholder="98" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">RR (cpm)</Text>
                  <TextInput value={log.rr} onChangeText={(val) => updateVitalLog(idx, 'rr', val)} placeholder="16" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">Temp (°C)</Text>
                  <TextInput value={log.temp} onChangeText={(val) => updateVitalLog(idx, 'temp', val)} placeholder="36.5" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">Pupil</Text>
                  <TextInput value={log.pupil} onChangeText={(val) => updateVitalLog(idx, 'pupil', val)} placeholder="PEARR" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">Skin</Text>
                  <TextInput value={log.skin} onChangeText={(val) => updateVitalLog(idx, 'skin', val)} placeholder="Warm / Dry / Pale" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
            </View>
          ))}

          {/* SAMPLE History */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">SAMPLE History</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Allergies</Text>
              <TextInput value={sampleHistory.allergies} onChangeText={(val) => setSampleHistory({...sampleHistory, allergies: val})} placeholder="None / Food / Drug" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Medications</Text>
              <TextInput value={sampleHistory.medications} onChangeText={(val) => setSampleHistory({...sampleHistory, medications: val})} placeholder="None / Maintenance meds" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Past Medical History</Text>
              <TextInput value={sampleHistory.pastMedicalHistory} onChangeText={(val) => setSampleHistory({...sampleHistory, pastMedicalHistory: val})} placeholder="Hypertension, Asthma" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Last Oral Intake</Text>
              <TextInput value={sampleHistory.lastOralIntake} onChangeText={(val) => setSampleHistory({...sampleHistory, lastOralIntake: val})} placeholder="Water at 8:00 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Events Leading to Injury</Text>
              <TextInput value={sampleHistory.eventsLeadingToInjury} onChangeText={(val) => setSampleHistory({...sampleHistory, eventsLeadingToInjury: val})} placeholder="Slipped on wet floor" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>

          {/* Trauma Injury Markers */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Trauma Injury Areas</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
            <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-3">Select injured body parts:</Text>
            <View className="flex-row flex-wrap gap-2">
              {TRAUMA_AREAS.map(area => {
                const selected = traumaMarkers.includes(area);
                return (
                  <TouchableOpacity key={area} onPress={() => toggleTraumaMarker(area)} className={`px-4 py-2 border rounded-full ${selected ? 'bg-red-50 border-red-500' : 'bg-slate-50 border-slate-200'}`}>
                    <Text className={`font-bold text-xs ${selected ? 'text-red-700' : 'text-slate-500'}`}>{area}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Narrative Report */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Narrative Report</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6">
            <TextInput multiline numberOfLines={5} value={narrativeReport} onChangeText={setNarrativeReport} placeholder="Describe the scene response, treatments administered, patient status progression, and transport events in detail..." className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium min-h-[120px]" textAlignVertical="top" />
          </View>

          {/* Release of Liability */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Release of Liability</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-700 text-xs font-bold">Refusal of Treatment/Transport?</Text>
              <Switch value={liabilityRelease.refused} onValueChange={(val) => setLiabilityRelease({...liabilityRelease, refused: val})} />
            </View>
            {liabilityRelease.refused && (
              <View className="space-y-3">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase">Witness Name</Text>
                <TextInput value={liabilityRelease.witnessedBy} onChangeText={(val) => setLiabilityRelease({...liabilityRelease, witnessedBy: val})} placeholder="Witness Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase">Witness Address</Text>
                <TextInput value={liabilityRelease.witnessAddress} onChangeText={(val) => setLiabilityRelease({...liabilityRelease, witnessAddress: val})} placeholder="Witness Address" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
              </View>
            )}
          </View>

          {/* Signatures & Handoff */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Signatures & Handoff</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">PCR Accomplished By</Text>
              <TextInput value={handoffSignatures.accomplishedBy} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, accomplishedBy: val})} placeholder="Responder Name / License" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Receiving Hospital</Text>
              <TextInput value={handoffSignatures.receivingHospital} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, receivingHospital: val})} placeholder="Baliwag District Hospital" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Receiving Physician</Text>
              <TextInput value={handoffSignatures.receivingPhysician} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, receivingPhysician: val})} placeholder="Dr. Jane Smith" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
