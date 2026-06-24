import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, Calendar } from 'lucide-react-native';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CalendarModalProps {
  visible: boolean;
  currentVal: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

function CalendarModal({ visible, currentVal, onSelect, onClose }: CalendarModalProps) {
  const initialDate = currentVal ? new Date(currentVal) : new Date();
  const [selectedYear, setSelectedYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getStartDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const startDay = getStartDayOfMonth(selectedYear, selectedMonth);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const gridCells = [];
  for (let i = 0; i < startDay; i++) {
    gridCells.push({ key: `empty-${i}`, dayNum: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({ key: `day-${i}`, dayNum: i });
  }

  const rows = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    rows.push(gridCells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 justify-center items-center p-5">
        <View className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={handlePrevMonth} className="p-2">
              <ChevronLeft size={20} color="#1E3A8A" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-[#1E3A8A]">
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-2">
              <ChevronRight size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w, idx) => (
              <Text key={idx} className="flex-1 text-center text-[10px] font-black text-slate-400 uppercase">
                {w}
              </Text>
            ))}
          </View>

          <View className="mb-4">
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} className="flex-row my-1">
                {row.map((cell) => {
                  if (cell.dayNum === null) {
                    return <View key={cell.key} className="flex-1" />;
                  }

                  const cellDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(cell.dayNum).padStart(2, '0')}`;
                  const isSelected = cellDateStr === currentVal;
                  
                  return (
                    <TouchableOpacity
                      key={cell.key}
                      onPress={() => {
                        onSelect(cellDateStr);
                        onClose();
                      }}
                      className={`flex-1 aspect-square justify-center items-center rounded-full ${isSelected ? 'bg-[#1E3A8A]' : 'bg-transparent'}`}
                    >
                      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {cell.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
              </View>
            ))}
          </View>

          <View className="flex-row justify-between border-t border-slate-100 pt-3">
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onSelect(todayStr);
                onClose();
              }}
              className="py-2 px-3"
            >
              <Text className="text-xs font-bold text-[#1E3A8A]">Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="py-2 px-3"
            >
              <Text className="text-xs font-bold text-slate-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [dispatchInfo, setDispatchInfo] = useState(() => {
    const today = getTodayDateString();
    if (data?.dispatchInfo) {
      return {
        ...data.dispatchInfo,
        date: data.dispatchInfo.date || today
      };
    }
    return {
      hqDprtTime: '', hqArrTime: '', sceneDprtTime: '', sceneArrTime: '', hospitalDprtTime: '', hospitalArrTime: '', date: today, unit: ''
    };
  });

  const [emergencyType, setEmergencyType] = useState(data?.emergencyType || {
    callType: 'Medical', arrivalPerson: 'Bystander'
  });

  const [incidentInfo, setIncidentInfo] = useState(data?.incidentInfo || {
    siteOfIncident: '', chiefComplaints: ''
  });

  const [initialAssessment, setInitialAssessment] = useState(data?.initialAssessment || {
    loc: 'Alert', spinalInjury: 'No',
    circulation: { pulse: 'Present', pulseQuality: 'Strong', bleeding: 'No', bleedingLocation: '', controlled: 'Yes', bleedingControlMethod: 'None' },
    airway: { status: 'Open', intervention: 'None' },
    trachea: 'Normal & Stable',
    breathing: { status: 'No Dyspnea', oxygen: 'O2 not required', lpm: '', delivery: 'NC', breathSounds: 'Clear Breath Sounds' }
  });

  const [vitalsLogs, setVitalsLogs] = useState<any[]>(data?.vitalsLogs || [
    { time: '', bp: '', pr: '', o2_sat: '', rr: '', temp: '', pupil: 'PEARR', skin: 'Warm' }
  ]);

  const [painAssessment, setPainAssessment] = useState(data?.painAssessment || {
    location: '', onset: 'Gradual', provocation: 'None', quality: 'Aching', radiation: 'None', severity: '5', time: ''
  });

  const [gcsPoints, setGcsPoints] = useState(data?.gcsPoints || '');

  const [sampleHistory, setSampleHistory] = useState(data?.sampleHistory || {
    allergies: 'None', medications: 'None', pastMedicalHistory: '', lastOralIntake: '', eventsLeadingToInjury: ''
  });

  const [traumaMarkers, setTraumaMarkers] = useState<string[]>(data?.traumaMarkers || []);
  const [narrativeReport, setNarrativeReport] = useState(data?.narrativeReport || '');

  const [handoffSignatures, setHandoffSignatures] = useState(data?.handoffSignatures || {
    accomplishedBy: '', accomplishedByLicense: '', receivingHospital: '', referredTo: '', referredToLicense: '', receivingPhysician: '', receivingPhysicianLicense: '', licenseNo: '', arrivalTime: ''
  });

  const [liabilityRelease, setLiabilityRelease] = useState(data?.liabilityRelease || {
    refused: false, refusalType: 'Refusal to consent to treatment', signature: '', witnessedBy: '', witnessAddress: ''
  });

  const [respondingTeam, setRespondingTeam] = useState(data?.respondingTeam || {
    teamLeader: '', teamMembers: '', driver: ''
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
      painAssessment,
      gcsPoints: gcsPoints ? parseInt(gcsPoints) : null,
      sampleHistory,
      traumaMarkers,
      narrativeReport,
      handoffSignatures,
      liabilityRelease,
      respondingTeam
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
                <TextInput 
                  value={patientAge} 
                  onChangeText={(val) => setPatientAge(val.replace(/[^0-9]/g, ''))} 
                  keyboardType="numeric" 
                  placeholder="25" 
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" 
                />
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
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Dispatch Information</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Date</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 flex-row items-center justify-between min-h-[38px]"
                >
                  <Text className="text-slate-800 font-medium text-xs">
                    {dispatchInfo.date || 'Select Date'}
                  </Text>
                  <Calendar size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Responding Unit</Text>
                <TextInput value={dispatchInfo.unit} onChangeText={(val) => setDispatchInfo({...dispatchInfo, unit: val})} placeholder="AMB-001" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
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
                <TextInput value={initialAssessment.loc} onChangeText={(val) => setInitialAssessment({...initialAssessment, loc: val})} placeholder="Alert" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Spinal Injury</Text>
                <TextInput value={initialAssessment.spinalInjury} onChangeText={(val) => setInitialAssessment({...initialAssessment, spinalInjury: val})} placeholder="No" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">GCS Points</Text>
                <TextInput 
                  value={gcsPoints} 
                  onChangeText={(val) => setGcsPoints(val.replace(/[^0-9]/g, ''))} 
                  keyboardType="numeric" 
                  placeholder="15" 
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
            </View>

            <View className="border-t border-slate-100 pt-3">
              <Text className="text-[#1E3A8A] font-bold text-[10px] tracking-wider uppercase mb-2">Circulation & Bleeding</Text>
              <View className="flex-row space-x-2 mb-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Pulse</Text>
                  <TextInput value={initialAssessment.circulation.pulse} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, pulse: val}})} placeholder="Present" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Pulse Quality</Text>
                  <TextInput value={initialAssessment.circulation.pulseQuality} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, pulseQuality: val}})} placeholder="Strong" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-2 mb-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bleeding</Text>
                  <TextInput value={initialAssessment.circulation.bleeding} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, bleeding: val}})} placeholder="No" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bleeding Location</Text>
                  <TextInput value={initialAssessment.circulation.bleedingLocation} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, bleedingLocation: val}})} placeholder="N/A" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Controlled?</Text>
                  <TextInput value={initialAssessment.circulation.controlled} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, controlled: val}})} placeholder="Yes" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Control Method</Text>
                  <TextInput value={initialAssessment.circulation.bleedingControlMethod} onChangeText={(val) => setInitialAssessment({...initialAssessment, circulation: {...initialAssessment.circulation, bleedingControlMethod: val}})} placeholder="Direct Pressure" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
            </View>

            <View className="border-t border-slate-100 pt-3">
              <Text className="text-[#1E3A8A] font-bold text-[10px] tracking-wider uppercase mb-2">Airway & Trachea</Text>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Airway Status</Text>
                  <TextInput value={initialAssessment.airway.status} onChangeText={(val) => setInitialAssessment({...initialAssessment, airway: {...initialAssessment.airway, status: val}})} placeholder="Open" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Airway Interv.</Text>
                  <TextInput value={initialAssessment.airway.intervention} onChangeText={(val) => setInitialAssessment({...initialAssessment, airway: {...initialAssessment.airway, intervention: val}})} placeholder="None" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Trachea Status</Text>
                  <TextInput value={initialAssessment.trachea} onChangeText={(val) => setInitialAssessment({...initialAssessment, trachea: val})} placeholder="Normal" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
            </View>

            <View className="border-t border-slate-100 pt-3">
              <Text className="text-[#1E3A8A] font-bold text-[10px] tracking-wider uppercase mb-2">Breathing & Oxygen</Text>
              <View className="flex-row space-x-2 mb-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Breathing Type</Text>
                  <TextInput value={initialAssessment.breathing.status} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, status: val}})} placeholder="No Dyspnea" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Breath Sounds</Text>
                  <TextInput value={initialAssessment.breathing.breathSounds} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, breathSounds: val}})} placeholder="Clear" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Oxygen Support</Text>
                  <TextInput value={initialAssessment.breathing.oxygen} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, oxygen: val}})} placeholder="Not Req" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Flow Rate (LPM)</Text>
                  <TextInput value={initialAssessment.breathing.lpm} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, lpm: val}})} placeholder="0" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Delivery Device</Text>
                  <TextInput value={initialAssessment.breathing.delivery} onChangeText={(val) => setInitialAssessment({...initialAssessment, breathing: {...initialAssessment.breathing, delivery: val}})} placeholder="NC" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
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
                  <TextInput 
                    value={log.pr} 
                    onChangeText={(val) => updateVitalLog(idx, 'pr', val.replace(/[^0-9]/g, ''))} 
                    keyboardType="numeric"
                    placeholder="80" 
                    className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                  />
                </View>
              </View>
              <View className="flex-row space-x-2">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">O2 Sat (%)</Text>
                  <TextInput 
                    value={log.o2_sat} 
                    onChangeText={(val) => updateVitalLog(idx, 'o2_sat', val.replace(/[^0-9]/g, ''))} 
                    keyboardType="numeric"
                    placeholder="98" 
                    className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">RR (cpm)</Text>
                  <TextInput 
                    value={log.rr} 
                    onChangeText={(val) => updateVitalLog(idx, 'rr', val.replace(/[^0-9]/g, ''))} 
                    keyboardType="numeric"
                    placeholder="16" 
                    className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-400 text-[8px] font-bold uppercase mb-0.5">Temp (°C)</Text>
                  <TextInput 
                    value={log.temp} 
                    onChangeText={(val) => {
                      let cleaned = val.replace(/[^0-9.]/g, '');
                      const parts = cleaned.split('.');
                      if (parts.length > 2) {
                        cleaned = parts[0] + '.' + parts.slice(1).join('');
                      }
                      updateVitalLog(idx, 'temp', cleaned);
                    }} 
                    keyboardType="numeric"
                    placeholder="36.5" 
                    className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                  />
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

          {/* Pain Assessment */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Pain Assessment</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-2">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Pain Location</Text>
                <TextInput value={painAssessment.location} onChangeText={(val) => setPainAssessment({...painAssessment, location: val})} placeholder="Chest, Left Arm" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Assessment Time</Text>
                <TextInput value={painAssessment.time} onChangeText={(val) => setPainAssessment({...painAssessment, time: val})} placeholder="10:12 AM" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-2">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Onset</Text>
                <TextInput value={painAssessment.onset} onChangeText={(val) => setPainAssessment({...painAssessment, onset: val})} placeholder="Sudden / Gradual" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Provocation</Text>
                <TextInput value={painAssessment.provocation} onChangeText={(val) => setPainAssessment({...painAssessment, provocation: val})} placeholder="Movement / None" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-2">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Quality</Text>
                <TextInput value={painAssessment.quality} onChangeText={(val) => setPainAssessment({...painAssessment, quality: val})} placeholder="Aching / Stabbing" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Radiation</Text>
                <TextInput value={painAssessment.radiation} onChangeText={(val) => setPainAssessment({...painAssessment, radiation: val})} placeholder="None / Localized" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="w-16">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Sev (1-10)</Text>
                <TextInput 
                  value={painAssessment.severity} 
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    setPainAssessment({...painAssessment, severity: cleaned});
                  }} 
                  keyboardType="numeric" 
                  placeholder="5" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs text-center" 
                />
              </View>
            </View>
          </View>

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
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">PCR Accomplished By</Text>
                <TextInput value={handoffSignatures.accomplishedBy} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, accomplishedBy: val})} placeholder="Responder Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Acc. License No</Text>
                <TextInput value={handoffSignatures.accomplishedByLicense} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, accomplishedByLicense: val})} placeholder="Lic-12345" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Receiving Hospital</Text>
                <TextInput value={handoffSignatures.receivingHospital} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, receivingHospital: val})} placeholder="Baliwag District Hospital" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Arrival Time</Text>
                <TextInput value={handoffSignatures.arrivalTime} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, arrivalTime: val})} placeholder="10:30 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Receiving Physician</Text>
                <TextInput value={handoffSignatures.receivingPhysician} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, receivingPhysician: val})} placeholder="Dr. Jane Smith" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Phys. License No</Text>
                <TextInput value={handoffSignatures.receivingPhysicianLicense} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, receivingPhysicianLicense: val})} placeholder="Lic-67890" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Referred To</Text>
                <TextInput value={handoffSignatures.referredTo} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, referredTo: val})} placeholder="Hospital Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Ref. License No</Text>
                <TextInput value={handoffSignatures.referredToLicense} onChangeText={(val) => setHandoffSignatures({...handoffSignatures, referredToLicense: val})} placeholder="Lic-54321" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
          </View>

          {/* Responding Team */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Responding Team</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Team Leader</Text>
              <TextInput value={respondingTeam.teamLeader} onChangeText={(val) => setRespondingTeam({...respondingTeam, teamLeader: val})} placeholder="Team Leader Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Team Members</Text>
              <TextInput value={respondingTeam.teamMembers} onChangeText={(val) => setRespondingTeam({...respondingTeam, teamMembers: val})} placeholder="Member 1, Member 2" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Ambulance Driver</Text>
              <TextInput value={respondingTeam.driver} onChangeText={(val) => setRespondingTeam({...respondingTeam, driver: val})} placeholder="Driver Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>
        </ScrollView>
        <CalendarModal 
          visible={showDatePicker}
          currentVal={dispatchInfo.date}
          onSelect={(dateStr) => setDispatchInfo({...dispatchInfo, date: dateStr})}
          onClose={() => setShowDatePicker(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}
